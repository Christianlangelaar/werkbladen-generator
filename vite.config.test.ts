import { describe, expect, it } from 'vitest'
import { RequestError, validateWorksheetRequest } from './vite.config'

describe('validateWorksheetRequest', () => {
  it('normaliseert een geldig verzoek', () => {
    expect(validateWorksheetRequest({
      group: '4',
      exercise: 'contextsommen',
      amount: 10,
      layout: 'default',
      theme: 'Ruimte',
      difficulty: 'Uitdagender',
    })).toEqual({
      group: '4',
      exercise: 'contextsommen',
      amount: 10,
      layout: 'default',
      theme: 'Ruimte',
      difficulty: 'Uitdagender',
    })
  })

  it.each([
    ['een onbekende groep', { group: '9', exercise: 'contextsommen', amount: 10, layout: 'default' }],
    ['een oefensoort uit een andere groep', { group: '4', exercise: 'breuken', amount: 10, layout: 'default' }],
    ['een decimaal aantal', { group: '4', exercise: 'contextsommen', amount: 1.5, layout: 'default' }],
    ['een ongeschikte layout', { group: '4', exercise: 'contextsommen', amount: 10, layout: 'compact-arithmetic' }],
    ['een te groot aantal', { group: '4', exercise: 'contextsommen', amount: 51, layout: 'default' }],
  ])('weigert %s', (_description, request) => {
    expect(() => validateWorksheetRequest(request)).toThrow(RequestError)
  })

  it('behoudt een bruikbare statuscode bij validatiefouten', () => {
    try {
      validateWorksheetRequest({ group: '99' })
    } catch (error) {
      expect(error).toBeInstanceOf(RequestError)
      expect((error as RequestError).statusCode).toBe(400)
    }
  })
})
