import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  getLibrary: vi.fn(async () => []),
  getSessionAccount: vi.fn(),
  isTrustedRequest: vi.fn(() => true),
  saveLibrary: vi.fn(),
}))
vi.mock('../server/accountStore.js', () => store)

import handler from './library'

beforeEach(() => {
  vi.clearAllMocks()
  store.getSessionAccount.mockResolvedValue({ id: 'account-1', email: 'test@example.com' })
  store.getLibrary.mockResolvedValue([])
})

describe('library endpoint', () => {
  it('weigert anonieme opslag', async () => {
    store.getSessionAccount.mockResolvedValue(undefined)
    const response = await handler.fetch(new Request('https://example.test/api/library'))
    expect(response.status).toBe(401)
  })

  it('normaliseert en bewaart een werkblad', async () => {
    const response = await handler.fetch(new Request('https://example.test/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Spelling groep 4', kind: 'worksheet', group: '4', exercises: ['spelling'],
        settings: { group: '4' }, items: [{ question: 'Vul aan: b__m', answer: 'boom' }], pageCount: 1,
      }),
    }))

    expect(response.status).toBe(201)
    expect(store.saveLibrary).toHaveBeenCalledWith('account-1', [expect.objectContaining({
      title: 'Spelling groep 4', favorite: false, items: [{ question: 'Vul aan: b__m', answer: 'boom' }],
    })])
  })
})
