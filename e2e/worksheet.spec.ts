import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('healthcheck is beschikbaar voor monitoring', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toBe('no-store')
  await expect(response.json()).resolves.toEqual({ status: 'ok' })
})

test('maakt een werkblad en meldt gebruikte fallbackcontent', async ({ page }) => {
  await page.getByLabel('Groep', { exact: true }).selectOption('4')
  await page.getByLabel('Oefensoort', { exact: true }).selectOption('contextsommen')
  await page.getByLabel('Aantal opdrachten', { exact: true }).fill('2')

  await page.getByRole('button', { name: 'Maak werkblad', exact: true }).click()
  await expect(page.getByTitle('Preview van de gemaakte PDF')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download PDF', exact: true }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('groep4-contextsommen.pdf')
  await expect(page.getByRole('status')).toContainText('standaardversie')
  const result = page.getByRole('region', { name: 'Je PDF is klaar' })
  await expect(result.getByText('Standaardcontent gebruikt', { exact: true })).toBeVisible()
  await expect(result).toContainText('1 pagina')

  await page.getByRole('button', { name: 'Sluit preview', exact: true }).click()
  await expect(page.getByTitle('Preview van de gemaakte PDF')).toBeHidden()
})

test('maakt een werkboekje met voorblad en antwoordenblad', async ({ page }) => {
  await page.getByRole('button', { name: 'Werkboekje', exact: true }).click()
  await page.getByLabel("Contextsommen: pagina's", { exact: true }).fill('2')
  await page.getByLabel('Voorblad toevoegen', { exact: false }).check()
  await page.getByLabel('Antwoordenblad toevoegen', { exact: false }).check()

  await page.getByRole('button', { name: 'Maak werkboekje', exact: true }).click()
  await expect(page.getByTitle('Preview van de gemaakte PDF')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download PDF', exact: true }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('groep4-werkboekje.pdf')
  await expect(page.getByRole('status')).toContainText('standaardcontent')
})

test('bewerkt, verwijdert en vernieuwt losse opdrachten voor download', async ({ page }) => {
  await page.getByLabel('Aantal opdrachten', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Maak werkblad', exact: true }).click()
  const preview = page.getByTitle('Preview van de gemaakte PDF')
  await expect(preview).toBeVisible()
  const originalPreviewUrl = await preview.getAttribute('src')

  await page.getByText('Bewerk opdrachten (2)', { exact: true }).click()
  await page.getByLabel('Vraag', { exact: true }).first().fill('Een zelf aangepaste opdracht')
  await page.getByLabel('Antwoord', { exact: true }).first().fill('Een eigen antwoord')
  await page.getByRole('button', { name: 'Verwijder opdracht', exact: true }).last().click()
  await page.getByRole('button', { name: 'Werk preview bij', exact: true }).click()

  await expect(page.getByText('Bewerk opdrachten (1)', { exact: true })).toBeVisible()
  await expect(preview).not.toHaveAttribute('src', originalPreviewUrl ?? '')

  await page.getByRole('button', { name: 'Opnieuw genereren', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Opnieuw genereren', exact: true })).toBeEnabled()
})

test('bewaart en hergebruikt een benoemd sjabloon', async ({ page }) => {
  await page.getByLabel('Groep', { exact: true }).selectOption('7')
  await page.getByLabel('Oefensoort', { exact: true }).selectOption('breuken')
  await page.getByText('Mijn sjablonen', { exact: true }).click()
  await page.getByLabel('Naam van sjabloon', { exact: true }).fill('Rekenen groep 7')
  await page.getByRole('button', { name: 'Huidige instellingen opslaan', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('is opgeslagen')

  await page.reload()
  await page.getByLabel('Groep', { exact: true }).selectOption('4')
  await page.getByText('Mijn sjablonen (1)', { exact: true }).click()
  await page.getByRole('button', { name: 'Toepassen', exact: true }).click()

  await expect(page.getByLabel('Groep', { exact: true })).toHaveValue('7')
  await expect(page.getByLabel('Oefensoort', { exact: true })).toHaveValue('breuken')
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
      .map((element) => element.getBoundingClientRect().height)
      .filter((height) => height > 0),
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
  await expect(page.locator('summary')).toBeFocused()
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

  await page.getByRole('button', { name: 'Maak werkboekje', exact: true }).click()
  await expect(page.getByRole('progressbar', { name: 'Voortgang werkboekje' })).toBeVisible()
  await expect(page.getByTitle('Preview van de gemaakte PDF')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download PDF', exact: true }).click()
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

  await page.getByRole('button', { name: 'Maak werkblad', exact: true }).click()
  await expect(page.getByTitle('Preview van de gemaakte PDF')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download PDF', exact: true }).click()
  await downloadPromise

  await expect(page.getByRole('status')).toContainText('limiet voor online werkbladen is bereikt')
  await expect(page.getByRole('status')).toContainText('42 seconden')
})
