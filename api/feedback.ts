import { checkWorksheetRateLimit, getRateLimitHeaders } from '../server/rateLimit.js'

const categories = new Set(['incorrect', 'unclear', 'inappropriate', 'too-easy', 'too-hard'])
const feedbackTypes = new Set(['problem', 'feature', 'other'])
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const maxRequestBodyBytes = 16 * 1024
const minimumSubmitDelayMs = 1_500
const typeLabels: Record<string, string> = {
  problem: 'Probleem',
  feature: 'Wens',
  other: 'Overige feedback',
}
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
type ParsedBody = { body: unknown } | { error: string, status: number }

function json(body: unknown, status: number, extraHeaders?: HeadersInit) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { ...headers, ...extraHeaders },
  })
}

async function parseRequestBody(request: Request): Promise<ParsedBody> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return { error: 'Gebruik application/json als Content-Type.', status: 415 } as const
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > maxRequestBodyBytes) {
    return { error: 'Het verzoek is te groot.', status: 413 } as const
  }

  const bodyText = await request.text()
  if (new TextEncoder().encode(bodyText).byteLength > maxRequestBodyBytes) {
    return { error: 'Het verzoek is te groot.', status: 413 } as const
  }

  try {
    return { body: bodyText ? JSON.parse(bodyText) : {} } as const
  } catch {
    return { error: 'Het verzoek bevat geen geldige JSON.', status: 400 } as const
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function normalizeEmail(value: unknown) {
  const email = sanitizeText(value, 254)
  return email && emailPattern.test(email) ? email : ''
}

function validateWorksheetFeedback(body: Record<string, unknown>) {
  const { requestId, group, exercise, itemIndex, category } = body

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
    return undefined
  }

  return { requestId, group, exercise, itemIndex, category }
}

function validateProductFeedback(body: Record<string, unknown>) {
  const feedbackId = sanitizeText(body.feedbackId, 64)
  const feedbackType = sanitizeText(body.type, 20)
  const message = sanitizeText(body.message, 2_000)
  const email = normalizeEmail(body.email)
  const website = sanitizeText(body.website, 200)
  const formStartedAt = typeof body.formStartedAt === 'number' ? body.formStartedAt : 0
  const context = isRecord(body.context) ? body.context : {}
  const route = sanitizeText(context.route, 200)
  const appVersion = sanitizeText(context.appVersion, 80)
  const browser = sanitizeText(context.browser, 500)
  const platform = sanitizeText(context.platform, 120)
  const timestamp = sanitizeText(context.timestamp, 80)

  if (website) {
    return { spam: true } as const
  }

  if (Date.now() - formStartedAt < minimumSubmitDelayMs) {
    return undefined
  }

  if (
    !requestIdPattern.test(feedbackId)
    || !feedbackTypes.has(feedbackType)
    || message.length < 2
    || (body.email && !email)
    || !route.startsWith('/')
    || !timestamp
  ) {
    return undefined
  }

  return {
    feedbackId,
    type: feedbackType,
    typeLabel: typeLabels[feedbackType] ?? feedbackType,
    message,
    email,
    context: {
      route,
      appVersion: appVersion || 'unknown',
      browser: browser || 'unknown',
      platform: platform || 'unknown',
      timestamp,
    },
  }
}

function createFeedbackEmailText(feedback: Exclude<ReturnType<typeof validateProductFeedback>, undefined | { spam: true }>) {
  return [
    `Feedback-ID: ${feedback.feedbackId}`,
    `Type: ${feedback.typeLabel}`,
    `Route: ${feedback.context.route}`,
    `Appversie: ${feedback.context.appVersion}`,
    `Browser: ${feedback.context.browser}`,
    `Platform: ${feedback.context.platform}`,
    `Tijdstip: ${feedback.context.timestamp}`,
    `Antwoordadres: ${feedback.email || 'Niet opgegeven'}`,
    '',
    'Bericht:',
    feedback.message,
  ].join('\n')
}

async function sendFeedbackEmail(feedback: Exclude<ReturnType<typeof validateProductFeedback>, undefined | { spam: true }>) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.FEEDBACK_EMAIL_TO
  const from = process.env.FEEDBACK_EMAIL_FROM

  if (!apiKey || !to || !from) {
    return { sent: false, reason: 'missing_config' as const }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': feedback.feedbackId,
    },
    body: JSON.stringify({
      from,
      to,
      subject: `[Werkbladen Generator] ${feedback.typeLabel}`,
      text: createFeedbackEmailText(feedback),
      reply_to: feedback.email || undefined,
      tags: [
        { name: 'source', value: 'feedback_form' },
        { name: 'type', value: feedback.type },
      ],
    }),
  })

  if (!response.ok) {
    const responseText = await response.text().catch(() => '')
    throw new Error(`Feedbackmail kon niet worden verzonden (${response.status}). ${responseText}`.trim())
  }

  return { sent: true, reason: 'resend' as const }
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

    const parsed = await parseRequestBody(request)
    if ('error' in parsed) {
      return json({ error: parsed.error }, parsed.status, rateLimitHeaders)
    }
    const body = parsed.body

    if (!isRecord(body)) {
      return json({ error: 'De feedback is niet geldig.' }, 400, rateLimitHeaders)
    }

    const worksheetFeedback = validateWorksheetFeedback(body)
    if (worksheetFeedback) {
      if (process.env.NODE_ENV !== 'test') {
        console.info(JSON.stringify({ event: 'worksheet_feedback', ...worksheetFeedback }))
      }

      return json(null, 204, rateLimitHeaders)
    }

    const productFeedback = validateProductFeedback(body)
    if (!productFeedback) {
      return json({ error: 'De feedback is niet geldig.' }, 400, rateLimitHeaders)
    }
    if ('spam' in productFeedback) {
      return json({ ok: true }, 202, rateLimitHeaders)
    }

    try {
      const delivery = await sendFeedbackEmail(productFeedback)
      if (!delivery.sent) {
        return json({ error: 'Feedbackmail is nog niet geconfigureerd.' }, 503, rateLimitHeaders)
      }

      if (process.env.NODE_ENV !== 'test') {
        console.info(JSON.stringify({
          event: 'feedback_submitted',
          feedbackId: productFeedback.feedbackId,
          type: productFeedback.type,
          route: productFeedback.context.route,
          delivery: delivery.reason,
        }))
      }

      return json({ ok: true, feedbackId: productFeedback.feedbackId }, 202, rateLimitHeaders)
    } catch (error) {
      console.error('Feedbackmail verzenden mislukt.', error)
      return json({ error: 'De feedback kon niet worden verstuurd.' }, 502, rateLimitHeaders)
    }
  },
}
