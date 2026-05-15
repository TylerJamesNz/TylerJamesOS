import { createClient } from 'jsr:@supabase/supabase-js@2.105.0'
import { AkahuClient } from 'npm:akahu@2.5.0'
import { runAkahuSync, type AkahuClientLike } from './src/sync.ts'

Deno.serve(async (req) => {
  const appToken = Deno.env.get('AKAHU_APP_TOKEN')
  const userToken = Deno.env.get('AKAHU_USER_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!appToken || !userToken || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'missing env: AKAHU_APP_TOKEN, AKAHU_USER_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }

  const body = req.body ? await req.json().catch(() => ({})) : {}
  const trigger: 'cron' | 'manual' = body?.trigger === 'cron' ? 'cron' : 'manual'
  const userId = body?.userId as string | undefined
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required in body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const akahu = new AkahuClient({ appToken, adapter: 'fetch' }) as unknown as AkahuClientLike

  try {
    await runAkahuSync({ supabase, akahu, userToken, userId, trigger })
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
})
