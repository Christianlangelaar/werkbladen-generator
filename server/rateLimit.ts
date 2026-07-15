type RateLimitEntry = {
  count: number
  resetAt: number
}

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

type RateLimiterOptions = {
  limit: number
  windowMs: number
  now?: () => number
}

export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions) {
  const entries = new Map<string, RateLimitEntry>()

  function check(identifier: string): RateLimitResult {
    const currentTime = now()
    const currentEntry = entries.get(identifier)
    const entry = !currentEntry || currentEntry.resetAt <= currentTime
      ? { count: 0, resetAt: currentTime + windowMs }
      : currentEntry

    entry.count += 1
    entries.set(identifier, entry)

    if (entries.size > 1_000) {
      for (const [key, value] of entries) {
        if (value.resetAt <= currentTime) entries.delete(key)
      }
    }

    return {
      allowed: entry.count <= limit,
      limit,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1_000)),
    }
  }

  return { check }
}

const configuredLimit = Number(process.env.WORKSHEET_RATE_LIMIT)

export const worksheetRateLimiter = createRateLimiter({
  limit: Number.isInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 20,
  windowMs: 60_000,
})

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.ceil(result.resetAt / 1_000)),
  }
}
