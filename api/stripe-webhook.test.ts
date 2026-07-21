import Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const entitlementStore = vi.hoisted(() => ({ fulfillPurchase: vi.fn() }))
vi.mock('../server/entitlementStore.js', () => entitlementStore)
import handler from './stripe-webhook'

const secret = 'whsec_test_secret'
const stripe = new Stripe('sk_test_123')

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123'
  process.env.STRIPE_WEBHOOK_SECRET = secret
  entitlementStore.fulfillPurchase.mockResolvedValue({ created: true })
})

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.STRIPE_WEBHOOK_SECRET
})

function signedRequest(payload: string) {
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret })
  return new Request('https://example.test/api/stripe-webhook', {
    method: 'POST', body: payload, headers: { 'stripe-signature': signature },
  })
}

describe('Stripe webhook', () => {
  it('verwerkt een betaalde creditbundel', async () => {
    const payload = JSON.stringify({
      id: 'evt_1', object: 'event', type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', object: 'checkout.session', payment_status: 'paid', metadata: { accountId: 'account-1', credits: '10' } } },
    })
    const response = await handler.fetch(signedRequest(payload))

    expect(response.status).toBe(200)
    expect(entitlementStore.fulfillPurchase).toHaveBeenCalledWith('account-1', 'stripe', 'cs_1', 10)
  })

  it('weigert een ongeldige webhookhandtekening', async () => {
    const response = await handler.fetch(new Request('https://example.test/api/stripe-webhook', {
      method: 'POST', body: '{}', headers: { 'stripe-signature': 'ongeldig' },
    }))

    expect(response.status).toBe(400)
    expect(entitlementStore.fulfillPurchase).not.toHaveBeenCalled()
  })
})
