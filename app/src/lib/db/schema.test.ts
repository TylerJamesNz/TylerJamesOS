import { describe, it, expect } from 'vitest'
import { Client } from 'pg'

const TEST_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

async function columnsOf(table: string): Promise<Record<string, { data_type: string; is_nullable: string }>> {
  const client = new Client({ connectionString: TEST_DB_URL })
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table]
    )
    return Object.fromEntries(
      rows.map((r) => [r.column_name, { data_type: r.data_type, is_nullable: r.is_nullable }])
    )
  } finally {
    await client.end()
  }
}

async function pgPoliciesOf(table: string): Promise<string[]> {
  const client = new Client({ connectionString: TEST_DB_URL })
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = $1`,
      [table]
    )
    return rows.map((r) => r.policyname as string)
  } finally {
    await client.end()
  }
}

async function enumValues(typename: string): Promise<string[]> {
  const client = new Client({ connectionString: TEST_DB_URL })
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT e.enumlabel
       FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = $1
       ORDER BY e.enumsortorder`,
      [typename]
    )
    return rows.map((r) => r.enumlabel as string)
  } finally {
    await client.end()
  }
}

describe('finance schema', () => {
  it('has an accounts table with the expected columns', async () => {
    const cols = await columnsOf('accounts')
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('user_id')
    expect(cols).toHaveProperty('name')
    expect(cols).toHaveProperty('institution')
    expect(cols).toHaveProperty('account_type')
    expect(cols).toHaveProperty('external_account_number')
    expect(cols).toHaveProperty('currency')
    expect(cols).toHaveProperty('opening_balance')
    expect(cols).toHaveProperty('colour_slot')
    expect(cols).toHaveProperty('created_at')
    expect(cols).toHaveProperty('updated_at')
  })

  it('has a transactions table with the expected columns', async () => {
    const cols = await columnsOf('transactions')
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('user_id')
    expect(cols).toHaveProperty('account_id')
    expect(cols).toHaveProperty('external_id')
    expect(cols).toHaveProperty('date')
    expect(cols).toHaveProperty('description')
    expect(cols).toHaveProperty('amount')
    expect(cols).toHaveProperty('type')
    expect(cols).toHaveProperty('notes')
  })

  it('has a user_settings table with home_currency', async () => {
    const cols = await columnsOf('user_settings')
    expect(cols).toHaveProperty('user_id')
    expect(cols).toHaveProperty('home_currency')
  })

  it('exposes the account_type enum with DEPOSIT and INVESTMENT', async () => {
    const values = await enumValues('account_type')
    expect(values).toEqual(['DEPOSIT', 'INVESTMENT'])
  })

  it('exposes the transaction_type enum with DEBIT and CREDIT', async () => {
    const values = await enumValues('transaction_type')
    expect(values).toEqual(['DEBIT', 'CREDIT'])
  })

  it('has RLS policies on accounts, transactions, and user_settings', async () => {
    expect(await pgPoliciesOf('accounts')).not.toHaveLength(0)
    expect(await pgPoliciesOf('transactions')).not.toHaveLength(0)
    expect(await pgPoliciesOf('user_settings')).not.toHaveLength(0)
  })
})
