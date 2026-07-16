import { afterEach, describe, expect, it, vi } from 'vitest'
import { setAnalyticsProvider, track, type AnalyticsProvider } from './analytics'

const generationContext = {
  outputType: 'worksheet' as const,
  group: '4',
  exercises: ['contextsommen'],
  theme: 'Ruimte',
}

describe('analytics', () => {
  afterEach(() => {
    setAnalyticsProvider()
  })

  it('is standaard een no-op', () => {
    expect(() => track('generation_started', generationContext)).not.toThrow()
  })

  it('stuurt vaste eventnamen en getypeerde properties naar de ingestelde provider', () => {
    const providerTrack = vi.fn()
    setAnalyticsProvider({ track: providerTrack } as AnalyticsProvider)

    track('generation_succeeded', { ...generationContext, source: 'openai' })

    expect(providerTrack).toHaveBeenCalledWith('generation_succeeded', {
      ...generationContext,
      source: 'openai',
    })
  })

  it('laat providerfouten de appflow niet verstoren', async () => {
    const syncProvider = { track: () => { throw new Error('provider unavailable') } } as AnalyticsProvider
    setAnalyticsProvider(syncProvider)
    expect(() => track('generation_failed', {
      ...generationContext,
      errorCategory: 'generation_error',
    })).not.toThrow()

    setAnalyticsProvider({
      track: () => Promise.reject(new Error('provider unavailable')),
    } as AnalyticsProvider)
    expect(() => track('pdf_downloaded', { ...generationContext, source: 'local' })).not.toThrow()
    await Promise.resolve()
  })
})
