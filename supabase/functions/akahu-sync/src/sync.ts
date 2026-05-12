import type { SupabaseClient } from '@supabase/supabase-js'

export interface AkahuTransaction {
  _id: string
  date: string
  description: string
  amount: number
  type: string
}

export interface AkahuListResponse {
  items: AkahuTransaction[]
  cursor?: { next: string | null }
}

export interface AkahuClientLike {
  transactions: {
    list: (
      userToken: string,
      akahuAccountId: string,
      opts?: { start?: string; end?: string; cursor?: string | null },
    ) => Promise<AkahuListResponse>
  }
}

export interface SyncOptions {
  supabase: SupabaseClient
  akahu: AkahuClientLike
  userToken: string
  userId: string
  trigger: 'cron' | 'manual'
}

async function resolveWindowStart(supabase: SupabaseClient, accountId: string): Promise<string> {
  const { data, error } = await supabase
    .from('transactions')
    .select('date')
    .eq('account_id', accountId)
    .eq('source', 'LIVE')
    .order('date', { ascending: false })
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) {
    return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  }
  const latest = new Date(data[0].date as string)
  latest.setUTCDate(latest.getUTCDate() - 2)
  return latest.toISOString()
}

export async function runAkahuSync({ supabase, akahu, userToken, userId, trigger }: SyncOptions): Promise<void> {
  const { data: accounts, error: accountsErr } = await supabase
    .from('accounts')
    .select('id, akahu_account_id')
    .eq('user_id', userId)
    .not('akahu_account_id', 'is', null)
  if (accountsErr) throw accountsErr

  let insertedCount = 0
  let status: 'ok' | 'error' = 'ok'
  let errorMessage: string | null = null

  try {
    for (const account of accounts ?? []) {
      const akahuAccountId = account.akahu_account_id as string
      const start = await resolveWindowStart(supabase, account.id as string)
      let cursor: string | null | undefined = undefined
      do {
        const page = await akahu.transactions.list(userToken, akahuAccountId, { start, cursor })
        const items = page.items
        cursor = page.cursor?.next ?? null
        if (items.length === 0) continue

        const rows = items.map((t) => ({
          user_id: userId,
          account_id: account.id,
          external_id: t._id,
          date: t.date.slice(0, 10),
          description: t.description,
          amount: t.amount,
          type: t.type,
          source: 'LIVE' as const,
        }))

        const { data: inserted, error: insertErr } = await supabase
          .from('transactions')
          .upsert(rows, { onConflict: 'account_id,external_id', ignoreDuplicates: true })
          .select('id')
        if (insertErr) throw insertErr
        insertedCount += inserted?.length ?? 0
      } while (cursor)
    }
  } catch (err) {
    status = 'error'
    errorMessage = err instanceof Error ? err.message : String(err)
  }

  const { error: runErr } = await supabase.from('live_sync_runs').insert({
    user_id: userId,
    provider: 'akahu',
    trigger,
    status,
    inserted_count: insertedCount,
    error_message: errorMessage,
    finished_at: new Date().toISOString(),
  })
  if (runErr) throw runErr
}
