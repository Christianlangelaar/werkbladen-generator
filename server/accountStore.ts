const sessionCookieName = '__Host-worksheet_session'
const sessionTtlSeconds = 60 * 60 * 24 * 30

export type AccountRecord = {
  id: string
  email: string
  createdAt: string
  plan: 'free'
  purchases: string[]
}

export type LibraryItem = {
  id: string
  title: string
  kind: 'worksheet' | 'workbook'
  group: string
  exercises: string[]
  settings: Record<string, unknown>
  items: Array<{ question: string, answer: string }>
  pageCount: number
  favorite: boolean
  createdAt: string
  updatedAt: string
}

type RedisResponse = { result?: unknown, error?: string }

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Accountopslag is niet geconfigureerd.')
  return { url: url.replace(/\/$/, ''), token }
}

export async function redisCommand(command: Array<string | number>) {
  const { url, token } = getRedisConfig()
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  if (!response.ok) throw new Error('Accountopslag is tijdelijk niet beschikbaar.')
  const result = await response.json() as RedisResponse
  if (result.error) throw new Error('Accountopslag is tijdelijk niet beschikbaar.')
  return result.result
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomHex(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createLoginCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(1))
  return String(100_000 + ((bytes[0] ?? 0) % 900_000))
}

export function normalizeAccountEmail(value: unknown) {
  if (typeof value !== 'string') return ''
  const email = value.trim().toLocaleLowerCase('en-US').slice(0, 254)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

export function isTrustedRequest(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

export async function storeLoginCode(email: string, code: string) {
  const emailHash = await sha256(email)
  const codeHash = await sha256(`${email}:${code}`)
  await redisCommand(['SET', `account-code:${emailHash}`, codeHash, 'EX', 600])
}

export async function verifyLoginCode(email: string, code: string) {
  const emailHash = await sha256(email)
  const key = `account-code:${emailHash}`
  const storedHash = await redisCommand(['GET', key])
  if (typeof storedHash !== 'string' || storedHash !== await sha256(`${email}:${code}`)) return false
  await redisCommand(['DEL', key])
  return true
}

export async function getOrCreateAccount(email: string): Promise<AccountRecord> {
  const emailHash = await sha256(email)
  const indexKey = `account-email:${emailHash}`
  const storedAccountId = await redisCommand(['GET', indexKey])
  if (typeof storedAccountId !== 'string') {
    const accountId = crypto.randomUUID()
    const account: AccountRecord = {
      id: accountId,
      email,
      createdAt: new Date().toISOString(),
      plan: 'free',
      purchases: [],
    }
    await redisCommand(['SET', `account:${accountId}`, JSON.stringify(account)])
    await redisCommand(['SET', indexKey, accountId])
    return account
  }
  const accountId = storedAccountId
  const storedAccount = await redisCommand(['GET', `account:${accountId}`])
  if (typeof storedAccount !== 'string') throw new Error('Accountgegevens zijn niet beschikbaar.')
  return JSON.parse(storedAccount) as AccountRecord
}

export async function createSession(accountId: string) {
  const token = randomHex()
  const tokenHash = await sha256(token)
  await redisCommand(['SET', `account-session:${tokenHash}`, accountId, 'EX', sessionTtlSeconds])
  return {
    token,
    cookie: `${sessionCookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sessionTtlSeconds}`,
  }
}

function getCookie(request: Request, name: string) {
  const cookies = request.headers.get('cookie') ?? ''
  for (const cookie of cookies.split(';')) {
    const [key, ...value] = cookie.trim().split('=')
    if (key === name) return value.join('=')
  }
  return ''
}

export async function getSessionAccount(request: Request) {
  const token = getCookie(request, sessionCookieName)
  if (!/^[a-f0-9]{64}$/.test(token)) return undefined
  const tokenHash = await sha256(token)
  const accountId = await redisCommand(['GET', `account-session:${tokenHash}`])
  if (typeof accountId !== 'string') return undefined
  const storedAccount = await redisCommand(['GET', `account:${accountId}`])
  if (typeof storedAccount !== 'string') return undefined
  return JSON.parse(storedAccount) as AccountRecord
}

export async function deleteSession(request: Request) {
  const token = getCookie(request, sessionCookieName)
  if (/^[a-f0-9]{64}$/.test(token)) {
    await redisCommand(['DEL', `account-session:${await sha256(token)}`])
  }
  return `${sessionCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export async function getLibrary(accountId: string): Promise<LibraryItem[]> {
  const storedLibrary = await redisCommand(['GET', `account-library:${accountId}`])
  if (typeof storedLibrary !== 'string') return []
  const parsed = JSON.parse(storedLibrary) as unknown
  return Array.isArray(parsed) ? parsed as LibraryItem[] : []
}

export async function saveLibrary(accountId: string, items: LibraryItem[]) {
  await redisCommand(['SET', `account-library:${accountId}`, JSON.stringify(items.slice(0, 50))])
}

export async function deleteAccountData(account: AccountRecord) {
  const emailHash = await sha256(account.email)
  await redisCommand(['DEL', `account:${account.id}`, `account-library:${account.id}`, `account-email:${emailHash}`])
}
