import { beforeEach, describe, expect, it, vi } from 'vitest'

const checkoutCreate = vi.hoisted(() => vi.fn())
const accountStore = vi.hoisted(() => ({
  getSessionAccount: vi.fn(),
  isTrustedRequest: vi.fn(() => true),
}))
const entitlementStore = vi.hoisted(() => ({
  getCreditCost: vi.fn((product: string) => product === 'workbook' ? 3 : 1),
  getEntitlementState: vi.fn(async () => ({ creditBalance: 2 })),
}))

vi.mock('stripe', () => ({
  default: class Stripe {
    checkout = { sessions: { create: checkoutCreate } }
  },
}))
vi.mock('../server/accountStore.js', () => accountStore)
vi.mock('../server/entitlementStore.js', () => entitlementStore)
import handler from './payments'

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123'
  process.env.STRIPE_CREDIT_BUNDLE_PRICE_ID = 'price_test'
  process.env.STRIPE_CREDIT_BUNDLE_CREDITS = '10'
  process.env.APP_URL = 'https://example.test'
  accountStore.getSessionAccount.mockResolvedValue({ id: 'account-1', email: 'test@example.com' })
  checkoutCreate.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' })
})

describe('payments endpoint', () => {
  it('maakt een Stripe Checkout-sessie voor de geconfigureerde creditbundel', async () => {
    const response = await handler.fetch(new Request('https://example.test/api/payments', { method: 'POST' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      url: 'https://checkout.stripe.test/cs_1', credits: 10, worksheetCreditCost: 1, workbookCreditCost: 3,
    })
    expect(checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      line_items: [{ price: 'price_test', quantity: 1 }],
      metadata: { accountId: 'account-1', credits: '10', product: 'credit_bundle' },
    }), expect.objectContaining({ idempotencyKey: expect.stringMatching(/^checkout:account-1:/) }))
  })

  it('vereist een account voor betaald gebruik', async () => {
    accountStore.getSessionAccount.mockResolvedValue(undefined)
    const response = await handler.fetch(new Request('https://example.test/api/payments', { method: 'POST' }))
    expect(response.status).toBe(401)
  })
})
