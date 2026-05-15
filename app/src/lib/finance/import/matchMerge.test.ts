import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { matchAndMerge } from './matchMerge'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const PG_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

function getServiceKey(): string {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY
  const out = execSync('supabase status', { encoding: 'utf8' })
  const match = out.match(/Secret\s+│\s+(\S+)/)
  if (!match) throw new Error('Could not derive local Supabase service key; run `supabase start` or set SUPABASE_SERVICE_KEY')
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

async function fixtureUser(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: `mm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
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

async function fixtureAccount(userId: string): Promise<string> {
  const { rows } = await pgQuery(
    `INSERT INTO public.accounts (user_id, name, account_type, institution, currency, colour_slot)
     VALUES ($1, 'ANZ NZ', 'DEPOSIT', 'ANZ NZ', 'NZD', 0)
     RETURNING id`,
    [userId],
  )
  return rows[0].id
}

async function fixtureStatement(userId: string, accountId: string, periodStart: string, periodEnd: string): Promise<string> {
  const { rows } = await pgQuery(
    `INSERT INTO public.statements
     (user_id, account_id, period_start, period_end, storage_path, parser_strategy, status)
     VALUES ($1, $2, $3, $4, 'fixture/path.pdf', 'TEXT_FORMAT_SPECIFIC', 'IMPORTED')
     RETURNING id`,
    [userId, accountId, periodStart, periodEnd],
  )
  return rows[0].id
}

async function insertLive(
  userId: string,
  accountId: string,
  external: string,
  date: string,
  amount: number,
  type: 'DEBIT' | 'CREDIT',
  description = 'LIVE ROW',
) {
  const { rows } = await pgQuery(
    `INSERT INTO public.transactions
     (user_id, account_id, external_id, date, description, amount, type, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'LIVE')
     RETURNING id, created_at`,
    [userId, accountId, external, date, description, amount, type],
  )
  return rows[0]
}

describe('matchAndMerge', () => {
  it('promotes a matching LIVE row to STATEMENT (cycle 9, exact date + amount + type)', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userId = await fixtureUser(supabase)
    const accountId = await fixtureAccount(userId)
    const statementId = await fixtureStatement(userId, accountId, '2026-05-01', '2026-05-31')

    const liveRow = await insertLive(userId, accountId, 'akahu-1', '2026-05-10', -42.00, 'DEBIT', 'COFFEE BEAN')

    const result = await matchAndMerge({
      supabase, userId, accountId, statementId, parser: 'anzNz',
      periodStart: '2026-05-01', periodEnd: '2026-05-31',
      statementRows: [{ date: '2026-05-10', description: 'COFFEE BEAN ROASTERS', amount: -42.00, type: 'DEBIT' }],
    })

    expect(result.promoted).toBe(1)
    expect(result.inserted).toBe(0)

    const { rows } = await pgQuery(
      `SELECT id, source, statement_id, external_id, description FROM public.transactions WHERE id = $1`,
      [liveRow.id],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      source: 'STATEMENT',
      statement_id: statementId,
      description: 'COFFEE BEAN ROASTERS',
    })
    expect(rows[0].external_id).toBe(`anzNz:${statementId}:0`)
  })

  it('supersedes unmatched LIVE rows in the statement period (cycle 10)', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userId = await fixtureUser(supabase)
    const accountId = await fixtureAccount(userId)
    const statementId = await fixtureStatement(userId, accountId, '2026-05-01', '2026-05-31')

    const matchedLive = await insertLive(userId, accountId, 'akahu-1', '2026-05-10', -42.00, 'DEBIT')
    const orphanLive = await insertLive(userId, accountId, 'akahu-2', '2026-05-15', -99.00, 'DEBIT')

    const result = await matchAndMerge({
      supabase, userId, accountId, statementId, parser: 'anzNz',
      periodStart: '2026-05-01', periodEnd: '2026-05-31',
      statementRows: [{ date: '2026-05-10', description: 'MATCHED', amount: -42.00, type: 'DEBIT' }],
    })

    expect(result.promoted).toBe(1)
    expect(result.superseded).toBe(1)

    const { rows: matched } = await pgQuery(
      `SELECT source, superseded_at FROM public.transactions WHERE id = $1`,
      [matchedLive.id],
    )
    expect(matched[0].source).toBe('STATEMENT')
    expect(matched[0].superseded_at).toBeNull()

    const { rows: orphan } = await pgQuery(
      `SELECT source, superseded_at FROM public.transactions WHERE id = $1`,
      [orphanLive.id],
    )
    expect(orphan[0].source).toBe('LIVE')
    expect(orphan[0].superseded_at).not.toBeNull()
  })

  it('multi-match same-day picks the earliest created_at first (cycle 11)', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userId = await fixtureUser(supabase)
    const accountId = await fixtureAccount(userId)
    const statementId = await fixtureStatement(userId, accountId, '2026-05-01', '2026-05-31')

    const earlier = await insertLive(userId, accountId, 'akahu-1', '2026-05-10', -10.00, 'DEBIT', 'EARLIER')
    await pgQuery(`UPDATE public.transactions SET created_at = $1 WHERE id = $2`, ['2026-05-10T08:00:00Z', earlier.id])
    const later = await insertLive(userId, accountId, 'akahu-2', '2026-05-10', -10.00, 'DEBIT', 'LATER')
    await pgQuery(`UPDATE public.transactions SET created_at = $1 WHERE id = $2`, ['2026-05-10T20:00:00Z', later.id])

    const result = await matchAndMerge({
      supabase, userId, accountId, statementId, parser: 'anzNz',
      periodStart: '2026-05-01', periodEnd: '2026-05-31',
      statementRows: [{ date: '2026-05-10', description: 'STATEMENT ONE', amount: -10.00, type: 'DEBIT' }],
    })

    expect(result.promoted).toBe(1)
    expect(result.superseded).toBe(1)

    const { rows: earlierRow } = await pgQuery(
      `SELECT source, description FROM public.transactions WHERE id = $1`,
      [earlier.id],
    )
    expect(earlierRow[0]).toMatchObject({ source: 'STATEMENT', description: 'STATEMENT ONE' })

    const { rows: laterRow } = await pgQuery(
      `SELECT source, superseded_at FROM public.transactions WHERE id = $1`,
      [later.id],
    )
    expect(laterRow[0].source).toBe('LIVE')
    expect(laterRow[0].superseded_at).not.toBeNull()
  })

  it('matches across a ±1 day window (cycle 12)', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userId = await fixtureUser(supabase)
    const accountId = await fixtureAccount(userId)
    const statementId = await fixtureStatement(userId, accountId, '2026-05-01', '2026-05-31')

    const liveRow = await insertLive(userId, accountId, 'akahu-1', '2026-05-11', -25.50, 'DEBIT', 'LIVE PENDING')

    const result = await matchAndMerge({
      supabase, userId, accountId, statementId, parser: 'anzNz',
      periodStart: '2026-05-01', periodEnd: '2026-05-31',
      statementRows: [{ date: '2026-05-10', description: 'STATEMENT POSTED', amount: -25.50, type: 'DEBIT' }],
    })

    expect(result.promoted).toBe(1)
    expect(result.inserted).toBe(0)

    const { rows } = await pgQuery(
      `SELECT source, date::text, description FROM public.transactions WHERE id = $1`,
      [liveRow.id],
    )
    expect(rows[0]).toMatchObject({
      source: 'STATEMENT',
      date: '2026-05-10',
      description: 'STATEMENT POSTED',
    })
  })
})
