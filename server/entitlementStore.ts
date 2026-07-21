import { redisCommand } from './accountStore.js'

export type ProductType = 'worksheet' | 'workbook'
export type PurchaseProvider = 'stripe' | 'app_store'

export type EntitlementState = {
  freeGenerationsUsed: number
  creditBalance: number
  pendingFree: number
  pendingCredits: number
  subscriptionStatus: 'none' | 'active'
  updatedAt: string
}

export type GenerationAccess = {
  allowed: boolean
  reason: 'free' | 'credits' | 'payment_required'
  productType: ProductType
  creditCost: number
  reservationId?: string
  state: EntitlementState
}

type Reservation = {
  id: string
  accountId: string
  productType: ProductType
  creditCost: number
  source: 'free' | 'credits'
  status: 'authorized' | 'succeeded' | 'failed'
  createdAt: string
}

export type PurchaseRecord = {
  id: string
  accountId: string
  provider: PurchaseProvider
  transactionId: string
  credits: number
  createdAt: string
}

const freeGenerationLimit = 3

function entitlementKey(accountId: string) {
  return `account-entitlement:${accountId}`
}

function defaultState(): EntitlementState {
  return {
    freeGenerationsUsed: 0,
    creditBalance: 0,
    pendingFree: 0,
    pendingCredits: 0,
    subscriptionStatus: 'none',
    updatedAt: new Date().toISOString(),
  }
}

function normalizeState(value: unknown): EntitlementState {
  if (typeof value !== 'string') return defaultState()
  try {
    const parsed = JSON.parse(value) as Partial<EntitlementState>
    const state: EntitlementState = {
      freeGenerationsUsed: Math.max(0, Number(parsed.freeGenerationsUsed) || 0),
      creditBalance: Math.max(0, Number(parsed.creditBalance) || 0),
      pendingFree: Math.max(0, Number(parsed.pendingFree) || 0),
      pendingCredits: Math.max(0, Number(parsed.pendingCredits) || 0),
      subscriptionStatus: parsed.subscriptionStatus === 'active' ? 'active' : 'none',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    }
    if ((state.pendingFree > 0 || state.pendingCredits > 0)
      && Date.now() - Date.parse(state.updatedAt) > 3_600_000) {
      state.pendingFree = 0
      state.pendingCredits = 0
    }
    return state
  } catch {
    return defaultState()
  }
}

export function getCreditCost(productType: ProductType) {
  const configured = Number(process.env[productType === 'workbook'
    ? 'WORKBOOK_CREDIT_COST'
    : 'WORKSHEET_CREDIT_COST'])
  const fallback = productType === 'workbook' ? 3 : 1
  return Number.isInteger(configured) && configured > 0 ? configured : fallback
}

export function evaluateGenerationAccess(
  state: EntitlementState,
  productType: ProductType,
): Omit<GenerationAccess, 'state' | 'reservationId'> {
  const creditCost = getCreditCost(productType)
  if (state.subscriptionStatus === 'active' || state.freeGenerationsUsed + state.pendingFree < freeGenerationLimit) {
    return { allowed: true, reason: 'free', productType, creditCost }
  }
  if (state.creditBalance - state.pendingCredits >= creditCost) {
    return { allowed: true, reason: 'credits', productType, creditCost }
  }
  return { allowed: false, reason: 'payment_required', productType, creditCost }
}

async function acquireLock(accountId: string) {
  const key = `account-entitlement-lock:${accountId}`
  const token = crypto.randomUUID()
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await redisCommand(['SET', key, token, 'NX', 'EX', 5])
    if (result === 'OK') return { key, token }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('Betaalstatus is tijdelijk bezet.')
}

async function withLock<T>(accountId: string, action: () => Promise<T>) {
  const lock = await acquireLock(accountId)
  try {
    return await action()
  } finally {
    await redisCommand([
      'EVAL',
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      lock.key,
      lock.token,
    ])
  }
}

export async function getEntitlementState(accountId: string) {
  return normalizeState(await redisCommand(['GET', entitlementKey(accountId)]))
}

async function saveState(accountId: string, state: EntitlementState) {
  state.updatedAt = new Date().toISOString()
  await redisCommand(['SET', entitlementKey(accountId), JSON.stringify(state)])
}

async function appendEvent(accountId: string, event: Record<string, unknown>) {
  const key = `account-entitlement-events:${accountId}`
  const stored = await redisCommand(['GET', key])
  const events = typeof stored === 'string' ? JSON.parse(stored) as unknown[] : []
  await redisCommand(['SET', key, JSON.stringify([event, ...events].slice(0, 100))])
}

export async function authorizeGeneration(accountId: string, productType: ProductType): Promise<GenerationAccess> {
  return withLock(accountId, async () => {
    const state = await getEntitlementState(accountId)
    const access = evaluateGenerationAccess(state, productType)
    if (!access.allowed || access.reason === 'payment_required') return { ...access, state }

    const reservation: Reservation = {
      id: crypto.randomUUID(),
      accountId,
      productType,
      creditCost: access.creditCost,
      source: access.reason,
      status: 'authorized',
      createdAt: new Date().toISOString(),
    }
    if (reservation.source === 'free') state.pendingFree += 1
    else state.pendingCredits += reservation.creditCost
    await saveState(accountId, state)
    await redisCommand(['SET', `generation-reservation:${reservation.id}`, JSON.stringify(reservation), 'EX', 3600])
    return { ...access, reservationId: reservation.id, state }
  })
}

async function getReservation(reservationId: string) {
  const stored = await redisCommand(['GET', `generation-reservation:${reservationId}`])
  if (typeof stored !== 'string') return undefined
  try { return JSON.parse(stored) as Reservation } catch { return undefined }
}

export async function validateGenerationReservation(accountId: string, reservationId: string) {
  const reservation = await getReservation(reservationId)
  return Boolean(reservation?.accountId === accountId && reservation.status === 'authorized')
}

export async function finalizeGeneration(accountId: string, reservationId: string, succeeded: boolean) {
  return withLock(accountId, async () => {
    const reservation = await getReservation(reservationId)
    const state = await getEntitlementState(accountId)
    if (!reservation || reservation.accountId !== accountId || reservation.status !== 'authorized') return state

    if (reservation.source === 'free') {
      state.pendingFree = Math.max(0, state.pendingFree - 1)
      if (succeeded) state.freeGenerationsUsed += 1
    } else {
      state.pendingCredits = Math.max(0, state.pendingCredits - reservation.creditCost)
      if (succeeded) state.creditBalance = Math.max(0, state.creditBalance - reservation.creditCost)
    }
    reservation.status = succeeded ? 'succeeded' : 'failed'
    await saveState(accountId, state)
    await redisCommand(['SET', `generation-reservation:${reservation.id}`, JSON.stringify(reservation), 'EX', 86_400])
    await appendEvent(accountId, {
      id: crypto.randomUUID(),
      type: succeeded ? 'generation_succeeded' : 'generation_failed',
      productType: reservation.productType,
      credits: reservation.source === 'credits' && succeeded ? -reservation.creditCost : 0,
      createdAt: new Date().toISOString(),
    })
    return state
  })
}

export async function fulfillPurchase(
  accountId: string,
  provider: PurchaseProvider,
  transactionId: string,
  credits: number,
) {
  if (!Number.isInteger(credits) || credits <= 0) throw new Error('Ongeldig aantal credits.')
  return withLock(accountId, async () => {
    const purchaseKey = `purchase:${provider}:${transactionId}`
    const existing = await redisCommand(['GET', purchaseKey])
    const state = await getEntitlementState(accountId)
    if (typeof existing === 'string') return { state, created: false }

    const purchase: PurchaseRecord = {
      id: crypto.randomUUID(), accountId, provider, transactionId, credits, createdAt: new Date().toISOString(),
    }
    state.creditBalance += credits
    await saveState(accountId, state)
    await redisCommand(['SET', purchaseKey, JSON.stringify(purchase)])
    const purchaseListKey = `account-purchases:${accountId}`
    const storedPurchases = await redisCommand(['GET', purchaseListKey])
    const purchases = typeof storedPurchases === 'string'
      ? JSON.parse(storedPurchases) as PurchaseRecord[]
      : []
    await redisCommand(['SET', purchaseListKey, JSON.stringify([purchase, ...purchases].slice(0, 100))])
    await appendEvent(accountId, {
      id: crypto.randomUUID(), type: 'purchase_succeeded', provider, transactionId, credits,
      createdAt: purchase.createdAt,
    })
    return { state, created: true }
  })
}

export function paymentsBypassed() {
  return process.env.PAYMENTS_ENABLED !== 'true'
    || process.env.PAYMENTS_DEV_BYPASS === 'true'
    || (process.env.NODE_ENV === 'test' && process.env.PAYMENTS_DEV_BYPASS !== 'false')
}
