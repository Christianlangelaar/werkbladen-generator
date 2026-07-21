import Stripe from 'stripe'
import { getSessionAccount, isTrustedRequest } from '../server/accountStore.js'
import { getCreditCost, getEntitlementState } from '../server/entitlementStore.js'

const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe is niet geconfigureerd.')
  return new Stripe(key)
}

export default {
  async fetch(request: Request) {
    if (!isTrustedRequest(request)) return json({ error: 'Ongeldig verzoek.' }, 403)
    try {
      const account = await getSessionAccount(request)
      if (!account) return json({ error: 'Log in om credits te kopen.' }, 401)
      if (request.method !== 'POST') return json({ error: 'Methode niet toegestaan.' }, 405)
      const priceId = process.env.STRIPE_CREDIT_BUNDLE_PRICE_ID
      const credits = Number(process.env.STRIPE_CREDIT_BUNDLE_CREDITS)
      const appUrl = process.env.APP_URL || new URL(request.url).origin
      if (!priceId || !Number.isInteger(credits) || credits <= 0) {
        return json({ error: 'Betalen is nog niet geconfigureerd.' }, 503)
      }
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: account.email,
        client_reference_id: account.id,
        metadata: { accountId: account.id, credits: String(credits), product: 'credit_bundle' },
        success_url: `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/?payment=cancelled`,
      }, { idempotencyKey: `checkout:${account.id}:${crypto.randomUUID()}` })
      if (!session.url) throw new Error('Stripe Checkout gaf geen URL terug.')
      return json({
        url: session.url,
        credits,
        creditBalance: (await getEntitlementState(account.id)).creditBalance,
        worksheetCreditCost: getCreditCost('worksheet'),
        workbookCreditCost: getCreditCost('workbook'),
      })
    } catch (error) {
      console.error('Checkout starten mislukt.', error)
      return json({ error: 'Betalen is tijdelijk niet beschikbaar.' }, 503)
    }
  },
}
