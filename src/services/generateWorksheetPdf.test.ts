import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateWorkbookPdf, generateWorksheetPdf } from './generateWorksheetPdf'

function worksheetResponse(amount: number) {
  return new Response(JSON.stringify({
    questions: Array.from({ length: amount }, (_, index) => `${index + 1}. Vraag ${index + 1}`),
    answers: Array.from({ length: amount }, (_, index) => `${index + 1}. Antwoord ${index + 1}`),
    source: 'openai',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('PDF page regressions', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:pdf-test'),
    })
  })

  it('maakt één telpagina plus één antwoordenpagina', async () => {
    const result = await generateWorksheetPdf('2', 'tellen-dobbelsteen', 6, 'counting', undefined, undefined, true)

    expect(result).toMatchObject({ source: 'local', pageCount: 2 })
  })

  it('verdeelt een motoriekwerkblad exact over het verwachte aantal pagina’s', async () => {
    const result = await generateWorksheetPdf('2', 'lijnen-overtrekken', 10)

    expect(result).toMatchObject({ source: 'local', pageCount: 2 })
  })

  it('bewaakt voorblad, gemengde werkbladen en antwoorden in één werkboek', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { amount: number }
      return worksheetResponse(body.amount)
    }))

    const result = await generateWorkbookPdf(
      '4',
      [
        { exercise: 'contextsommen', amount: 10 },
        { exercise: 'optellen', amount: 100 },
      ],
      true,
      true,
    )

    expect(result).toMatchObject({ source: 'openai', pageCount: 5 })
  })
})
