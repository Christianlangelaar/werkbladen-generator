import {
  authorizeGeneration,
  finalizeGeneration,
  getCreditCost,
  getEntitlementState,
  paymentsBypassed,
  type ProductType,
} from '../server/entitlementStore.js'
import { getSessionAccount, isTrustedRequest } from '../server/accountStore.js'

const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

async function parseBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return undefined
  try { return await request.json() as Record<string, unknown> } catch { return undefined }
}

function summary(state: Awaited<ReturnType<typeof getEntitlementState>>) {
  return {
    freeGenerationsUsed: state.freeGenerationsUsed,
    freeGenerationsRemaining: Math.max(0, 3 - state.freeGenerationsUsed - state.pendingFree),
    creditBalance: state.creditBalance,
    worksheetCreditCost: getCreditCost('worksheet'),
    workbookCreditCost: getCreditCost('workbook'),
    paymentsConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CREDIT_BUNDLE_PRICE_ID),
  }
}

export default {
  async fetch(request: Request) {
    if (!isTrustedRequest(request)) return json({ error: 'Ongeldig verzoek.' }, 403)
    if (paymentsBypassed()) {
      return json({ bypassed: true, allowed: true, reason: 'free', ...summary({
        freeGenerationsUsed: 0, creditBalance: 0, pendingFree: 0, pendingCredits: 0,
        subscriptionStatus: 'none', updatedAt: new Date().toISOString(),
      }) })
    }
    try {
      const account = await getSessionAccount(request)
      if (!account) return json({ error: 'Log in om je gratis tegoed en credits te gebruiken.' }, 401)
      if (request.method === 'GET') return json(summary(await getEntitlementState(account.id)))
      if (request.method !== 'POST') return json({ error: 'Methode niet toegestaan.' }, 405)
      const body = await parseBody(request)
      if (!body) return json({ error: 'Ongeldig verzoek.' }, 400)
      if (body.action === 'authorize') {
        const productType: ProductType = body.productType === 'workbook' ? 'workbook' : 'worksheet'
        const access = await authorizeGeneration(account.id, productType)
        return json({ ...access, ...summary(access.state) }, access.allowed ? 200 : 402)
      }
      if (body.action === 'finalize' && typeof body.reservationId === 'string') {
        return json(summary(await finalizeGeneration(account.id, body.reservationId, body.succeeded === true)))
      }
      return json({ error: 'Ongeldig verzoek.' }, 400)
    } catch (error) {
      console.error('Entitlementverzoek mislukt.', error)
      return json({ error: 'Je gebruikstegoed kon niet worden gecontroleerd.' }, 503)
    }
  },
}
