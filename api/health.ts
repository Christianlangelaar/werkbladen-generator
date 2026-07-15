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

  return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers })
}

export default {
  fetch: handleRequest,
}
