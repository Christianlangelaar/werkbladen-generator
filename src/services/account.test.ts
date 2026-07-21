import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAccount, requestLoginCode, saveGeneratedWorksheet } from './account'

afterEach(() => vi.unstubAllGlobals())

describe('account client', () => {
  it('behandelt een anonieme bezoeker zonder foutmelding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
    await expect(getAccount()).resolves.toBeUndefined()
  })

  it('vraagt een inlogcode aan zonder het antwoord te lekken', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(requestLoginCode('test@example.com')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith('/api/auth', expect.objectContaining({ method: 'POST' }))
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('request-code')
  })

  it('slaat voor ingelogde gebruikers werkbladinhoud op', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ item: { id: 'item-1' } }, { status: 201 })))
    await expect(saveGeneratedWorksheet({
      title: 'Werkblad', kind: 'worksheet', group: '4', exercises: ['spelling'], settings: {}, items: [], pageCount: 1,
    })).resolves.toMatchObject({ item: { id: 'item-1' } })
  })
})
