import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
  await page.goto('/')
})

test('maakt een werkblad en meldt gebruikte fallbackcontent', async ({ page }) => {
  await page.getByLabel('Groep', { exact: true }).selectOption('4')
  await page.getByLabel('Oefensoort', { exact: true }).selectOption('contextsommen')
  await page.getByLabel('Aantal opdrachten', { exact: true }).fill('2')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Maak werkblad', exact: true }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('groep4-contextsommen.pdf')
  await expect(page.getByRole('status')).toContainText('standaardversie')
  const result = page.getByRole('region', { name: 'Je PDF is klaar' })
  await expect(result.getByText('Standaardcontent gebruikt', { exact: true })).toBeVisible()
  await expect(result).toContainText('1 pagina')

  await page.getByRole('button', { name: 'Bekijk PDF-preview', exact: true }).click()
  await expect(page.getByTitle('Preview van de gemaakte PDF')).toBeVisible()
})

test('maakt een werkboekje met voorblad en antwoordenblad', async ({ page }) => {
  await page.getByRole('button', { name: 'Werkboekje', exact: true }).click()
  await page.getByLabel("Contextsommen: pagina's", { exact: true }).fill('2')
  await page.getByLabel('Voorblad toevoegen', { exact: false }).check()
  await page.getByLabel('Antwoordenblad toevoegen', { exact: false }).check()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Maak werkboekje', exact: true }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('groep4-werkboekje.pdf')
  await expect(page.getByRole('status')).toContainText('standaardcontent')
})

test('blijft bruikbaar op een mobiele viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Werkbladen Generator' })).toBeVisible()
  await expect(page.getByLabel('Groep', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Maak werkblad', exact: true })).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    formWidth: document.querySelector('form')?.getBoundingClientRect().width ?? 0,
    fieldWidths: [...document.querySelectorAll('select, input[type="number"], button[type="submit"]')]
      .map((element) => element.getBoundingClientRect().width),
    controlHeights: [...document.querySelectorAll('select, input[type="number"], button')]
      .map((element) => element.getBoundingClientRect().height),
  }))

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
  expect(dimensions.formWidth).toBeGreaterThanOrEqual(280)
  expect(Math.min(...dimensions.fieldWidths)).toBeGreaterThanOrEqual(280)
  expect(Math.min(...dimensions.controlHeights)).toBeGreaterThanOrEqual(32)
})

test('voldoet in beide modi aan de geautomatiseerde toegankelijkheidscontrole', async ({ page }) => {
  const worksheetResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(worksheetResults.violations).toEqual([])

  await page.getByRole('button', { name: 'Werkboekje', exact: true }).click()
  const workbookResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(workbookResults.violations).toEqual([])
})

test('kan de hoofdflow volledig met het toetsenbord bedienen', async ({ page }) => {
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Werkblad', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Werkboekje', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Werkboekje', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Groep', { exact: true })).toBeFocused()
})

test('bundelt een groot werkboekje per oefensoort en toont voortgang', async ({ page }) => {
  let worksheetRequests = 0
  await page.route('**/api/worksheet', async (route) => {
    worksheetRequests += 1
    await new Promise((resolve) => setTimeout(resolve, 75))
    await route.continue()
  })

  await page.getByRole('button', { name: 'Werkboekje', exact: true }).click()
  await page.getByLabel('Oefensoort toevoegen', { exact: true }).selectOption('aftrekken')
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click()
  await page.getByLabel('Oefensoort toevoegen', { exact: true }).selectOption('tafels')
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click()
  await page.getByLabel("Contextsommen: pagina's", { exact: true }).fill('5')
  await page.getByLabel("Begrijpend lezen: pagina's", { exact: true }).fill('5')
  await page.getByLabel("Woordenschat: pagina's", { exact: true }).fill('5')
  await page.getByLabel("Spelling: pagina's", { exact: true }).fill('5')
  await page.getByLabel("Optellen: pagina's", { exact: true }).fill('3')
  await page.getByLabel('Antwoordenblad toevoegen', { exact: false }).check()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Maak werkboekje', exact: true }).click()
  await expect(page.getByRole('progressbar', { name: 'Voortgang werkboekje' })).toBeVisible()
  await downloadPromise

  expect(worksheetRequests).toBe(7)
})

test('maakt lokale content wanneer de online limiet is bereikt', async ({ page }) => {
  await page.route('**/api/worksheet', (route) => route.fulfill({
    status: 429,
    contentType: 'application/json',
    headers: { 'Retry-After': '42' },
    body: JSON.stringify({ error: 'Te veel verzoeken.' }),
  }))

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Maak werkblad', exact: true }).click()
  await downloadPromise

  await expect(page.getByRole('status')).toContainText('limiet voor online werkbladen is bereikt')
  await expect(page.getByRole('status')).toContainText('42 seconden')
})
