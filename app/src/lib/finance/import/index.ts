import { supabase } from '../../supabase'
import type { Database } from '../../../types/db'
import { uploadStatementPdf } from './storage'
import { tryParse, type ParseAttempt } from './parsers'

export type ParserStrategy = Database['public']['Enums']['parser_strategy']
export type StatementStatus = Database['public']['Enums']['statement_status']
export type StatementRow = Database['public']['Tables']['statements']['Row']

export { tryParse }
export type { ParseAttempt }

export type ImportRequest = {
  userId: string
  accountId: string
  periodStart: string // YYYY-MM-DD
  periodEnd: string // YYYY-MM-DD
  file: File
  parsed?: ParseAttempt | null
}

export type ImportResult = {
  statement: StatementRow
  strategy: ParserStrategy
  transactionsInserted: number
}

export async function runImport(req: ImportRequest): Promise<ImportResult> {
  const { path } = await uploadStatementPdf(req.userId, req.accountId, req.periodEnd, req.file)
  const strategy: ParserStrategy = req.parsed ? 'TEXT_FORMAT_SPECIFIC' : 'MANUAL'
  const status: StatementStatus = req.parsed ? 'IMPORTED' : 'NEEDS_REVIEW'

  const { data: statement, error: stmtErr } = await supabase
    .from('statements')
    .upsert(
      {
        user_id: req.userId,
        account_id: req.accountId,
        period_start: req.periodStart,
        period_end: req.periodEnd,
        storage_path: path,
        parser_strategy: strategy,
        parser_version: req.parsed ? req.parsed.parser : null,
        opening_balance: req.parsed ? Number(req.parsed.statement.openingBalance) : null,
        closing_balance: req.parsed ? Number(req.parsed.statement.closingBalance) : null,
        status,
      },
      { onConflict: 'account_id,period_start,period_end' }
    )
    .select()
    .single()
  if (stmtErr) throw stmtErr

  if (!req.parsed) {
    return { statement, strategy, transactionsInserted: 0 }
  }

  await supabase.from('transactions').delete().eq('statement_id', statement.id)
  await supabase.from('balance_snapshots').delete().eq('statement_id', statement.id)

  const txnRows = req.parsed.statement.transactions.map((t, idx) => ({
    user_id: req.userId,
    account_id: req.accountId,
    statement_id: statement.id,
    external_id: `${req.parsed!.parser}:${statement.id}:${idx}`,
    date: t.date,
    description: t.description,
    amount: Number(t.amount),
    type: t.type as Database['public']['Enums']['transaction_type'],
  }))

  if (txnRows.length > 0) {
    const { error: txnErr } = await supabase.from('transactions').insert(txnRows)
    if (txnErr) throw txnErr
  }

  const { error: snapErr } = await supabase.from('balance_snapshots').insert([
    {
      user_id: req.userId,
      account_id: req.accountId,
      statement_id: statement.id,
      date: req.parsed.statement.periodStart,
      balance: Number(req.parsed.statement.openingBalance),
      source: 'STATEMENT' as const,
    },
    {
      user_id: req.userId,
      account_id: req.accountId,
      statement_id: statement.id,
      date: req.parsed.statement.periodEnd,
      balance: Number(req.parsed.statement.closingBalance),
      source: 'STATEMENT' as const,
    },
  ])
  if (snapErr) throw snapErr

  return { statement, strategy, transactionsInserted: txnRows.length }
}
