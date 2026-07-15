import { describe, expect, it, vi } from 'vitest'
import { generateWorksheetContent, normalizeWorksheetOutput } from './generateWorksheetContent'
import type { ValidatedWorksheetRequest } from './worksheetRequest'

const request: ValidatedWorksheetRequest = {
  group: '4',
  exercise: 'contextsommen',
  amount: 3,
  layout: 'default',
}

describe('shared worksheet generation', () => {
  it('normaliseert nummering en vult onvolledige modeloutput aan', () => {
    const content = normalizeWorksheetOutput(JSON.stringify({
      questions: ['9. Eerste vraag?'],
      answers: ['9. Eerste antwoord.'],
    }), request)

    expect(content.questions).toHaveLength(3)
    expect(content.answers).toHaveLength(3)
    expect(content.questions[0]).toBe('1. Eerste vraag?')
    expect(content.questions[1]).toMatch(/^2\. /)
    expect(content.answers[1]).toMatch(/^2\. /)
  })

  it('vervangt dubbele en onbruikbare modelinhoud door gecontroleerde fallback', () => {
    const content = normalizeWorksheetOutput(JSON.stringify({
      questions: ['1. Wat is 4 + 4?', '2. Wat is 4 + 4!', '3. Ongeschikte vraag over cocaïne'],
      answers: ['1. 8', '2. acht', '3. Uitleg'],
    }), request)

    expect(content.questions).toHaveLength(3)
    expect(content.questions[0]).toBe('1. Wat is 4 + 4?')
    expect(content.questions[1]).not.toContain('Wat is 4 + 4')
    expect(content.questions.join(' ')).not.toContain('cocaïne')
    expect(content.answers).toHaveLength(3)
  })

  it('gebruikt dezelfde prompt, modelkeuze en normalisatie voor iedere server', async () => {
    const generateOutput = vi.fn().mockResolvedValue(JSON.stringify({
      questions: ['Vraag 1', 'Vraag 2', 'Vraag 3'],
      answers: ['Antwoord 1', 'Antwoord 2', 'Antwoord 3'],
    }))

    const content = await generateWorksheetContent(request, 'test-key', 'test-model', generateOutput)

    expect(generateOutput).toHaveBeenCalledWith(expect.stringContaining('contextsommen'), 'test-model', 'test-key')
    expect(content).toEqual({
      questions: ['1. Vraag 1', '2. Vraag 2', '3. Vraag 3'],
      answers: ['1. Antwoord 1', '2. Antwoord 2', '3. Antwoord 3'],
    })
  })
})
