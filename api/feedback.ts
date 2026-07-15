import { checkWorksheetRateLimit, getRateLimitHeaders } from '../server/rateLimit.js'

const categories = new Set(['incorrect', 'unclear', 'inappropriate', 'too-easy', 'too-hard'])
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }

function json(body: unknown, status: number, extraHeaders?: HeadersInit) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { ...headers, ...extraHeaders },
  })
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return json({ error: 'Alleen POST-verzoeken zijn toegestaan.' }, 405, { Allow: 'POST' })
    }

    const clientIdentifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const rateLimit = await checkWorksheetRateLimit(`feedback:${clientIdentifier}`)
    const rateLimitHeaders = getRateLimitHeaders(rateLimit)
    if (!rateLimit.allowed) {
      return json({ error: 'Je hebt te veel feedback kort na elkaar verstuurd.' }, 429, {
        ...rateLimitHeaders,
        'Retry-After': String(rateLimit.retryAfterSeconds),
      })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Het verzoek bevat geen geldige JSON.' }, 400, rateLimitHeaders)
    }

    const { requestId, group, exercise, itemIndex, category } = body as Record<string, unknown>
    if (
      typeof requestId !== 'string'
      || !requestIdPattern.test(requestId)
      || typeof group !== 'string'
      || !/^[1-8]$/.test(group)
      || typeof exercise !== 'string'
      || !/^[a-z0-9-]{1,50}$/.test(exercise)
      || !Number.isInteger(itemIndex)
      || Number(itemIndex) < 1
      || Number(itemIndex) > 500
      || typeof category !== 'string'
      || !categories.has(category)
    ) {
      return json({ error: 'De feedback is niet geldig.' }, 400, rateLimitHeaders)
    }

    if (process.env.NODE_ENV !== 'test') {
      console.info(JSON.stringify({ event: 'worksheet_feedback', requestId, group, exercise, itemIndex, category }))
    }

    return json(null, 204, rateLimitHeaders)
  },
}
