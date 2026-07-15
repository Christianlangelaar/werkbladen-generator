import { expect, test } from '@playwright/test'

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

  await page.getByRole('button', { name: 'Bekijk PDF-preview', exact: true }).click()
  await expect(page.getByTitle('Preview van de gemaakte PDF')).toBeVisible()
})

test('maakt een werkboekje met voorblad en antwoordenblad', async ({ page }) => {
  await page.getByRole('button', { name: 'Werkboekje', exact: true }).click()
  await page.getByLabel("Aantal pagina's", { exact: true }).fill('2')
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
  }))

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
})

test('bundelt een groot werkboekje per oefensoort en toont voortgang', async ({ page }) => {
  let worksheetRequests = 0
  await page.route('**/api/worksheet', async (route) => {
    worksheetRequests += 1
    await new Promise((resolve) => setTimeout(resolve, 75))
    await route.continue()
  })

  await page.getByRole('button', { name: 'Werkboekje', exact: true }).click()
  await page.getByLabel("Aantal pagina's", { exact: true }).fill('25')
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
