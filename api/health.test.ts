import { describe, expect, it } from 'vitest'
import handler from './health'

describe('health endpoint', () => {
  it('geeft een minimale succesvolle status terug', async () => {
    const response = await handler.fetch(new Request('https://example.test/api/health'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      checks: { openaiConfigured: false, distributedRateLimitConfigured: false },
    })
  })

  it('meldt een ontbrekende AI-configuratie in readiness-modus', async () => {
    const response = await handler.fetch(new Request('https://example.test/api/health?readiness=1'))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ status: 'degraded' })
  })

  it('weigert andere methodes', async () => {
    const response = await handler.fetch(new Request('https://example.test/api/health', { method: 'POST' }))

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET')
  })
})
