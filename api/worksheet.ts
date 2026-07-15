import { generateWorksheetContent } from '../server/generateWorksheetContent.js'
import { RequestError, validateWorksheetRequest } from '../server/worksheetRequest.js'
import { checkWorksheetRateLimit, getRateLimitHeaders } from '../server/rateLimit.js'

const maxRequestBodyBytes = 16 * 1024
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

function estimateAiCost(inputTokens: number, outputTokens: number) {
  const inputRate = Number(process.env.OPENAI_INPUT_COST_PER_MILLION_USD)
  const outputRate = Number(process.env.OPENAI_OUTPUT_COST_PER_MILLION_USD)
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate)) return undefined
  return Number((((inputTokens * inputRate) + (outputTokens * outputRate)) / 1_000_000).toFixed(6))
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
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  let requestDetails: Record<string, unknown> = {}
  const respond = (
    body: unknown,
    status = 200,
    extraHeaders?: HeadersInit,
    outcome?: string,
  ) => {
    const durationMs = Date.now() - startedAt

    if (process.env.NODE_ENV !== 'test') {
      console.info(JSON.stringify({
        event: 'worksheet_request',
        requestId,
        status,
        durationMs,
        outcome,
        ...requestDetails,
      }))
    }

    return json(body, status, {
      ...extraHeaders,
      'Server-Timing': `worksheet;dur=${durationMs}`,
      'X-Request-ID': requestId,
    })
  }

  if (request.method !== 'POST') {
    return respond({ error: 'Alleen POST-verzoeken zijn toegestaan.' }, 405, { Allow: 'POST' }, 'method_not_allowed')
  }

  const clientIdentifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const rateLimit = await checkWorksheetRateLimit(clientIdentifier)
  const rateLimitHeaders = getRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return respond(
      { error: 'Je hebt te veel werkbladen kort na elkaar aangevraagd. Probeer het over een minuut opnieuw.' },
      429,
      { ...rateLimitHeaders, 'Retry-After': String(rateLimit.retryAfterSeconds) },
      'rate_limited',
    )
  }

  try {
    const { group, exercise, amount, layout, theme, difficulty } = validateWorksheetRequest(
      await parseRequestBody(request),
    )
    requestDetails = { group, exercise, amount, layout }
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return respond(
        { error: 'De werkbladgenerator is tijdelijk niet beschikbaar.' },
        503,
        rateLimitHeaders,
        'openai_unavailable',
      )
    }

    const { questions, answers, usage, quality } = await generateWorksheetContent(
      { group, exercise, amount, layout, theme, difficulty },
      apiKey,
      process.env.OPENAI_MODEL,
    )

    requestDetails = {
      ...requestDetails,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      qualityFallbackItems: quality.fallbackItems,
      estimatedCostUsd: estimateAiCost(usage.inputTokens, usage.outputTokens),
    }

    return respond(
      { questions, answers, source: 'openai', layout },
      200,
      {
        ...rateLimitHeaders,
        'X-Worksheet-Source': 'openai',
        'X-Quality-Fallback-Items': String(quality.fallbackItems),
      },
      'openai',
    )
  } catch (error) {
    if (error instanceof RequestError) {
      return respond({ error: error.message }, error.statusCode, rateLimitHeaders, 'invalid_request')
    }

    console.error('Werkblad genereren mislukt.', error)
    return respond(
      { error: 'Het werkblad kon niet worden gegenereerd. Probeer het later opnieuw.' },
      500,
      rateLimitHeaders,
      'generation_error',
    )
  }
}

export default {
  fetch: handleRequest,
}
