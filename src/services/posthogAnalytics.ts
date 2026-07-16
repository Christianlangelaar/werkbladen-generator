import { setAnalyticsProvider, type AnalyticsProvider } from './analytics'

type PostHogClient = typeof import('posthog-js')['default']

let posthogClient: PostHogClient | undefined

function connectProvider(posthog: PostHogClient) {
  posthog.clear_opt_in_out_capturing()
  setAnalyticsProvider({
    track: (eventName, properties) => {
      posthog.capture(eventName, { ...properties, $ip: null })
    },
  } satisfies AnalyticsProvider)
}

export function isPostHogConfigured() {
  return Boolean(import.meta.env.VITE_POSTHOG_KEY?.trim())
}

export async function enablePostHogAnalytics() {
  const projectKey = import.meta.env.VITE_POSTHOG_KEY?.trim()
  if (!projectKey) {
    setAnalyticsProvider()
    return false
  }

  if (posthogClient) {
    connectProvider(posthogClient)
    return true
  }

  try {
    const { default: posthog } = await import('posthog-js')
    const apiHost = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://eu.i.posthog.com'

    posthog.init(projectKey, {
      api_host: apiHost,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      advanced_disable_feature_flags: true,
      advanced_disable_feature_flags_on_first_load: true,
      person_profiles: 'never',
      persistence: 'localStorage',
      respect_dnt: true,
    })

    posthogClient = posthog
    connectProvider(posthog)
    return true
  } catch {
    setAnalyticsProvider()
    return false
  }
}

export function disablePostHogAnalytics() {
  setAnalyticsProvider()
  posthogClient?.opt_out_capturing()
}
