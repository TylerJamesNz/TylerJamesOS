import { supabase } from '../supabase'
import type { Database } from '../../types/db'

export type AccountRow = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type TransactionRow = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

export async function listAccounts(): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function insertAccount(input: AccountInsert): Promise<AccountRow> {
  const { data, error } = await supabase.from('accounts').insert(input).select().single()
  if (error) throw error
  return data
}

export async function listTransactions(): Promise<(TransactionRow & { account: { name: string } | null })[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, account:accounts(name)')
    .order('date', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as (TransactionRow & { account: { name: string } | null })[]
}

export async function insertTransaction(input: TransactionInsert): Promise<TransactionRow> {
  const { data, error } = await supabase.from('transactions').insert(input).select().single()
  if (error) throw error
  return data
}
