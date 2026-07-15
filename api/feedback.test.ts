import { describe, expect, it } from 'vitest'
import handler from './feedback'

const endpoint = 'https://example.test/api/feedback'
const validFeedback = {
  requestId: '76cded37-9793-4c5d-a7eb-df681a30385d',
  group: '4',
  exercise: 'contextsommen',
  itemIndex: 1,
  category: 'incorrect',
}

function request(body: unknown, method = 'POST') {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': crypto.randomUUID() },
  }
  if (method === 'POST') init.body = JSON.stringify(body)
  return new Request(endpoint, init)
}

describe('worksheet feedback endpoint', () => {
  it('accepteert alleen metadata uit de vaste categorieën', async () => {
    const response = await handler.fetch(request(validFeedback))
    expect(response.status).toBe(204)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('weigert vrije tekst en ongeldige metadata', async () => {
    const response = await handler.fetch(request({ ...validFeedback, category: 'Mijn vrije tekst' }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'De feedback is niet geldig.' })
  })

  it('weigert andere HTTP-methodes', async () => {
    const response = await handler.fetch(request(undefined, 'GET'))
    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('POST')
  })
})
