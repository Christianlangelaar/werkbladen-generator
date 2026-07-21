export type Account = {
  id: string
  email: string
  createdAt: string
  plan: 'free'
  purchases: string[]
}

export type LibraryItem = {
  id: string
  title: string
  kind: 'worksheet' | 'workbook'
  group: string
  exercises: string[]
  settings: Record<string, unknown>
  items: Array<{ question: string, answer: string }>
  pageCount: number
  favorite: boolean
  createdAt: string
  updatedAt: string
}

async function responseJson<T>(response: Response) {
  const body = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(body.error || 'Er ging iets mis.')
  return body
}

export async function getAccount() {
  const response = await fetch('/api/auth', { headers: { Accept: 'application/json' } })
  if (response.status === 401) return undefined
  return responseJson<{ account: Account, library: LibraryItem[] }>(response)
}

export async function requestLoginCode(email: string) {
  return responseJson<{ ok: true }>(await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'request-code', email }),
  }))
}

export async function verifyLoginCode(email: string, code: string) {
  return responseJson<{ account: Account, library: LibraryItem[] }>(await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify-code', email, code }),
  }))
}

export async function logout() {
  const response = await fetch('/api/auth', { method: 'DELETE' })
  if (!response.ok) throw new Error('Uitloggen is niet gelukt.')
}

export async function deleteAccount() {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete-account' }),
  })
  if (!response.ok) throw new Error('Je account kon niet worden verwijderd.')
}

export async function saveGeneratedWorksheet(item: Omit<LibraryItem, 'id' | 'favorite' | 'createdAt' | 'updatedAt'>) {
  const response = await fetch('/api/library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (response.status === 401) return undefined
  return responseJson<{ item: LibraryItem }>(response)
}

export async function updateFavorite(id: string, favorite: boolean) {
  return responseJson<{ item: LibraryItem }>(await fetch('/api/library', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, favorite }),
  }))
}

export async function deleteLibraryItem(id: string) {
  const response = await fetch('/api/library', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) throw new Error('Verwijderen is niet gelukt.')
}
