import { describe, it, expect } from 'vitest'
import { checkAuth } from './auth'

describe('checkAuth', () => {
  it('passes through when Authorization carries the correct bearer token', () => {
    const headers = new Headers({ Authorization: 'Bearer s3cret' })

    const result = checkAuth(headers, 's3cret')

    expect(result.ok).toBe(true)
  })

  it('returns 401 when Authorization header is missing', () => {
    const result = checkAuth(new Headers(), 's3cret')

    expect(result).toEqual({ ok: false, status: 401, reason: 'missing' })
  })

  it('returns 401 when bearer token does not match', () => {
    const headers = new Headers({ Authorization: 'Bearer wrong-token' })

    const result = checkAuth(headers, 's3cret')

    expect(result).toEqual({ ok: false, status: 401, reason: 'invalid' })
  })

  it('returns 401 when Authorization header is malformed (no Bearer prefix)', () => {
    const headers = new Headers({ Authorization: 's3cret' })

    const result = checkAuth(headers, 's3cret')

    expect(result.ok).toBe(false)
  })
})
