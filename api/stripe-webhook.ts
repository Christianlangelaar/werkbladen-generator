import Stripe from 'stripe'
import { fulfillPurchase } from '../server/entitlementStore.js'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
})

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Methode niet toegestaan.' }, 405)
    const secretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    const signature = request.headers.get('stripe-signature')
    if (!secretKey || !webhookSecret || !signature) return json({ error: 'Webhook is niet geconfigureerd.' }, 503)
    try {
      const stripe = new Stripe(secretKey)
      const event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret)
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        const accountId = session.metadata?.accountId
        const credits = Number(session.metadata?.credits)
        if (session.payment_status !== 'paid' || !accountId || !Number.isInteger(credits) || credits <= 0) {
          return json({ error: 'Ongeldige betaalgegevens.' }, 400)
        }
        await fulfillPurchase(accountId, 'stripe', session.id, credits)
      }
      return json({ received: true })
    } catch (error) {
      console.error('Stripe-webhook mislukt.', error)
      return json({ error: 'Ongeldige webhookhandtekening.' }, 400)
    }
  },
}
