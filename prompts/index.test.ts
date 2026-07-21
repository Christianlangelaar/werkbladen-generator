import { describe, expect, it } from 'vitest'
import { getWorksheetPrompt } from './index'

describe('getWorksheetPrompt', () => {
  it('voegt het antwoordmodel en het juiste aantal opdrachten toe', () => {
    const prompt = getWorksheetPrompt('4', 'contextsommen', 6)

    expect(prompt).toContain('6')
    expect(prompt).toContain('"questions"')
    expect(prompt).toContain('"answers"')
    expect(prompt).toContain('aanwijzing, context en zichtbare letters')
  })

  it('vereist eenduidige woordaanvullingen met een volledig antwoord', () => {
    const prompt = getWorksheetPrompt('4', 'spelling', 6)

    expect(prompt).toContain('volledige, eenduidige voorbeeldzin')
    expect(prompt).toContain('volledig aangevulde woord')
  })

  it('voegt een ondersteund thema en moeilijkheid toe', () => {
    const prompt = getWorksheetPrompt('4', 'contextsommen', 4, 'Ruimte', 'Uitdagender')

    expect(prompt).toContain('thema "Ruimte"')
    expect(prompt).toContain('iets uitdagender')
  })

  it('gebruikt een veilige algemene prompt voor een onbekende combinatie', () => {
    const prompt = getWorksheetPrompt('8', 'onbekend', 3)

    expect(prompt).toContain('Maak 3 korte onbekend voor groep 8')
    expect(prompt).toContain('Nederlandse basisschoolniveau')
  })
})
