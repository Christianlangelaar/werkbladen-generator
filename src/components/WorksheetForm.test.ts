import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorksheetForm from './WorksheetForm.vue'
import { generateWorkbookPdf, generateWorksheetPdf } from '../services/generateWorksheetPdf'

vi.mock('../services/generateWorksheetPdf', () => ({
  generateWorksheetPdf: vi.fn(),
  generateWorkbookPdf: vi.fn(),
}))

const mockedGenerateWorksheetPdf = vi.mocked(generateWorksheetPdf)
const mockedGenerateWorkbookPdf = vi.mocked(generateWorkbookPdf)

describe('WorksheetForm', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockedGenerateWorksheetPdf.mockResolvedValue({ source: 'openai' })
    mockedGenerateWorkbookPdf.mockResolvedValue({ source: 'openai' })
  })

  it('koppelt alle zichtbare selectvelden aan hun labels', () => {
    const wrapper = mount(WorksheetForm)

    expect(wrapper.get('label[for="group"]').text()).toBe('Groep')
    expect(wrapper.get('label[for="exercise"]').text()).toBe('Oefensoort')
    expect(wrapper.get('label[for="theme"]').text()).toBe('Thema')
    expect(wrapper.get('label[for="difficulty"]').text()).toBe('Moeilijkheid')
  })

  it('past de oefensoorten aan wanneer de groep verandert', async () => {
    const wrapper = mount(WorksheetForm)

    await wrapper.get('#group').setValue('5')

    expect(wrapper.get('#exercise').text()).toContain('Vermenigvuldigen')
    expect(wrapper.get('#exercise').text()).toContain('Werkwoordspelling')
    expect(wrapper.get('#exercise').text()).not.toContain('Tafels')
  })

  it('bewaart gewijzigde instellingen in localStorage', async () => {
    const wrapper = mount(WorksheetForm)

    await wrapper.get('#group').setValue('7')
    await wrapper.get('#exercise').setValue('breuken')

    const stored = JSON.parse(window.localStorage.getItem('worksheet-generator-settings') ?? '{}')

    expect(stored.group).toBe('7')
    expect(stored.exercise).toBe('breuken')
  })

  it('blokkeert genereren bij een ongeldig aantal', async () => {
    const wrapper = mount(WorksheetForm)

    await wrapper.get('#assignment-amount').setValue(0)
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Kies minimaal 1 opdracht.')
    expect(mockedGenerateWorksheetPdf).not.toHaveBeenCalled()
  })

  it('toont een melding wanneer standaardcontent is gebruikt', async () => {
    mockedGenerateWorksheetPdf.mockResolvedValue({
      source: 'fallback',
      warning: 'Er is standaardcontent gebruikt.',
    })
    const wrapper = mount(WorksheetForm)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toBe('Er is standaardcontent gebruikt.')
  })

  it('genereert een werkboekje in werkboekmodus', async () => {
    const wrapper = mount(WorksheetForm)

    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockedGenerateWorkbookPdf).toHaveBeenCalledOnce()
    expect(mockedGenerateWorksheetPdf).not.toHaveBeenCalled()
  })
})
