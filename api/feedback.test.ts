import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from './feedback'

const endpoint = 'https://example.test/api/feedback'
const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  FEEDBACK_EMAIL_TO: process.env.FEEDBACK_EMAIL_TO,
  FEEDBACK_EMAIL_FROM: process.env.FEEDBACK_EMAIL_FROM,
  FEEDBACK_EMAIL_REPLY_TO: process.env.FEEDBACK_EMAIL_REPLY_TO,
}
const validFeedback = {
  requestId: '76cded37-9793-4c5d-a7eb-df681a30385d',
  group: '4',
  exercise: 'contextsommen',
  itemIndex: 1,
  category: 'incorrect',
}
const validProductFeedback = {
  feedbackId: '1a4f2086-16fe-4392-a3d4-df830a5c5c6f',
  type: 'problem',
  message: 'De knop werkt niet op mobiel.',
  email: 'ouder@example.com',
  website: '',
  formStartedAt: Date.now() - 2_000,
  context: {
    appVersion: '0.0.0',
    route: '/?groep=4',
    browser: 'Vitest',
    platform: 'node',
    timestamp: new Date().toISOString(),
  },
}

function request(body: unknown, method = 'POST') {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': crypto.randomUUID() },
  }
  if (method === 'POST') init.body = JSON.stringify(body)
  return new Request(endpoint, init)
}

function restoreEnv(name: keyof typeof originalEnv) {
  const value = originalEnv[name]
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

describe('worksheet feedback endpoint', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.FEEDBACK_EMAIL_TO = 'feedback@example.com'
    process.env.FEEDBACK_EMAIL_FROM = 'Werkbladen Generator <feedback@example.com>'
    process.env.FEEDBACK_EMAIL_REPLY_TO = 'beheerder@example.com'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    restoreEnv('RESEND_API_KEY')
    restoreEnv('FEEDBACK_EMAIL_TO')
    restoreEnv('FEEDBACK_EMAIL_FROM')
    restoreEnv('FEEDBACK_EMAIL_REPLY_TO')
  })

  it('accepteert alleen metadata uit de vaste categorieën', async () => {
    const response = await handler.fetch(request(validFeedback))
    expect(response.status).toBe(204)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('weigert vrije tekst en ongeldige metadata', async () => {
    const response = await handler.fetch(request({ ...validFeedback, category: 'Mijn vrije tekst' }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'De feedback is niet geldig.' })
  })

  it('weigert andere HTTP-methodes', async () => {
    const response = await handler.fetch(request(undefined, 'GET'))
    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('POST')
  })

  it('verstuurt productfeedback als e-mail met technische context en reply-to', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'email-id' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler.fetch(request(validProductFeedback))

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      feedbackId: validProductFeedback.feedbackId,
    })
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer re_test',
        'Idempotency-Key': validProductFeedback.feedbackId,
      }),
    }))
    const resendBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    expect(resendBody).toMatchObject({
      from: 'Werkbladen Generator <feedback@example.com>',
      to: 'feedback@example.com',
      reply_to: 'ouder@example.com',
      subject: '[Werkbladen Generator] Probleem',
    })
    expect(resendBody.text).toContain('De knop werkt niet op mobiel.')
    expect(resendBody.text).toContain('Route: /?groep=4')
  })

  it('gebruikt het geconfigureerde antwoordadres als de gebruiker geen e-mailadres opgeeft', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler.fetch(request({
      ...validProductFeedback,
      email: '',
    }))

    expect(response.status).toBe(202)
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      body: expect.stringContaining('"reply_to":"beheerder@example.com"'),
    }))
  })

  it('weigert productfeedback wanneer e-mail nog niet is geconfigureerd', async () => {
    delete process.env.RESEND_API_KEY

    const response = await handler.fetch(request(validProductFeedback))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Feedbackmail is nog niet geconfigureerd.' })
  })

  it('weigert te snelle of ongeldige productfeedback', async () => {
    const response = await handler.fetch(request({
      ...validProductFeedback,
      formStartedAt: Date.now(),
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'De feedback is niet geldig.' })
  })
})
