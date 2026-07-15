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
    mockedGenerateWorksheetPdf.mockResolvedValue({ source: 'openai', previewUrl: 'blob:worksheet', fileName: 'werkblad.pdf', pageCount: 1 })
    mockedGenerateWorkbookPdf.mockResolvedValue({ source: 'openai', previewUrl: 'blob:workbook', fileName: 'werkboekje.pdf', pageCount: 5 })
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
      previewUrl: 'blob:fallback',
      fileName: 'fallback.pdf',
      pageCount: 1,
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

  it('stelt een werkboek samen met eigen aantallen en volgorde', async () => {
    const wrapper = mount(WorksheetForm)

    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    await wrapper.get('input[aria-label="Contextsommen: pagina\'s"]').setValue(2)
    await wrapper.get('button[aria-label="Contextsommen omlaag"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const sections = mockedGenerateWorkbookPdf.mock.calls[0]?.[1]
    expect(sections?.[0]?.exercise).toBe('begrijpend-lezen')
    expect(sections?.[1]).toEqual({ exercise: 'contextsommen', amount: 20 })
  })

  it('bewaart de samengestelde werkboekonderdelen', async () => {
    const wrapper = mount(WorksheetForm)

    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    await wrapper.get('input[aria-label="Contextsommen: pagina\'s"]').setValue(3)

    const stored = JSON.parse(window.localStorage.getItem('worksheet-generator-settings') ?? '{}')
    expect(stored.workbookItems[0]).toEqual({ exercise: 'contextsommen', pages: 3 })
  })

  it('toont vooraf de verwachte omvang van het werkboek', async () => {
    const wrapper = mount(WorksheetForm)

    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0]?.setValue(true)
    await checkboxes[1]?.setValue(true)

    const summary = wrapper.get('#workbook-summary').text()
    expect(summary).toContain('Werkbladen5')
    expect(summary).toContain('Opdrachten± 153')
    expect(summary).toContain('Antwoorden± 3 pag.')
    expect(summary).toContain('PDF totaal± 9 pag.')
  })

  it('toont eerst een PDF-preview met downloadoptie en kan nog een variant maken', async () => {
    const wrapper = mount(WorksheetForm)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Met AI gegenereerd')
    expect(wrapper.get('iframe').attributes('src')).toBe('blob:worksheet')
    expect(wrapper.get('a[download]').attributes()).toMatchObject({
      href: 'blob:worksheet',
      download: 'werkblad.pdf',
    })

    await wrapper.get('button[aria-expanded="true"]').trigger('click')
    expect(wrapper.find('iframe').exists()).toBe(false)

    const variantButton = wrapper.findAll('button').find((button) => button.text().includes('nog een variant'))

    expect(variantButton).toBeDefined()
    await variantButton?.trigger('click')
    await flushPromises()

    expect(mockedGenerateWorksheetPdf).toHaveBeenCalledTimes(2)
  })
})
