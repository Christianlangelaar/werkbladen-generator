import { beforeEach, describe, expect, it } from 'vitest'
import { getAnalyticsConsent, setAnalyticsConsent } from './analyticsConsent'

describe('analytics-toestemming', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('geeft zonder keuze geen toestemming', () => {
    expect(getAnalyticsConsent()).toBeNull()
  })

  it.each(['granted', 'denied'] as const)('bewaart de keuze %s', (consent) => {
    setAnalyticsConsent(consent)
    expect(getAnalyticsConsent()).toBe(consent)
  })

  it('negeert onbekende opgeslagen waarden', () => {
    window.localStorage.setItem('worksheet-generator-analytics-consent', 'unknown')
    expect(getAnalyticsConsent()).toBeNull()
  })
})
