import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAnalyticsProvider, track } from './analytics'
import { disablePostHogAnalytics, enablePostHogAnalytics } from './posthogAnalytics'

const posthog = vi.hoisted(() => ({
  capture: vi.fn(),
  clear_opt_in_out_capturing: vi.fn(),
  init: vi.fn(),
  opt_out_capturing: vi.fn(),
}))

vi.mock('posthog-js', () => ({ default: posthog }))

describe('PostHog analytics-provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAnalyticsProvider()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('blijft no-op zonder project key', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '')

    await expect(enablePostHogAnalytics()).resolves.toBe(false)
    expect(posthog.init).not.toHaveBeenCalled()
  })

  it('schakelt alleen expliciete events in met privacyvriendelijke instellingen', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_project_key')
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://eu.i.posthog.com')

    await expect(enablePostHogAnalytics()).resolves.toBe(true)
    expect(posthog.init).toHaveBeenCalledWith('phc_project_key', expect.objectContaining({
      api_host: 'https://eu.i.posthog.com',
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
      person_profiles: 'never',
      respect_dnt: true,
    }))
    expect(posthog.clear_opt_in_out_capturing).toHaveBeenCalledOnce()

    track('generation_started', {
      outputType: 'worksheet',
      group: '4',
      exercises: ['contextsommen'],
      theme: null,
    })
    expect(posthog.capture).toHaveBeenCalledWith('generation_started', {
      outputType: 'worksheet',
      group: '4',
      exercises: ['contextsommen'],
      theme: null,
      $ip: null,
    })
  })

  it('herstelt de no-op provider wanneer toestemming wordt ingetrokken', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_project_key')
    await enablePostHogAnalytics()
    disablePostHogAnalytics()
    posthog.capture.mockClear()

    track('pdf_downloaded', {
      outputType: 'workbook',
      group: '7',
      exercises: ['breuken'],
      theme: 'Ruimte',
      source: 'openai',
    })

    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce()
    expect(posthog.capture).not.toHaveBeenCalled()
  })
})
