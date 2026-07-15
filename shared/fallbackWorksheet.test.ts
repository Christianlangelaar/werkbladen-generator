import { describe, expect, it } from 'vitest'
import { createFallbackWorksheetContent } from './fallbackWorksheet'

const exercises = [
  'contextsommen', 'eindtoets-rekenen', 'begrijpend-lezen', 'woordenschat',
  'spelling', 'werkwoordspelling', 'grammatica', 'leestekens', 'rijmen',
  'samenvatten', 'engels-woordenschat', 'breuken', 'procenten',
  'verhoudingen', 'kommagetallen', 'schaal',
]

describe('createFallbackWorksheetContent', () => {
  it.each(exercises)('maakt bruikbare vragen en antwoorden voor %s', (exercise) => {
    const content = createFallbackWorksheetContent('7', exercise, 6)

    expect(content.questions).toHaveLength(6)
    expect(content.answers).toHaveLength(6)
    expect(content.questions.every((question) => question.length > 12)).toBe(true)
    expect(content.answers.every((answer) => answer.length > 3)).toBe(true)
    expect(content.questions.join(' ')).not.toContain('____________')
    expect(content.answers.join(' ')).not.toContain('niet beschikbaar')
  })

  it('nummering blijft doorlopen bij aangevulde content', () => {
    const content = createFallbackWorksheetContent('4', 'woordenschat', 2, 3)

    expect(content.questions[0]).toMatch(/^4\./)
    expect(content.answers[1]).toMatch(/^5\./)
  })

  it('levert controleerbare antwoorden voor contextsommen', () => {
    const content = createFallbackWorksheetContent('4', 'contextsommen', 2)

    expect(content.questions[0]).toContain('12 stickers')
    expect(content.answers[0]).toBe('1. 15')
    expect(content.questions[1]).toContain('boeken')
    expect(content.answers[1]).toBe('2. 19')
  })
})
