import { checkWorksheetRateLimit, getRateLimitHeaders } from '../server/rateLimit.js'
import {
  createLoginCode,
  createSession,
  deleteAccountData,
  deleteSession,
  getLibrary,
  getOrCreateAccount,
  getSessionAccount,
  isTrustedRequest,
  normalizeAccountEmail,
  storeLoginCode,
  verifyLoginCode,
} from '../server/accountStore.js'

const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }

function json(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { ...headers, ...extraHeaders } })
}

async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return undefined
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > 4_096) return undefined
  try { return JSON.parse(text) as Record<string, unknown> } catch { return undefined }
}

async function sendLoginCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM || process.env.FEEDBACK_EMAIL_FROM
  if (!apiKey || !from) throw new Error('Inlogmail is niet geconfigureerd.')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `${code} is je inlogcode`,
      text: `Je inlogcode voor Werkbladen Generator is ${code}. De code blijft 10 minuten geldig. Heb je dit niet aangevraagd? Dan hoef je niets te doen.`,
      tags: [{ name: 'source', value: 'account_login' }],
    }),
  })
  if (!response.ok) throw new Error('De inlogmail kon niet worden verzonden.')
}

export default {
  async fetch(request: Request) {
    if (!isTrustedRequest(request)) return json({ error: 'Ongeldig verzoek.' }, 403)
    try {
      if (request.method === 'GET') {
        const account = await getSessionAccount(request)
        if (!account) return json({ error: 'Niet ingelogd.' }, 401)
        return json({ account, library: await getLibrary(account.id) })
      }
      if (request.method === 'DELETE') {
        return json(null, 204, { 'Set-Cookie': await deleteSession(request) })
      }
      if (request.method !== 'POST') return json({ error: 'Methode niet toegestaan.' }, 405, { Allow: 'GET, POST, DELETE' })

      const parsed = await body(request)
      if (!parsed) return json({ error: 'Ongeldig verzoek.' }, 400)
      const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      const email = normalizeAccountEmail(parsed.email)
      const action = parsed.action
      const rateLimit = await checkWorksheetRateLimit(`auth:${client}:${email}`)
      const rateHeaders = getRateLimitHeaders(rateLimit)
      if (!rateLimit.allowed) return json({ error: 'Te veel pogingen. Probeer het over een minuut opnieuw.' }, 429, rateHeaders)

      if (action === 'delete-account') {
        const account = await getSessionAccount(request)
        if (!account) return json({ error: 'Niet ingelogd.' }, 401, rateHeaders)
        await deleteAccountData(account)
        return json(null, 204, { ...rateHeaders, 'Set-Cookie': await deleteSession(request) })
      }

      if (action === 'request-code' && email) {
        const code = createLoginCode()
        await storeLoginCode(email, code)
        await sendLoginCode(email, code)
        return json({ ok: true }, 202, rateHeaders)
      }
      if (action === 'verify-code' && email && typeof parsed.code === 'string' && /^\d{6}$/.test(parsed.code)) {
        if (!await verifyLoginCode(email, parsed.code)) return json({ error: 'De code is ongeldig of verlopen.' }, 400, rateHeaders)
        const account = await getOrCreateAccount(email)
        const session = await createSession(account.id)
        return json({ account, library: await getLibrary(account.id) }, 200, { ...rateHeaders, 'Set-Cookie': session.cookie })
      }
      return json({ error: 'Ongeldig verzoek.' }, 400, rateHeaders)
    } catch (error) {
      console.error('Accountverzoek mislukt.', error)
      return json({ error: 'Accounts zijn tijdelijk niet beschikbaar.' }, 503)
    }
  },
}
