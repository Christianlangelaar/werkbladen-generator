export type GenerationContext = {
  outputType: 'worksheet' | 'workbook'
  group: string
  exercises: string[]
  theme: string | null
}
export type AnalyticsEventProperties = {
  generation_started: GenerationContext
  generation_succeeded: GenerationContext & {
    source: 'openai' | 'fallback' | 'local'
  }
  generation_failed: GenerationContext & {
    errorCategory: 'generation_error'
  }
  pdf_downloaded: GenerationContext & {
    source: 'openai' | 'fallback' | 'local'
  }
}

export type AnalyticsEventName = keyof AnalyticsEventProperties

/**
 * Provider boundary for a future analytics integration. The default provider is
 * deliberately a no-op, so tracking never sends data until one is configured.
 */
export interface AnalyticsProvider {
  track<EventName extends AnalyticsEventName>(
    eventName: EventName,
    properties: AnalyticsEventProperties[EventName],
  ): void | Promise<void>
}

const noOpProvider: AnalyticsProvider = {
  track: () => undefined,
}

let provider: AnalyticsProvider = noOpProvider

export function setAnalyticsProvider(nextProvider?: AnalyticsProvider) {
  provider = nextProvider ?? noOpProvider
}

export function track<EventName extends AnalyticsEventName>(
  eventName: EventName,
  properties: AnalyticsEventProperties[EventName],
) {
  try {
    Promise.resolve(provider.track(eventName, properties)).catch(() => undefined)
  } catch {
    // Analytics must never interrupt worksheet generation or downloading.
  }
}
