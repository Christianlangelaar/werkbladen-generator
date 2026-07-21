import { beforeEach, describe, expect, it, vi } from 'vitest'

const accountStore = vi.hoisted(() => ({
  createLoginCode: vi.fn(() => '123456'),
  createSession: vi.fn(async () => ({ token: 'token', cookie: 'worksheet_session=token; HttpOnly' })),
  deleteAccountData: vi.fn(),
  deleteSession: vi.fn(async () => 'worksheet_session=; Max-Age=0'),
  getLibrary: vi.fn(async () => []),
  getOrCreateAccount: vi.fn(async (email: string) => ({ id: 'account-1', email, plan: 'free', purchases: [], createdAt: '2026-07-21T00:00:00.000Z' })),
  getSessionAccount: vi.fn(),
  isTrustedRequest: vi.fn(() => true),
  normalizeAccountEmail: vi.fn((value: unknown) => typeof value === 'string' && value.includes('@') ? value : ''),
  storeLoginCode: vi.fn(),
  verifyLoginCode: vi.fn(async () => true),
}))

vi.mock('../server/accountStore.js', () => accountStore)
vi.mock('../server/rateLimit.js', () => ({
  checkWorksheetRateLimit: vi.fn(async () => ({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000, retryAfterSeconds: 60 })),
  getRateLimitHeaders: vi.fn(() => ({ 'RateLimit-Limit': '5' })),
}))

import handler from './auth'

beforeEach(() => {
  vi.clearAllMocks()
  accountStore.createLoginCode.mockReturnValue('123456')
  accountStore.verifyLoginCode.mockResolvedValue(true)
  accountStore.isTrustedRequest.mockReturnValue(true)
  accountStore.getSessionAccount.mockResolvedValue(undefined)
  process.env.RESEND_API_KEY = 'test-key'
  process.env.FEEDBACK_EMAIL_FROM = 'Werkbladen <noreply@example.com>'
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 202 })))
})

function request(body?: unknown, method = 'POST') {
  const init: RequestInit = { method }
  if (body) {
    init.headers = { 'Content-Type': 'application/json', Origin: 'https://example.test' }
    init.body = JSON.stringify(body)
  }
  return new Request('https://example.test/api/auth', init)
}

describe('account endpoint', () => {
  it('verstuurt een code zonder deze in de response te lekken', async () => {
    const response = await handler.fetch(request({ action: 'request-code', email: 'test@example.com' }))

    expect(response.status).toBe(202)
    expect(await response.text()).not.toContain('123456')
    expect(accountStore.storeLoginCode).toHaveBeenCalledWith('test@example.com', '123456')
  })

  it('maakt na verificatie een beveiligde sessie', async () => {
    const response = await handler.fetch(request({ action: 'verify-code', email: 'test@example.com', code: '123456' }))

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    await expect(response.json()).resolves.toMatchObject({ account: { email: 'test@example.com' }, library: [] })
  })

  it('geeft accountgegevens alleen met een geldige sessie terug', async () => {
    expect((await handler.fetch(request(undefined, 'GET'))).status).toBe(401)

    accountStore.getSessionAccount.mockResolvedValue({ id: 'account-1', email: 'test@example.com', plan: 'free', purchases: [] })
    const response = await handler.fetch(request(undefined, 'GET'))
    expect(response.status).toBe(200)
  })
})
