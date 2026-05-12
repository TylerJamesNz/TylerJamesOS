import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../types/db'

export type TransactionType = Database['public']['Enums']['transaction_type']

export interface StatementRowInput {
  date: string
  description: string
  amount: number
  type: TransactionType
}

export interface MatchAndMergeOptions {
  supabase: SupabaseClient
  userId: string
  accountId: string
  statementId: string
  parser: string
  periodStart: string
  periodEnd: string
  statementRows: StatementRowInput[]
}

export interface MatchAndMergeResult {
  promoted: number
  inserted: number
  superseded: number
}

interface LiveCandidate {
  id: string
  date: string
  amount: number
  type: TransactionType
  created_at: string
}

function withinOneDay(a: string, b: string): boolean {
  const ms = Math.abs(new Date(a + 'T00:00:00Z').getTime() - new Date(b + 'T00:00:00Z').getTime())
  return ms <= 24 * 60 * 60 * 1000
}

export async function matchAndMerge(opts: MatchAndMergeOptions): Promise<MatchAndMergeResult> {
  const { supabase, userId, accountId, statementId, parser, periodStart, periodEnd, statementRows } = opts

  const fromDate = new Date(new Date(periodStart + 'T00:00:00Z').getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const toDate = new Date(new Date(periodEnd + 'T00:00:00Z').getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data: liveRows, error: liveErr } = await supabase
    .from('transactions')
    .select('id, date, amount, type, created_at')
    .eq('account_id', accountId)
    .eq('source', 'LIVE')
    .is('superseded_at', null)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('created_at', { ascending: true })
  if (liveErr) throw liveErr

  const available: LiveCandidate[] = (liveRows ?? []).map((r) => ({
    id: r.id as string,
    date: r.date as string,
    amount: Number(r.amount),
    type: r.type as TransactionType,
    created_at: r.created_at as string,
  }))

  const promotedIds: string[] = []
  let inserted = 0

  for (let idx = 0; idx < statementRows.length; idx++) {
    const row = statementRows[idx]
    const externalId = `${parser}:${statementId}:${idx}`

    const candidateIdx = available.findIndex(
      (c) => c.amount === row.amount && c.type === row.type && withinOneDay(c.date, row.date),
    )

    if (candidateIdx >= 0) {
      const match = available.splice(candidateIdx, 1)[0]
      const { error: updErr } = await supabase
        .from('transactions')
        .update({
          source: 'STATEMENT',
          statement_id: statementId,
          external_id: externalId,
          description: row.description,
          date: row.date,
        })
        .eq('id', match.id)
      if (updErr) throw updErr
      promotedIds.push(match.id)
    } else {
      const { error: insErr } = await supabase.from('transactions').insert({
        user_id: userId,
        account_id: accountId,
        statement_id: statementId,
        external_id: externalId,
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        source: 'STATEMENT',
      })
      if (insErr) throw insErr
      inserted += 1
    }
  }

  let superseded = 0
  const leftoverIds = available.map((c) => c.id)
  if (leftoverIds.length > 0) {
    const { error: supErr, count } = await supabase
      .from('transactions')
      .update({ superseded_at: new Date().toISOString() }, { count: 'exact' })
      .in('id', leftoverIds)
      .gte('date', periodStart)
      .lte('date', periodEnd)
    if (supErr) throw supErr
    superseded = count ?? 0
  }

  return { promoted: promotedIds.length, inserted, superseded }
}
