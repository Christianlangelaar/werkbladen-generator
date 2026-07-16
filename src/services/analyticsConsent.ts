export type AnalyticsConsent = 'granted' | 'denied'

const analyticsConsentStorageKey = 'worksheet-generator-analytics-consent'

export function getAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const storedConsent = window.localStorage.getItem(analyticsConsentStorageKey)
    return storedConsent === 'granted' || storedConsent === 'denied' ? storedConsent : null
  } catch {
    return null
  }
}
export function setAnalyticsConsent(consent: AnalyticsConsent) {
  try {
    window.localStorage.setItem(analyticsConsentStorageKey, consent)
  } catch {
    // A blocked localStorage keeps consent limited to the current page load.
  }
}
