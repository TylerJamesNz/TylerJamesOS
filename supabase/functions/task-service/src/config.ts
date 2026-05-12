export type Config = {
  expectedToken: string
  supabaseUrl: string
  serviceRoleKey: string
}

export type ConfigResult =
  | { ok: true; config: Config }
  | { ok: false; missing: string[] }

const VARS = [
  'CLAUDE_API_KEY',
  'LAA_SUPABASE_URL',
  'LAA_SUPABASE_SERVICE_ROLE_KEY',
] as const

export function loadConfig(env: Record<string, string | undefined>): ConfigResult {
  const missing = VARS.filter((name) => !env[name])
  if (missing.length > 0) return { ok: false, missing }

  return {
    ok: true,
    config: {
      expectedToken: env.CLAUDE_API_KEY!,
      supabaseUrl: env.LAA_SUPABASE_URL!,
      serviceRoleKey: env.LAA_SUPABASE_SERVICE_ROLE_KEY!,
    },
  }
}
