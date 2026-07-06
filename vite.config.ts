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
}

const maxWorksheetAmount = 50

function fallbackQuestions(amount: number) {
  return Array.from({ length: amount }, (_, index) => `${index + 1}. __________________________________________`)
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
            const { group = '4', exercise = 'contextsommen', amount = 10 } = await readJsonBody(req)
            const requestedAmount = Number(amount) || 10

            if (requestedAmount > maxWorksheetAmount) {
              sendJson(res, 400, { error: `Je kunt maximaal ${maxWorksheetAmount} opdrachten genereren.` })
              return
            }

            const safeAmount = Math.min(Math.max(requestedAmount, 1), maxWorksheetAmount)

            if (!process.env.OPENAI_API_KEY) {
              sendJson(res, 200, {
                questions: fallbackQuestions(safeAmount),
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
            const questions =
              parsed.questions?.slice(0, safeAmount).map((question, index) => {
                const cleanQuestion = question.replace(/^\d+\.\s*/, '').trim()

                return `${index + 1}. ${cleanQuestion}`
              }) ?? fallbackQuestions(safeAmount)

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
