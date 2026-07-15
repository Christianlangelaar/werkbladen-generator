const baseUrl = (process.argv[2] || process.env.SMOKE_BASE_URL || '').replace(/\/$/, '')

if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://localhost')) {
  throw new Error('Geef een https-URL mee, bijvoorbeeld: npm run smoke -- https://voorbeeld.nl')
}

const healthResponse = await fetch(`${baseUrl}/api/health`, { redirect: 'error' })
if (!healthResponse.ok || (await healthResponse.json()).status !== 'ok') {
  throw new Error(`Healthcheck mislukt met status ${healthResponse.status}.`)
}

const pageResponse = await fetch(baseUrl, { redirect: 'error' })
const html = await pageResponse.text()
if (!pageResponse.ok || !html.includes('<title>Werkbladen Generator</title>')) {
  throw new Error(`Homepagecontrole mislukt met status ${pageResponse.status}.`)
}

for (const path of ['/privacy.html', '/social-preview.png', '/manifest.webmanifest']) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'error' })
  if (!response.ok) throw new Error(`${path} gaf status ${response.status}.`)
}

console.log(`Productie-smoketest geslaagd voor ${baseUrl}`)
