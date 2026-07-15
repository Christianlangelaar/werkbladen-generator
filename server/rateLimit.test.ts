import { describe, expect, it, vi } from 'vitest'
import {
  checkDistributedRateLimit,
  checkWorksheetRateLimit,
  createRateLimiter,
  getRateLimitHeaders,
} from './rateLimit'

describe('worksheet rate limiter', () => {
  it('weigert verzoeken boven de limiet en geeft wachttijd terug', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => 1_000 })

    expect(limiter.check('client-a')).toMatchObject({ allowed: true, remaining: 1 })
    expect(limiter.check('client-a')).toMatchObject({ allowed: true, remaining: 0 })
    expect(limiter.check('client-a')).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    })
    expect(limiter.check('client-b')).toMatchObject({ allowed: true, remaining: 1 })
  })

  it('opent een nieuw venster nadat de wachttijd voorbij is', () => {
    let currentTime = 0
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => currentTime })

    expect(limiter.check('client').allowed).toBe(true)
    expect(limiter.check('client').allowed).toBe(false)
    currentTime = 1_000
    expect(limiter.check('client')).toMatchObject({ allowed: true, remaining: 0 })
  })

  it('maakt standaard rate-limitheaders', () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, now: () => 1_000 })

    expect(getRateLimitHeaders(limiter.check('client'))).toEqual({
      'RateLimit-Limit': '5',
      'RateLimit-Remaining': '4',
      'RateLimit-Reset': '61',
    })
  })

  it('gebruikt een gehashte, atomische Redis-teller voor serverless instanties', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { result: 21 },
      { result: 1 },
    ]), { status: 200 }))

    const result = await checkDistributedRateLimit({
      identifier: '203.0.113.42',
      limit: 20,
      windowMs: 60_000,
      redisUrl: 'https://example.upstash.io/',
      redisToken: 'secret-token',
      now: () => 61_000,
      fetchImplementation,
    })

    expect(result).toEqual({
      allowed: false,
      limit: 20,
      remaining: 0,
      resetAt: 120_000,
      retryAfterSeconds: 59,
    })
    expect(fetchImplementation).toHaveBeenCalledOnce()
    const [url, init] = fetchImplementation.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.upstash.io/multi-exec')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer secret-token' })
    expect(init.body).not.toContain('203.0.113.42')
    expect(JSON.parse(String(init.body))).toEqual([
      ['INCR', expect.stringMatching(/^worksheet-rate:1:[a-f0-9]{32}$/)],
      ['EXPIRE', expect.stringMatching(/^worksheet-rate:1:[a-f0-9]{32}$/), 120],
    ])
  })

  it('weigert een ongeldige Redis-teller', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { error: 'ERR' },
    ]), { status: 200 }))

    await expect(checkDistributedRateLimit({
      identifier: 'client',
      limit: 20,
      windowMs: 60_000,
      redisUrl: 'https://example.upstash.io',
      redisToken: 'token',
      fetchImplementation,
    })).rejects.toThrow('geen geldige teller')
  })

  it('valt bij een Redis-storing terug op de lokale limiter', async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      await expect(checkWorksheetRateLimit('redis-fallback-test')).resolves.toMatchObject({ allowed: true })
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('lokale limiter'),
        expect.any(Error),
      )
    } finally {
      if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL
      else process.env.UPSTASH_REDIS_REST_URL = originalUrl
      if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN
      else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken
      vi.unstubAllGlobals()
      consoleError.mockRestore()
    }
  })
})
