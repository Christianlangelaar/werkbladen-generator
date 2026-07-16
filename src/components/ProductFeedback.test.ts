import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProductFeedback from './ProductFeedback.vue'
import { setAnalyticsProvider, type AnalyticsProvider } from '../services/analytics'

describe('ProductFeedback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setAnalyticsProvider()
  })

  it('verstuurt feedback met technische context en registreert het analytics-event', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 202 }))
    const providerTrack = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    setAnalyticsProvider({ track: providerTrack } as AnalyticsProvider)
    const wrapper = mount(ProductFeedback)

    await wrapper.get('#feedback-type').setValue('feature')
    await wrapper.get('#feedback-message').setValue('Ik mis een printvriendelijke variant.')
    await wrapper.get('#feedback-email').setValue('ouder@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    expect(body).toMatchObject({
      type: 'feature',
      message: 'Ik mis een printvriendelijke variant.',
      email: 'ouder@example.com',
      website: '',
      context: expect.objectContaining({
        appVersion: '0.0.0',
        route: '/',
      }),
    })
    expect(body.feedbackId).toMatch(/^[0-9a-f-]{36}$/)
    expect(providerTrack).toHaveBeenCalledWith('feedback_submitted', { type: 'feature' })
    expect(wrapper.text()).toContain('Bedankt, je feedback is verstuurd.')
    expect(wrapper.get<HTMLTextAreaElement>('#feedback-message').element.value).toBe('')
  })

  it('behoudt invoer wanneer verzenden mislukt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Feedbackmail is nog niet geconfigureerd.' }),
      { status: 503 },
    )))
    const wrapper = mount(ProductFeedback)

    await wrapper.get('#feedback-message').setValue('Deze tekst mag niet verdwijnen.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Feedbackmail is nog niet geconfigureerd.')
    expect(wrapper.get<HTMLTextAreaElement>('#feedback-message').element.value).toBe('Deze tekst mag niet verdwijnen.')
  })
})
