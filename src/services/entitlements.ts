export type EntitlementSummary = {
  freeGenerationsUsed: number
  freeGenerationsRemaining: number
  creditBalance: number
  worksheetCreditCost: number
  workbookCreditCost: number
  paymentsConfigured: boolean
}

export type GenerationAuthorization = EntitlementSummary & {
  allowed: boolean
  reason: 'free' | 'credits' | 'payment_required'
  reservationId?: string
  bypassed?: boolean
  error?: string
}

async function read<T>(response: Response) {
  return await response.json().catch(() => ({})) as T & { error?: string }
}

export async function authorizeGeneration(productType: 'worksheet' | 'workbook') {
  const response = await fetch('/api/entitlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'authorize', productType }),
  })
  const result = await read<GenerationAuthorization>(response)
  if (response.status === 402) return result
  if (!response.ok) throw new Error(result.error || 'Je gebruikstegoed kon niet worden gecontroleerd.')
  return result
}

export async function finalizeGeneration(reservationId: string | undefined, succeeded: boolean) {
  if (!reservationId) return
  await fetch('/api/entitlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'finalize', reservationId, succeeded }),
  })
}

export async function startCreditCheckout() {
  const response = await fetch('/api/payments', { method: 'POST' })
  const result = await read<{ url?: string }>(response)
  if (!response.ok || !result.url) throw new Error(result.error || 'Betalen is tijdelijk niet beschikbaar.')
  window.location.assign(result.url)
}
