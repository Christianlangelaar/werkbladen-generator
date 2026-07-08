import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { getWorksheetPrompt } from './prompts'

dotenv.config({ path: '.env.local' })

type WorksheetRequest = {
  group?: string
  exercise?: string
  amount?: number
  layout?: 'default' | 'compact-arithmetic'
}

const compactArithmeticQuestionsPerPage = 100
const maxCompactArithmeticPages = 5
const readingQuestionsPerPage = 7
const summaryQuestionsPerPage = 4
const storyQuestionsPerPage = 10
const standardQuestionsPerPage = 18
const maxDefaultWorksheetPages = 5
const readingExercises = new Set([
  'begrijpend-lezen',
])
const summaryExercises = new Set([
  'samenvatten',
])
const storyExercises = new Set([
  'contextsommen',
  'eindtoets-rekenen',
])

function getDefaultQuestionsPerPage(exercise: string) {
  if (readingExercises.has(exercise)) {
    return readingQuestionsPerPage
  }

  if (summaryExercises.has(exercise)) {
    return summaryQuestionsPerPage
  }

  if (storyExercises.has(exercise)) {
    return storyQuestionsPerPage
  }

  return standardQuestionsPerPage
}

function fallbackQuestions(amount: number, startIndex = 0) {
  return Array.from({ length: amount }, (_, index) => `${startIndex + index + 1}. __________________________________________`)
}

function fallbackCompactArithmeticQuestions(group: string, exercise: string, amount: number, startIndex = 0) {
  const groupNumber = Number(group) || 4

  return Array.from({ length: amount }, (_, index) => {
    const questionIndex = startIndex + index
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

      return `${questionIndex + 1}. ${left} - ${right} = ...`
    }

    if (exercise === 'tafels' || exercise === 'vermenigvuldigen') {
      const left = groupNumber <= 4 ? smallA : ((seed * 11) % 12) + 1
      const right = groupNumber <= 4 ? smallB : ((seed * 3) % 12) + 1

      return `${questionIndex + 1}. ${left} x ${right} = ...`
    }

    if (exercise === 'delen') {
      const divisor = smallA
      const answer = groupNumber <= 5 ? smallB : ((seed * 11) % 12) + 1

      return `${questionIndex + 1}. ${divisor * answer} : ${divisor} = ...`
    }

    if (exercise === 'tafel-automatiseren') {
      return seed % 3 === 0
        ? `${questionIndex + 1}. ${smallA * smallB} : ${smallA} = ...`
        : `${questionIndex + 1}. ${smallA} x ${smallB} = ...`
    }

    if (exercise === 'splitsen') {
      const total = groupNumber <= 3 ? ((seed * 7) % 20) + 1 : ((seed * 7) % 100) + 1
      const part = seed % total

      return `${questionIndex + 1}. ${part} + ... = ${total}`
    }

    const left = exercise === 'optellen-grote-getallen' ? largeA : mediumA
    const right = exercise === 'optellen-grote-getallen' ? largeB : mediumB

    return `${questionIndex + 1}. ${left} + ${right} = ...`
  })
}

function padQuestions(
  questions: string[],
  group: string,
  exercise: string,
  amount: number,
  layout: WorksheetRequest['layout'],
) {
  if (questions.length >= amount) {
    return questions.slice(0, amount)
  }

  const missingAmount = amount - questions.length
  const fallback = layout === 'compact-arithmetic'
    ? fallbackCompactArithmeticQuestions(group, exercise, missingAmount, questions.length)
    : fallbackQuestions(missingAmount, questions.length)

  return [...questions, ...fallback]
}

function sendJson(res: import('node:http').ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readJsonBody(req: import('node:http').IncomingMessage) {
  return new Promise<WorksheetRequest>((resolve, reject) => {
    let body = ''

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
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
            sendJson(res, 405, { error: 'Method not allowed' })
            return
          }

          try {
            const { group = '4', exercise = 'contextsommen', amount = 10, layout = 'default' } = await readJsonBody(req)
            const requestedAmount = Number(amount) || 10
            const maxAmount = layout === 'compact-arithmetic'
              ? compactArithmeticQuestionsPerPage * maxCompactArithmeticPages
              : getDefaultQuestionsPerPage(exercise) * maxDefaultWorksheetPages

            if (requestedAmount > maxAmount) {
              sendJson(res, 400, { error: `Je kunt maximaal ${maxAmount} opdrachten genereren.` })
              return
            }

            const safeAmount = Math.min(Math.max(requestedAmount, 1), maxAmount)

            if (!process.env.OPENAI_API_KEY) {
              sendJson(res, 200, {
                questions: layout === 'compact-arithmetic'
                  ? fallbackCompactArithmeticQuestions(group, exercise, safeAmount)
                  : fallbackQuestions(safeAmount),
                source: 'fallback',
              })
              return
            }

            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            const prompt = getWorksheetPrompt(group, exercise, safeAmount)
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

            const parsed = JSON.parse(response.output_text) as { questions?: string[] }
            const generatedQuestions =
              parsed.questions?.slice(0, safeAmount).map((question, index) => {
                const cleanQuestion = question.replace(/^\d+\.\s*/, '').trim()

                return `${index + 1}. ${cleanQuestion}`
              }) ?? []
            const questions = padQuestions(generatedQuestions, group, exercise, safeAmount, layout)

            sendJson(res, 200, { questions, source: 'openai' })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Kon werkblad niet genereren.'

            sendJson(res, 500, { error: message })
          }
        })
      },
    },
  ],
})
