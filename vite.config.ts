import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { getWorksheetPrompt } from './prompts'
import { RequestError, validateWorksheetRequest } from './server/worksheetRequest'
import { createFallbackWorksheetContent } from './shared/fallbackWorksheet'

dotenv.config({ path: '.env.local' })

type WorksheetContent = {
  questions: string[]
  answers: string[]
}

const maxRequestBodyBytes = 16 * 1024


function getCompactArithmeticQuestionAndAnswer(group: string, exercise: string, questionIndex: number) {
  const groupNumber = Number(group) || 4
  const seed = questionIndex + 1
  const smallA = ((seed * 7) % 9) + 1
  const smallB = ((seed * 5) % 9) + 1
  const mediumA = ((seed * 17) % 89) + 10
  const mediumB = ((seed * 13) % 89) + 10
  const largeA = ((seed * 197) % 8_900) + 1_000
  const largeB = ((seed * 131) % 8_900) + 1_000

  if (exercise === 'aftrekken' || exercise === 'aftrekken-grote-getallen') {
    const left = exercise === 'aftrekken-grote-getallen' ? Math.max(largeA, largeB) : Math.max(mediumA, mediumB)
    const right = exercise === 'aftrekken-grote-getallen' ? Math.min(largeA, largeB) : Math.min(mediumA, mediumB)

    return {
      question: `${questionIndex + 1}. ${left} - ${right} = ...`,
      answer: `${questionIndex + 1}. ${left - right}`,
    }
  }

  if (exercise === 'tafels' || exercise === 'vermenigvuldigen') {
    const left = groupNumber <= 4 ? smallA : ((seed * 11) % 12) + 1
    const right = groupNumber <= 4 ? smallB : ((seed * 3) % 12) + 1

    return {
      question: `${questionIndex + 1}. ${left} x ${right} = ...`,
      answer: `${questionIndex + 1}. ${left * right}`,
    }
  }

  if (exercise === 'delen') {
    const divisor = smallA
    const answer = groupNumber <= 5 ? smallB : ((seed * 11) % 12) + 1

    return {
      question: `${questionIndex + 1}. ${divisor * answer} : ${divisor} = ...`,
      answer: `${questionIndex + 1}. ${answer}`,
    }
  }

  if (exercise === 'tafel-automatiseren') {
    return seed % 3 === 0
      ? {
          question: `${questionIndex + 1}. ${smallA * smallB} : ${smallA} = ...`,
          answer: `${questionIndex + 1}. ${smallB}`,
        }
      : {
          question: `${questionIndex + 1}. ${smallA} x ${smallB} = ...`,
          answer: `${questionIndex + 1}. ${smallA * smallB}`,
        }
  }

  if (exercise === 'splitsen') {
    const total = groupNumber <= 3 ? ((seed * 7) % 20) + 1 : ((seed * 7) % 100) + 1
    const part = seed % total

    return {
      question: `${questionIndex + 1}. ${part} + ... = ${total}`,
      answer: `${questionIndex + 1}. ${total - part}`,
    }
  }

  const left = exercise === 'optellen-grote-getallen' ? largeA : mediumA
  const right = exercise === 'optellen-grote-getallen' ? largeB : mediumB

  return {
    question: `${questionIndex + 1}. ${left} + ${right} = ...`,
    answer: `${questionIndex + 1}. ${left + right}`,
  }
}

function fallbackCompactArithmeticContent(group: string, exercise: string, amount: number, startIndex = 0): WorksheetContent {
  const items = Array.from({ length: amount }, (_, index) => (
    getCompactArithmeticQuestionAndAnswer(group, exercise, startIndex + index)
  ))

  return {
    questions: items.map((item) => item.question),
    answers: items.map((item) => item.answer),
  }
}

function padContent(
  questions: string[],
  answers: string[],
  group: string,
  exercise: string,
  amount: number,
  layout: 'default' | 'compact-arithmetic',
): WorksheetContent {
  const paddedQuestions = questions.slice(0, amount)
  const paddedAnswers = answers.slice(0, amount)

  if (paddedQuestions.length >= amount && paddedAnswers.length >= amount) {
    return {
      questions: paddedQuestions,
      answers: paddedAnswers,
    }
  }

  const missingAmount = amount - Math.min(paddedQuestions.length, paddedAnswers.length)
  const fallback = layout === 'compact-arithmetic'
    ? fallbackCompactArithmeticContent(group, exercise, missingAmount, Math.min(paddedQuestions.length, paddedAnswers.length))
    : createFallbackWorksheetContent(group, exercise, missingAmount, Math.min(paddedQuestions.length, paddedAnswers.length))

  return {
    questions: [...paddedQuestions, ...fallback.questions].slice(0, amount),
    answers: [...paddedAnswers, ...fallback.answers].slice(0, amount),
  }
}

function sendJson(res: import('node:http').ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readJsonBody(req: import('node:http').IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    let body = ''
    let bodySize = 0
    let rejected = false

    req.on('data', (chunk: Buffer) => {
      if (rejected) return

      bodySize += chunk.length
      if (bodySize > maxRequestBodyBytes) {
        rejected = true
        reject(new RequestError('Het verzoek is te groot.', 413))
        return
      }

      body += chunk.toString()
    })

    req.on('end', () => {
      if (rejected) return

      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new RequestError('Het verzoek bevat geen geldige JSON.'))
      }
    })

    req.on('error', reject)
  })
}

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'worksheet-api',
      configureServer(server) {
        server.middlewares.use('/api/worksheet', async (req, res) => {
          if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST')
            sendJson(res, 405, { error: 'Alleen POST-verzoeken zijn toegestaan.' })
            return
          }

          try {
            if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
              throw new RequestError('Gebruik application/json als Content-Type.', 415)
            }

            const {
              group,
              exercise,
              amount,
              layout,
              theme,
              difficulty,
            } = validateWorksheetRequest(await readJsonBody(req))

            if (!process.env.OPENAI_API_KEY) {
              const fallbackContent = layout === 'compact-arithmetic'
                ? fallbackCompactArithmeticContent(group, exercise, amount)
                : createFallbackWorksheetContent(group, exercise, amount)

              sendJson(res, 200, {
                questions: fallbackContent.questions,
                answers: fallbackContent.answers,
                source: 'fallback',
              })
              return
            }

            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            const prompt = getWorksheetPrompt(group, exercise, amount, theme, difficulty)
            const response = await openai.responses.create({
              model: process.env.OPENAI_MODEL || 'gpt-5.5',
              input: [
                {
                  role: 'system',
                  content:
                    'Je maakt Nederlandse basisschool-werkbladen. Antwoord alleen met geldige JSON.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
            })

            const parsed = JSON.parse(response.output_text) as { questions?: string[], answers?: string[] }
            const generatedQuestions =
              parsed.questions?.slice(0, amount).map((question, index) => {
                const cleanQuestion = question.replace(/^\d+\.\s*/, '').trim()

                return `${index + 1}. ${cleanQuestion}`
              }) ?? []
            const generatedAnswers =
              parsed.answers?.slice(0, amount).map((answer, index) => {
                const cleanAnswer = answer.replace(/^\d+\.\s*/, '').trim()

                return `${index + 1}. ${cleanAnswer}`
              }) ?? []
            const { questions, answers } = padContent(generatedQuestions, generatedAnswers, group, exercise, amount, layout)

            sendJson(res, 200, { questions, answers, source: 'openai' })
          } catch (error) {
            if (error instanceof RequestError) {
              sendJson(res, error.statusCode, { error: error.message })
              return
            }

            const loggedError = error instanceof Error ? error : new Error('Onbekende fout bij werkbladgeneratie.')

            server.config.logger.error('Werkblad genereren mislukt.', { error: loggedError })
            sendJson(res, 500, { error: 'Het werkblad kon niet worden gegenereerd. Probeer het later opnieuw.' })
          }
        })
      },
    },
  ],
})
