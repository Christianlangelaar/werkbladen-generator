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

type DistributedRateLimitOptions = {
  identifier: string
  limit: number
  windowMs: number
  redisUrl: string
  redisToken: string
  now?: () => number
  fetchImplementation?: typeof fetch
}

function createResult(count: number, limit: number, resetAt: number, currentTime: number): RateLimitResult {
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - currentTime) / 1_000)),
  }
}

async function hashIdentifier(identifier: string) {
  const bytes = new TextEncoder().encode(identifier)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

export async function checkDistributedRateLimit({
  identifier,
  limit,
  windowMs,
  redisUrl,
  redisToken,
  now = Date.now,
  fetchImplementation = fetch,
}: DistributedRateLimitOptions): Promise<RateLimitResult> {
  const currentTime = now()
  const bucket = Math.floor(currentTime / windowMs)
  const resetAt = (bucket + 1) * windowMs
  const key = `worksheet-rate:${bucket}:${await hashIdentifier(identifier)}`
  const expirationSeconds = Math.ceil((windowMs * 2) / 1_000)
  const response = await fetchImplementation(`${redisUrl.replace(/\/$/, '')}/multi-exec`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, expirationSeconds],
    ]),
  })

  if (!response.ok) throw new Error('De gedeelde rate limiter gaf geen geldige response.')
  const results = await response.json() as Array<{ result?: unknown, error?: string }>
  const count = Number(results[0]?.result)
  if (!Number.isInteger(count) || count < 1 || results.some((result) => result.error)) {
    throw new Error('De gedeelde rate limiter gaf geen geldige teller terug.')
  }

  return createResult(count, limit, resetAt, currentTime)
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

    return createResult(entry.count, limit, entry.resetAt, currentTime)
  }

  return { check }
}

const configuredLimit = Number(process.env.WORKSHEET_RATE_LIMIT)

export const worksheetRateLimiter = createRateLimiter({
  limit: Number.isInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 20,
  windowMs: 60_000,
})

export async function checkWorksheetRateLimit(identifier: string) {
  const limit = Number.isInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 20
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    try {
      return await checkDistributedRateLimit({
        identifier,
        limit,
        windowMs: 60_000,
        redisUrl,
        redisToken,
      })
    } catch (error) {
      console.error('Gedeelde rate limiter niet beschikbaar; lokale limiter wordt gebruikt.', error)
    }
  }

  return worksheetRateLimiter.check(identifier)
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.ceil(result.resetAt / 1_000)),
  }
}
