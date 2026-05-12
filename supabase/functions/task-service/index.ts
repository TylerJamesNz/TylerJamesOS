import { createClient } from 'jsr:@supabase/supabase-js@2.105.0'
import { handle } from './src/handler.ts'
import { makeDb } from './src/adapter.ts'
import { loadConfig } from './src/config.ts'

Deno.serve(async (req) => {
  const env = {
    CLAUDE_API_KEY: Deno.env.get('CLAUDE_API_KEY'),
    LAA_SUPABASE_URL: Deno.env.get('LAA_SUPABASE_URL'),
    LAA_SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('LAA_SUPABASE_SERVICE_ROLE_KEY'),
  }
  const result = loadConfig(env)
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: `missing env: ${result.missing.join(', ')}` }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }

  const supabase = createClient(result.config.supabaseUrl, result.config.serviceRoleKey)
  return handle(req, {
    expectedToken: result.config.expectedToken,
    now: () => new Date(),
    db: makeDb(supabase),
  })
})
