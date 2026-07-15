import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorksheetFeedback from './WorksheetFeedback.vue'

describe('WorksheetFeedback', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('verstuurt uitsluitend gestructureerde metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(WorksheetFeedback, {
      props: {
        requestId: '76cded37-9793-4c5d-a7eb-df681a30385d',
        group: '4',
        exercise: 'contextsommen',
        itemIndex: 2,
      },
    })

    await wrapper.get('select').setValue('unclear')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
      body: JSON.stringify({
        requestId: '76cded37-9793-4c5d-a7eb-df681a30385d',
        group: '4',
        exercise: 'contextsommen',
        itemIndex: 2,
        category: 'unclear',
      }),
    }))
    expect(wrapper.text()).toContain('Feedback voor opdracht 2 is ontvangen')
  })
})
