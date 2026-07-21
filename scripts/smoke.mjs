const baseUrl = (process.argv[2] || process.env.SMOKE_BASE_URL || '').replace(/\/$/, '')
const requestTimeoutMs = 10_000

if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://localhost')) {
  throw new Error('Geef een https-URL mee, bijvoorbeeld: npm run smoke -- https://voorbeeld.nl')
}

async function fetchWithTimeout(path) {
  try {
    return await fetch(`${baseUrl}${path}`, {
      redirect: 'error',
      signal: AbortSignal.timeout(requestTimeoutMs),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`${path || '/'} is niet bereikbaar: ${reason}`)
  }
}

const healthResponse = await fetchWithTimeout('/api/health?readiness=1')
if (!healthResponse.ok || (await healthResponse.json()).status !== 'ok') {
  throw new Error(`Healthcheck mislukt met status ${healthResponse.status}.`)
}

const pageResponse = await fetchWithTimeout('')
const html = await pageResponse.text()
if (!pageResponse.ok || !html.includes('<title>Werkbladen Generator | AI-hulp voor leerkrachten</title>')) {
  throw new Error(`Homepagecontrole mislukt met status ${pageResponse.status}.`)
}

for (const path of ['/privacy.html', '/social-preview-v2.png', '/manifest.webmanifest']) {
  const response = await fetchWithTimeout(path)
  if (!response.ok) throw new Error(`${path} gaf status ${response.status}.`)
}

console.log(`Productie-smoketest geslaagd voor ${baseUrl}`)
