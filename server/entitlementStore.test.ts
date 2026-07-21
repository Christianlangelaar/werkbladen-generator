import { beforeEach, describe, expect, it, vi } from 'vitest'

const redis = vi.hoisted(() => new Map<string, string>())
const redisCommand = vi.hoisted(() => vi.fn(async (command: Array<string | number>) => {
  const [name, key, value, option] = command
  if (name === 'GET') return redis.get(String(key)) ?? null
  if (name === 'SET') {
    if (option === 'NX' && redis.has(String(key))) return null
    redis.set(String(key), String(value))
    return 'OK'
  }
  if (name === 'DEL') return Number(redis.delete(String(key)))
  if (name === 'EVAL') {
    const lockKey = String(command[3])
    const token = String(command[4])
    if (redis.get(lockKey) === token) return Number(redis.delete(lockKey))
    return 0
  }
  throw new Error(`Onbekend Redis-commando: ${String(name)}`)
}))

vi.mock('./accountStore.js', () => ({ redisCommand }))

import {
  authorizeGeneration,
  evaluateGenerationAccess,
  finalizeGeneration,
  fulfillPurchase,
  getEntitlementState,
} from './entitlementStore'

beforeEach(() => {
  redis.clear()
  redisCommand.mockClear()
  delete process.env.WORKSHEET_CREDIT_COST
  delete process.env.WORKBOOK_CREDIT_COST
})

describe('entitlement store', () => {
  it('staat generatie 0 tot en met 2 gratis toe en blokkeert nummer 4', async () => {
    for (let generation = 0; generation < 3; generation += 1) {
      const access = await authorizeGeneration('account-1', 'worksheet')
      expect(access).toMatchObject({ allowed: true, reason: 'free' })
      await finalizeGeneration('account-1', access.reservationId!, true)
    }

    expect(await authorizeGeneration('account-1', 'worksheet')).toMatchObject({
      allowed: false,
      reason: 'payment_required',
    })
    expect((await getEntitlementState('account-1')).freeGenerationsUsed).toBe(3)
  })

  it('verbruikt niets wanneer PDF-generatie mislukt', async () => {
    const access = await authorizeGeneration('account-1', 'workbook')
    await finalizeGeneration('account-1', access.reservationId!, false)

    expect(await getEntitlementState('account-1')).toMatchObject({
      freeGenerationsUsed: 0,
      creditBalance: 0,
      pendingFree: 0,
    })
  })

  it('verwerkt een aankoop idempotent en onderscheidt werkblad en werkboekje', async () => {
    await fulfillPurchase('account-1', 'stripe', 'checkout-1', 5)
    await fulfillPurchase('account-1', 'stripe', 'checkout-1', 5)
    const purchasedState = await getEntitlementState('account-1')
    expect(purchasedState.creditBalance).toBe(5)

    purchasedState.freeGenerationsUsed = 3
    redis.set('account-entitlement:account-1', JSON.stringify(purchasedState))
    expect(evaluateGenerationAccess(purchasedState, 'worksheet')).toMatchObject({ creditCost: 1, allowed: true })
    expect(evaluateGenerationAccess(purchasedState, 'workbook')).toMatchObject({ creditCost: 3, allowed: true })

    const workbook = await authorizeGeneration('account-1', 'workbook')
    await finalizeGeneration('account-1', workbook.reservationId!, true)
    expect((await getEntitlementState('account-1')).creditBalance).toBe(2)
  })

  it('blokkeert een werkboekje bij onvoldoende credits', () => {
    expect(evaluateGenerationAccess({
      freeGenerationsUsed: 3,
      creditBalance: 2,
      pendingFree: 0,
      pendingCredits: 0,
      subscriptionStatus: 'none',
      updatedAt: new Date().toISOString(),
    }, 'workbook')).toMatchObject({ allowed: false, reason: 'payment_required', creditCost: 3 })
  })
})
