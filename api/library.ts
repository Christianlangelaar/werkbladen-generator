import {
  getLibrary,
  getSessionAccount,
  isTrustedRequest,
  saveLibrary,
  type LibraryItem,
} from '../server/accountStore.js'

const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers })

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function parseBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return undefined
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > 256_000) return undefined
  try { return JSON.parse(text) as Record<string, unknown> } catch { return undefined }
}

function createItem(value: Record<string, unknown>): LibraryItem | undefined {
  const title = cleanText(value.title, 80)
  const group = cleanText(value.group, 1)
  const kind = value.kind === 'workbook' ? 'workbook' : 'worksheet'
  const exercises = Array.isArray(value.exercises)
    ? value.exercises.map((item) => cleanText(item, 50)).filter(Boolean).slice(0, 20)
    : []
  const rawItems = Array.isArray(value.items) ? value.items : []
  const items = rawItems.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const question = cleanText(record.question, 2_000)
    const answer = cleanText(record.answer, 2_000)
    return question && answer ? [{ question, answer }] : []
  }).slice(0, 500)
  if (!title || !/^[1-8]$/.test(group) || exercises.length === 0) return undefined
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(), title, kind, group, exercises,
    settings: value.settings && typeof value.settings === 'object' && !Array.isArray(value.settings)
      ? value.settings as Record<string, unknown>
      : {},
    items,
    pageCount: Math.min(Math.max(Number(value.pageCount) || 1, 1), 100),
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
}

export default {
  async fetch(request: Request) {
    if (!isTrustedRequest(request)) return json({ error: 'Ongeldig verzoek.' }, 403)
    try {
      const account = await getSessionAccount(request)
      if (!account) return json({ error: 'Niet ingelogd.' }, 401)
      const library = await getLibrary(account.id)
      if (request.method === 'GET') return json({ library })
      const body = await parseBody(request)
      if (!body) return json({ error: 'Ongeldig verzoek.' }, 400)
      if (request.method === 'POST') {
        const item = createItem(body)
        if (!item) return json({ error: 'Het werkblad is niet geldig.' }, 400)
        const updated = [item, ...library].slice(0, 50)
        await saveLibrary(account.id, updated)
        return json({ item }, 201)
      }
      const id = cleanText(body.id, 64)
      const index = library.findIndex((item) => item.id === id)
      if (index < 0) return json({ error: 'Werkblad niet gevonden.' }, 404)
      if (request.method === 'PATCH') {
        library[index] = { ...library[index]!, favorite: Boolean(body.favorite), updatedAt: new Date().toISOString() }
        await saveLibrary(account.id, library)
        return json({ item: library[index] })
      }
      if (request.method === 'DELETE') {
        await saveLibrary(account.id, library.filter((item) => item.id !== id))
        return json(null, 204)
      }
      return json({ error: 'Methode niet toegestaan.' }, 405)
    } catch (error) {
      console.error('Bibliotheekverzoek mislukt.', error)
      return json({ error: 'De bibliotheek is tijdelijk niet beschikbaar.' }, 503)
    }
  },
}
