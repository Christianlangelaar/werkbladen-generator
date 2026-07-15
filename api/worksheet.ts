import OpenAI from 'openai'
import { getWorksheetPrompt } from '../prompts'
import { RequestError, validateWorksheetRequest } from '../server/worksheetRequest'
import { getRateLimitHeaders, worksheetRateLimiter } from '../server/rateLimit'

const maxRequestBodyBytes = 16 * 1024
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

function json(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, ...extraHeaders },
  })
}

async function parseRequestBody(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new RequestError('Gebruik application/json als Content-Type.', 415)
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > maxRequestBodyBytes) {
    throw new RequestError('Het verzoek is te groot.', 413)
  }

  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > maxRequestBodyBytes) {
    throw new RequestError('Het verzoek is te groot.', 413)
  }

  try {
    return body ? JSON.parse(body) : {}
  } catch {
    throw new RequestError('Het verzoek bevat geen geldige JSON.')
  }
}

async function handleRequest(request: Request) {
  if (request.method !== 'POST') {
    return json({ error: 'Alleen POST-verzoeken zijn toegestaan.' }, 405, { Allow: 'POST' })
  }

  const clientIdentifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const rateLimit = worksheetRateLimiter.check(clientIdentifier)
  const rateLimitHeaders = getRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return json(
      { error: 'Je hebt te veel werkbladen kort na elkaar aangevraagd. Probeer het over een minuut opnieuw.' },
      429,
      { ...rateLimitHeaders, 'Retry-After': String(rateLimit.retryAfterSeconds) },
    )
  }

  try {
    const { group, exercise, amount, layout, theme, difficulty } = validateWorksheetRequest(
      await parseRequestBody(request),
    )
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return json({ error: 'De werkbladgenerator is tijdelijk niet beschikbaar.' }, 503, rateLimitHeaders)
    }

    const openai = new OpenAI({ apiKey })
    const prompt = getWorksheetPrompt(group, exercise, amount, theme, difficulty)
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.5',
      input: [
        {
          role: 'system',
          content: 'Je maakt Nederlandse basisschool-werkbladen. Antwoord alleen met geldige JSON.',
        },
        { role: 'user', content: prompt },
      ],
    })
    const parsed = JSON.parse(response.output_text) as { questions?: unknown, answers?: unknown }

    if (!Array.isArray(parsed.questions) || !Array.isArray(parsed.answers)
      || parsed.questions.length < amount || parsed.answers.length < amount) {
      throw new Error('OpenAI gaf geen volledig werkblad terug.')
    }

    const questions = parsed.questions.slice(0, amount).map((question, index) => {
      if (typeof question !== 'string' || !question.trim()) throw new Error('Ongeldige opdracht ontvangen.')
      return `${index + 1}. ${question.replace(/^\d+\.\s*/, '').trim()}`
    })
    const answers = parsed.answers.slice(0, amount).map((answer, index) => {
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('Ongeldig antwoord ontvangen.')
      return `${index + 1}. ${answer.replace(/^\d+\.\s*/, '').trim()}`
    })

    return json({ questions, answers, source: 'openai', layout }, 200, rateLimitHeaders)
  } catch (error) {
    if (error instanceof RequestError) {
      return json({ error: error.message }, error.statusCode, rateLimitHeaders)
    }

    console.error('Werkblad genereren mislukt.', error)
    return json(
      { error: 'Het werkblad kon niet worden gegenereerd. Probeer het later opnieuw.' },
      500,
      rateLimitHeaders,
    )
  }
}

export default {
  fetch: handleRequest,
}
