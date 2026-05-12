import { describe, it, expect, beforeEach } from 'vitest'
import { execSync } from 'node:child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { runAkahuSync, type AkahuClientLike, type AkahuTransaction } from './sync'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const PG_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

function getServiceKey(): string {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY
  const out = execSync('supabase status', { encoding: 'utf8' })
  const match = out.match(/Secret\s+│\s+(\S+)/)
  if (!match) {
    throw new Error(
      'Could not derive the local Supabase service key from `supabase status`. ' +
      'Set SUPABASE_SERVICE_KEY env var or run `supabase start` first.',
    )
  }
  return match[1]
}

const SERVICE_KEY = getServiceKey()

async function pgQuery(sql: string, params: unknown[] = []) {
  const pg = new PgClient({ connectionString: PG_URL })
  await pg.connect()
  try {
    return await pg.query(sql, params)
  } finally {
    await pg.end()
  }
}

async function resetFinanceFixtures() {
  await pgQuery('DELETE FROM public.transactions')
  await pgQuery('DELETE FROM public.live_sync_runs')
  await pgQuery('DELETE FROM public.accounts')
  await pgQuery('DELETE FROM public.users')
  await pgQuery('DELETE FROM auth.users')
}

async function insertFixtureUser(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: `t1d-${Date.now()}@example.com`,
    password: 'fixture-password',
    email_confirm: true,
  })
  if (error || !data.user) throw error ?? new Error('createUser returned no user')
  await pgQuery(
    `INSERT INTO public.users (id, email, name) VALUES ($1, $2, 'Fixture User')`,
    [data.user.id, data.user.email],
  )
  return data.user.id
}

async function insertMappedAkahuAccount(userId: string, akahuAccountId: string): Promise<string> {
  const { rows } = await pgQuery(
    `INSERT INTO public.accounts (user_id, name, account_type, institution, currency, akahu_account_id, colour_slot)
     VALUES ($1, 'ANZ NZ Everyday', 'DEPOSIT', 'ANZ NZ', 'NZD', $2, 0)
     RETURNING id`,
    [userId, akahuAccountId],
  )
  return rows[0].id
}

function mockAkahu(txnsByAccount: Record<string, AkahuTransaction[]>): AkahuClientLike {
  return {
    transactions: {
      list: async (_userToken, akahuAccountId) => ({
        items: txnsByAccount[akahuAccountId] ?? [],
        cursor: { next: null },
      }),
    },
  }
}

describe('runAkahuSync', () => {
  beforeEach(resetFinanceFixtures)

  it('inserts LIVE rows for each Akahu transaction returned for a mapped account', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userId = await insertFixtureUser(supabase)
    const accountId = await insertMappedAkahuAccount(userId, 'akahu-acc-1')

    const akahu = mockAkahu({
      'akahu-acc-1': [
        { _id: 'akahu-txn-1', date: '2026-05-01T10:00:00Z', description: 'COFFEE', amount: -4.5, type: 'DEBIT' },
        { _id: 'akahu-txn-2', date: '2026-05-02T09:00:00Z', description: 'SALARY', amount: 2500, type: 'CREDIT' },
      ],
    })

    await runAkahuSync({ supabase, akahu, userToken: 'fake-user-token', userId, trigger: 'manual' })

    const { rows } = await pgQuery(
      `SELECT external_id, source, account_id, amount::text FROM public.transactions
       WHERE user_id = $1 ORDER BY date ASC`,
      [userId],
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ external_id: 'akahu-txn-1', source: 'LIVE', account_id: accountId })
    expect(rows[1]).toMatchObject({ external_id: 'akahu-txn-2', source: 'LIVE', account_id: accountId })
  })

  it('is idempotent on re-invocation: same Akahu txns produce no duplicate rows', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userId = await insertFixtureUser(supabase)
    await insertMappedAkahuAccount(userId, 'akahu-acc-1')

    const akahu = mockAkahu({
      'akahu-acc-1': [
        { _id: 'akahu-txn-1', date: '2026-05-01T10:00:00Z', description: 'COFFEE', amount: -4.5, type: 'DEBIT' },
        { _id: 'akahu-txn-2', date: '2026-05-02T09:00:00Z', description: 'SALARY', amount: 2500, type: 'CREDIT' },
      ],
    })

    await runAkahuSync({ supabase, akahu, userToken: 'fake-user-token', userId, trigger: 'manual' })
    await runAkahuSync({ supabase, akahu, userToken: 'fake-user-token', userId, trigger: 'cron' })

    const { rows } = await pgQuery(`SELECT id FROM public.transactions WHERE user_id = $1`, [userId])
    expect(rows).toHaveLength(2)
  })

  it('writes a live_sync_runs row with status=ok, inserted_count, and trigger on success', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userId = await insertFixtureUser(supabase)
    await insertMappedAkahuAccount(userId, 'akahu-acc-1')

    const akahu = mockAkahu({
      'akahu-acc-1': [
        { _id: 'akahu-txn-1', date: '2026-05-01T10:00:00Z', description: 'COFFEE', amount: -4.5, type: 'DEBIT' },
        { _id: 'akahu-txn-2', date: '2026-05-02T09:00:00Z', description: 'SALARY', amount: 2500, type: 'CREDIT' },
      ],
    })

    await runAkahuSync({ supabase, akahu, userToken: 'fake-user-token', userId, trigger: 'manual' })

    const { rows } = await pgQuery(
      `SELECT status, inserted_count, trigger, provider, error_message, finished_at
       FROM public.live_sync_runs WHERE user_id = $1`,
      [userId],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      status: 'ok',
      inserted_count: 2,
      trigger: 'manual',
      provider: 'akahu',
      error_message: null,
    })
    expect(rows[0].finished_at).not.toBeNull()
  })

  it('writes a live_sync_runs row with status=error when the Akahu SDK throws', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userId = await insertFixtureUser(supabase)
    await insertMappedAkahuAccount(userId, 'akahu-acc-1')

    const akahu: AkahuClientLike = {
      transactions: {
        list: async () => {
          throw new Error('Akahu API timeout')
        },
      },
    }

    await runAkahuSync({ supabase, akahu, userToken: 'fake-user-token', userId, trigger: 'cron' })

    const { rows } = await pgQuery(
      `SELECT status, inserted_count, error_message, trigger FROM public.live_sync_runs WHERE user_id = $1`,
      [userId],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'error', inserted_count: 0, trigger: 'cron' })
    expect(rows[0].error_message).toContain('Akahu API timeout')
  })
})
