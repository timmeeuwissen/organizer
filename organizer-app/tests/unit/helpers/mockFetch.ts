/**
 * Build a minimal Response-like object for mocking global fetch in Vitest.
 */
export function jsonResponse (
  data: unknown,
  init: { ok?: boolean; status?: number; statusText?: string; contentType?: string } = {}
): Response {
  const ok = init.ok !== false
  const status = init.status ?? (ok ? 200 : 400)
  const statusText = init.statusText ?? (ok ? 'OK' : 'Error')
  const headers = new Headers({
    'content-type': init.contentType ?? 'application/json'
  })
  const body = typeof data === 'string' ? data : JSON.stringify(data)
  return new Response(body, { status, statusText, headers })
}
