import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'
import { generateWorksheetContent } from './server/generateWorksheetContent'
import { RequestError, validateWorksheetRequest } from './server/worksheetRequest'
import { createCompactArithmeticContent } from './shared/compactArithmetic'
import { createFallbackWorksheetContent } from './shared/fallbackWorksheet'

dotenv.config({ path: '.env.local' })

const maxRequestBodyBytes = 16 * 1024

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
                ? createCompactArithmeticContent(group, exercise, amount)
                : createFallbackWorksheetContent(group, exercise, amount)

              sendJson(res, 200, {
                questions: fallbackContent.questions,
                answers: fallbackContent.answers,
                source: 'fallback',
                layout,
              })
              return
            }

            const { questions, answers } = await generateWorksheetContent(
              { group, exercise, amount, layout, theme, difficulty },
              process.env.OPENAI_API_KEY,
              process.env.OPENAI_MODEL,
            )

            sendJson(res, 200, { questions, answers, source: 'openai', layout })
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
