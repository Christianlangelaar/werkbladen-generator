import { generateWorksheetContent } from '../server/generateWorksheetContent'
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

    const { questions, answers } = await generateWorksheetContent(
      { group, exercise, amount, layout, theme, difficulty },
      apiKey,
      process.env.OPENAI_MODEL,
    )

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
