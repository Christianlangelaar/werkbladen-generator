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
  theme?: string
  difficulty?: string
}

type WorksheetContent = {
  questions: string[]
  answers: string[]
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
const themeSupportedExercises = new Set([
  'begrijpend-lezen',
  'contextsommen',
  'eindtoets-rekenen',
  'engels-woordenschat',
  'grammatica',
  'leestekens',
  'rijmen',
  'samenvatten',
  'spelling',
  'werkwoordspelling',
  'woordenschat',
])
const themeOptions = new Set([
  'Voetbal',
  'Paarden',
  'Dieren',
  "Dino's",
  'Minecraft',
  'Prinsessen',
  'Ruimte',
  "Auto's",
  'Pokémon',
])
const difficultyOptions = new Set([
  'Makkelijker',
  'Uitdagender',
])

function normalizeTheme(theme: unknown, exercise: string) {
  return typeof theme === 'string' && themeOptions.has(theme) && themeSupportedExercises.has(exercise)
    ? theme
    : undefined
}

function normalizeDifficulty(difficulty: unknown) {
  return typeof difficulty === 'string' && difficultyOptions.has(difficulty) ? difficulty : undefined
}

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

function fallbackAnswers(amount: number, startIndex = 0) {
  return Array.from({ length: amount }, (_, index) => `${startIndex + index + 1}. Antwoord niet beschikbaar.`)
}

function fallbackReadingContent(amount: number, startIndex = 0): WorksheetContent {
  const readingItems = [
    {
      text: 'Mila zet haar tas bij de deur. Daarna pakt ze haar broodtrommel en loopt ze naar school.',
      question: 'Waar zet Mila haar tas?',
      answer: 'Bij de deur.',
    },
    {
      text: 'In de tuin staat een kleine boom. Sam geeft de boom water, omdat de grond erg droog is.',
      question: 'Waarom geeft Sam de boom water?',
      answer: 'Omdat de grond erg droog is.',
    },
    {
      text: 'Noor leest een boek op de bank. Als het donker wordt, doet ze de lamp aan.',
      question: 'Wat doet Noor als het donker wordt?',
      answer: 'Ze doet de lamp aan.',
    },
    {
      text: 'De klas gaat naar de bibliotheek. Iedereen mag een boek kiezen om mee naar huis te nemen.',
      question: 'Waar gaat de klas naartoe?',
      answer: 'Naar de bibliotheek.',
    },
  ]
  const fallbackItem = readingItems[0] as typeof readingItems[number]
  const items = Array.from({ length: amount }, (_, index) => {
    const item = readingItems[(startIndex + index) % readingItems.length] ?? fallbackItem
    const questionIndex = startIndex + index + 1

    return {
      question: `${questionIndex}. ${item.text}\n${item.question}`,
      answer: `${questionIndex}. ${item.answer}`,
    }
  })

  return {
    questions: items.map((item) => item.question),
    answers: items.map((item) => item.answer),
  }
}

function fallbackDefaultContent(exercise: string, amount: number, startIndex = 0): WorksheetContent {
  if (readingExercises.has(exercise)) {
    return fallbackReadingContent(amount, startIndex)
  }

  return {
    questions: fallbackQuestions(amount, startIndex),
    answers: fallbackAnswers(amount, startIndex),
  }
}

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
  layout: WorksheetRequest['layout'],
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
    : fallbackDefaultContent(exercise, missingAmount, Math.min(paddedQuestions.length, paddedAnswers.length))

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
            const {
              group = '4',
              exercise = 'contextsommen',
              amount = 10,
              layout = 'default',
              theme,
              difficulty,
            } = await readJsonBody(req)
            const requestedAmount = Number(amount) || 10
            const safeTheme = normalizeTheme(theme, exercise)
            const safeDifficulty = normalizeDifficulty(difficulty)
            const maxAmount = layout === 'compact-arithmetic'
              ? compactArithmeticQuestionsPerPage * maxCompactArithmeticPages
              : getDefaultQuestionsPerPage(exercise) * maxDefaultWorksheetPages

            if (requestedAmount > maxAmount) {
              sendJson(res, 400, { error: `Je kunt maximaal ${maxAmount} opdrachten genereren.` })
              return
            }

            const safeAmount = Math.min(Math.max(requestedAmount, 1), maxAmount)

            if (!process.env.OPENAI_API_KEY) {
              const fallbackContent = layout === 'compact-arithmetic'
                ? fallbackCompactArithmeticContent(group, exercise, safeAmount)
                : fallbackDefaultContent(exercise, safeAmount)

              sendJson(res, 200, {
                questions: fallbackContent.questions,
                answers: fallbackContent.answers,
                source: 'fallback',
              })
              return
            }

            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            const prompt = getWorksheetPrompt(group, exercise, safeAmount, safeTheme, safeDifficulty)
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
              parsed.questions?.slice(0, safeAmount).map((question, index) => {
                const cleanQuestion = question.replace(/^\d+\.\s*/, '').trim()

                return `${index + 1}. ${cleanQuestion}`
              }) ?? []
            const generatedAnswers =
              parsed.answers?.slice(0, safeAmount).map((answer, index) => {
                const cleanAnswer = answer.replace(/^\d+\.\s*/, '').trim()

                return `${index + 1}. ${cleanAnswer}`
              }) ?? []
            const { questions, answers } = padContent(generatedQuestions, generatedAnswers, group, exercise, safeAmount, layout)

            sendJson(res, 200, { questions, answers, source: 'openai' })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Kon werkblad niet genereren.'

            sendJson(res, 500, { error: message })
          }
        })
      },
    },
  ],
})
