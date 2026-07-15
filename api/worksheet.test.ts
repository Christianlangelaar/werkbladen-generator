import { afterEach, describe, expect, it } from 'vitest'
import handler from './worksheet'

const endpoint = 'https://example.test/api/worksheet'
const originalApiKey = process.env.OPENAI_API_KEY

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey
})

function request(body: unknown, method = 'POST', clientIdentifier?: string) {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(clientIdentifier ? { 'X-Forwarded-For': clientIdentifier } : {}),
    },
  }

  if (method === 'POST') init.body = JSON.stringify(body)

  return new Request(endpoint, init)
}

describe('production worksheet endpoint', () => {
  it('weigert andere HTTP-methodes', async () => {
    const response = await handler.fetch(request(undefined, 'GET'))

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('POST')
  })

  it('valideert verzoeken voordat OpenAI wordt aangeroepen', async () => {
    const response = await handler.fetch(request({ group: '99' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Kies een geldige groep.' })
  })

  it('geeft een veilige melding als de API-sleutel ontbreekt', async () => {
    delete process.env.OPENAI_API_KEY
    const response = await handler.fetch(request({
      group: '4',
      exercise: 'contextsommen',
      amount: 2,
      layout: 'default',
    }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'De werkbladgenerator is tijdelijk niet beschikbaar.',
    })
  })

  it('begrenst het aantal verzoeken per client', async () => {
    delete process.env.OPENAI_API_KEY
    const body = {
      group: '4',
      exercise: 'contextsommen',
      amount: 2,
      layout: 'default',
    }

    for (let requestNumber = 0; requestNumber < 20; requestNumber += 1) {
      const response = await handler.fetch(request(body, 'POST', 'rate-limit-test'))
      expect(response.status).toBe(503)
    }

    const response = await handler.fetch(request(body, 'POST', 'rate-limit-test'))

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(response.headers.get('ratelimit-remaining')).toBe('0')
    await expect(response.json()).resolves.toEqual({
      error: 'Je hebt te veel werkbladen kort na elkaar aangevraagd. Probeer het over een minuut opnieuw.',
    })
  })
})
