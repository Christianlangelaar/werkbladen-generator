import { describe, expect, it } from 'vitest'
import { validateWorksheetPairs } from './worksheetQuality'

describe('validateWorksheetPairs', () => {
  it('weigert dubbele vragen ondanks afwijkende nummering en interpunctie', () => {
    const result = validateWorksheetPairs(
      ['1. Wat is 4 + 4?', '9. Wat is 4 + 4!'],
      ['1. 8', '9. acht'],
      2,
    )

    expect(result.pairs).toEqual([{ question: 'Wat is 4 + 4?', answer: '8' }])
    expect(result.report.duplicates).toBe(1)
  })

  it('weigert ontbrekende, nietszeggende en ongeschikte inhoud', () => {
    const result = validateWorksheetPairs(
      ['Goede vraag?', 'Nog een vraag?', 'Een vraag over cocaïne'],
      ['Goed antwoord', 'geen antwoord', 'Ongepaste uitleg'],
      3,
    )

    expect(result.pairs).toHaveLength(1)
    expect(result.report).toMatchObject({ accepted: 1, incomplete: 1, inappropriate: 1 })
  })

  it('weigert aantoonbaar foutieve antwoorden bij compacte sommen', () => {
    const result = validateWorksheetPairs(
      ['1. 8 × 7 =', '2. 18 : 3 ='],
      ['1. 54', '2. 6'],
      2,
      true,
    )

    expect(result.pairs).toEqual([{ question: '18 : 3 =', answer: '6' }])
    expect(result.report.incorrect).toBe(1)
  })

  it.each([
    ['3', 'contextsommen'],
    ['5', 'werkwoordspelling'],
    ['6', 'breuken'],
    ['7', 'engels-woordenschat'],
    ['8', 'samenvatten'],
  ])('accepteert representatieve inhoud voor groep %s en %s', (group, exercise) => {
    const questions = [`1. Passende opdracht voor groep ${group} over ${exercise}?`]
    const answers = ['1. Een controleerbaar antwoord.']

    expect(validateWorksheetPairs(questions, answers, 1).report).toEqual({
      accepted: 1,
      duplicates: 0,
      incomplete: 0,
      inappropriate: 0,
      incorrect: 0,
    })
  })
})
