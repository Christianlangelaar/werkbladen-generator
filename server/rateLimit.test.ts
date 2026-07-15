import { describe, expect, it } from 'vitest'
import { createRateLimiter, getRateLimitHeaders } from './rateLimit'

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
})
