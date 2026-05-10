import { supabase } from '../../supabase'
import type { Database } from '../../../types/db'
import { uploadStatementPdf } from './storage'

export type ParserStrategy = Database['public']['Enums']['parser_strategy']
export type StatementStatus = Database['public']['Enums']['statement_status']
export type StatementRow = Database['public']['Tables']['statements']['Row']

export type ImportRequest = {
  userId: string
  accountId: string
  periodStart: string // YYYY-MM-DD
  periodEnd: string // YYYY-MM-DD
  file: File
}

export type ImportResult = {
  statement: StatementRow
  strategy: ParserStrategy
}

// Strategy chain skeleton. Only MANUAL works end-to-end at this commit.
// T1c adds TEXT_FORMAT_SPECIFIC (ANZ NZ). T2 adds ANZ AU. T10 adds GENERIC and OCR.
const STRATEGIES: ParserStrategy[] = [
  'TEXT_FORMAT_SPECIFIC',
  'TEXT_GENERIC',
  'OCR_GENERIC',
  'MANUAL',
]

export async function runImport(req: ImportRequest): Promise<ImportResult> {
  const { path } = await uploadStatementPdf(req.userId, req.accountId, req.periodEnd, req.file)
  const strategy = pickStrategy()
  const { data, error } = await supabase
    .from('statements')
    .upsert(
      {
        user_id: req.userId,
        account_id: req.accountId,
        period_start: req.periodStart,
        period_end: req.periodEnd,
        storage_path: path,
        parser_strategy: strategy,
        parser_version: null,
        opening_balance: null,
        closing_balance: null,
        status: strategy === 'MANUAL' ? 'NEEDS_REVIEW' : 'IMPORTED',
      },
      { onConflict: 'account_id,period_start,period_end' }
    )
    .select()
    .single()
  if (error) throw error
  return { statement: data, strategy }
}

function pickStrategy(): ParserStrategy {
  // Real strategy ladder lives in T1c onwards. For now everything is MANUAL.
  return STRATEGIES[3]
}
