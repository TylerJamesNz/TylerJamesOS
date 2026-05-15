export type AuthResult =
  | { ok: true }
  | { ok: false; status: 401; reason: 'missing' | 'invalid' }

export function checkAuth(headers: Headers, expectedToken: string): AuthResult {
  const header = headers.get('authorization')
  if (!header) return { ok: false, status: 401, reason: 'missing' }

  const match = header.match(/^Bearer\s+(.+)$/i)
  const token = match ? match[1] : null
  if (token === expectedToken) return { ok: true }

  return { ok: false, status: 401, reason: 'invalid' }
}
