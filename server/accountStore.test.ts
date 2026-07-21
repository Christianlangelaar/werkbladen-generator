import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createLoginCode,
  createSession,
  deleteAccountData,
  getLibrary,
  getOrCreateAccount,
  getSessionAccount,
  normalizeAccountEmail,
  saveLibrary,
  storeLoginCode,
  verifyLoginCode,
} from './accountStore'

const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL
const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const redis = new Map<string, string>()

beforeEach(() => {
  redis.clear()
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body)) as Array<string>
    const [name, key, value] = command
    if (name === 'GET') return Response.json({ result: redis.get(key!) ?? null })
    if (name === 'SET') {
      redis.set(key!, value!)
      return Response.json({ result: 'OK' })
    }
    if (name === 'DEL') {
      const count = command.slice(1).reduce((total, candidate) => total + Number(redis.delete(candidate)), 0)
      return Response.json({ result: count })
    }
    return Response.json({ error: 'unknown command' })
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL
  else process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl
  if (originalRedisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken
})

describe('account store', () => {
  it('normaliseert alleen geldige e-mailadressen en maakt zescijferige codes', () => {
    expect(normalizeAccountEmail(' Christian@Example.COM ')).toBe('christian@example.com')
    expect(normalizeAccountEmail('ongeldig')).toBe('')
    expect(createLoginCode()).toMatch(/^\d{6}$/)
  })

  it('bewaart een inlogcode eenmalig', async () => {
    await storeLoginCode('test@example.com', '123456')

    await expect(verifyLoginCode('test@example.com', '000000')).resolves.toBe(false)
    await expect(verifyLoginCode('test@example.com', '123456')).resolves.toBe(true)
    await expect(verifyLoginCode('test@example.com', '123456')).resolves.toBe(false)
  })

  it('maakt een account, sessie en gesynchroniseerde bibliotheek', async () => {
    const account = await getOrCreateAccount('test@example.com')
    const sameAccount = await getOrCreateAccount('test@example.com')
    const session = await createSession(account.id)
    const request = new Request('https://example.test/api/auth', {
      headers: { Cookie: session.cookie.split(';')[0]! },
    })

    expect(sameAccount.id).toBe(account.id)
    await expect(getSessionAccount(request)).resolves.toMatchObject({ email: 'test@example.com', plan: 'free' })

    const item = {
      id: 'item-1', title: 'Spelling', kind: 'worksheet' as const, group: '4', exercises: ['spelling'],
      settings: { group: '4' }, items: [{ question: 'Vraag', answer: 'Antwoord' }], pageCount: 1,
      favorite: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    await saveLibrary(account.id, [item])
    await expect(getLibrary(account.id)).resolves.toEqual([item])

    await deleteAccountData(account)
    await expect(getLibrary(account.id)).resolves.toEqual([])
  })
})
