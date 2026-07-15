const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

function handleRequest(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Alleen GET-verzoeken zijn toegestaan.' }), {
      status: 405,
      headers: { ...headers, Allow: 'GET' },
    })
  }

  const readinessRequested = new URL(request.url).searchParams.get('readiness') === '1'
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY)
  const distributedRateLimitConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  )
  const ready = openaiConfigured

  return new Response(JSON.stringify({
    status: readinessRequested && !ready ? 'degraded' : 'ok',
    checks: { openaiConfigured, distributedRateLimitConfigured },
  }), {
    status: readinessRequested && !ready ? 503 : 200,
    headers,
  })
}

export default {
  fetch: handleRequest,
}
