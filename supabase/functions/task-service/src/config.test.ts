import { describe, it, expect } from 'vitest'
import { loadConfig } from './config'

describe('loadConfig', () => {
  it('returns ok with all three values when every env var is set', () => {
    const result = loadConfig({
      CLAUDE_API_KEY: 's3cret',
      LAA_SUPABASE_URL: 'https://x.supabase.co',
      LAA_SUPABASE_SERVICE_ROLE_KEY: 'role_key',
    })

    expect(result).toEqual({
      ok: true,
      config: {
        expectedToken: 's3cret',
        supabaseUrl: 'https://x.supabase.co',
        serviceRoleKey: 'role_key',
      },
    })
  })

  it('reports the missing var when only CLAUDE_API_KEY is unset', () => {
    const result = loadConfig({
      LAA_SUPABASE_URL: 'https://x.supabase.co',
      LAA_SUPABASE_SERVICE_ROLE_KEY: 'role_key',
    })

    expect(result).toEqual({ ok: false, missing: ['CLAUDE_API_KEY'] })
  })

  it('lists every missing var when all three are unset', () => {
    const result = loadConfig({})

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.missing).toEqual([
      'CLAUDE_API_KEY',
      'LAA_SUPABASE_URL',
      'LAA_SUPABASE_SERVICE_ROLE_KEY',
    ])
  })

  it('treats an empty-string value as missing', () => {
    const result = loadConfig({
      CLAUDE_API_KEY: '',
      LAA_SUPABASE_URL: 'https://x.supabase.co',
      LAA_SUPABASE_SERVICE_ROLE_KEY: 'role_key',
    })

    expect(result).toEqual({ ok: false, missing: ['CLAUDE_API_KEY'] })
  })
})
