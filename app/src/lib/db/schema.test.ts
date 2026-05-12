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

  it('has a statements table with the expected columns', async () => {
    const cols = await columnsOf('statements')
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('user_id')
    expect(cols).toHaveProperty('account_id')
    expect(cols).toHaveProperty('period_start')
    expect(cols).toHaveProperty('period_end')
    expect(cols).toHaveProperty('storage_path')
    expect(cols).toHaveProperty('parser_strategy')
    expect(cols).toHaveProperty('parser_version')
    expect(cols).toHaveProperty('opening_balance')
    expect(cols).toHaveProperty('closing_balance')
    expect(cols).toHaveProperty('status')
    expect(cols).toHaveProperty('imported_at')
  })

  it('has a balance_snapshots table linking back to statements', async () => {
    const cols = await columnsOf('balance_snapshots')
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('user_id')
    expect(cols).toHaveProperty('account_id')
    expect(cols).toHaveProperty('date')
    expect(cols).toHaveProperty('balance')
    expect(cols).toHaveProperty('source')
    expect(cols).toHaveProperty('statement_id')
  })

  it('has a statement_id column on transactions', async () => {
    const cols = await columnsOf('transactions')
    expect(cols).toHaveProperty('statement_id')
  })

  it('has RLS policies on statements and balance_snapshots', async () => {
    expect(await pgPoliciesOf('statements')).not.toHaveLength(0)
    expect(await pgPoliciesOf('balance_snapshots')).not.toHaveLength(0)
  })

  it('exposes parser_strategy, statement_status, snapshot_source enums', async () => {
    expect(await enumValues('parser_strategy')).toEqual([
      'TEXT_FORMAT_SPECIFIC',
      'TEXT_GENERIC',
      'OCR_GENERIC',
      'MANUAL',
    ])
    expect(await enumValues('statement_status')).toEqual(['IMPORTED', 'NEEDS_REVIEW', 'FAILED'])
    expect(await enumValues('snapshot_source')).toEqual(['STATEMENT', 'MANUAL'])
  })

  it('has source and superseded_at columns on transactions', async () => {
    const cols = await columnsOf('transactions')
    expect(cols).toHaveProperty('source')
    expect(cols.source.is_nullable).toBe('NO')
    expect(cols).toHaveProperty('superseded_at')
    expect(cols.superseded_at.is_nullable).toBe('YES')
  })

  it('has akahu_account_id and gmail_label columns on accounts', async () => {
    const cols = await columnsOf('accounts')
    expect(cols).toHaveProperty('akahu_account_id')
    expect(cols).toHaveProperty('gmail_label')
  })

  it('exposes transaction_source enum with STATEMENT, LIVE, MANUAL values', async () => {
    expect(await enumValues('transaction_source')).toEqual(['STATEMENT', 'LIVE', 'MANUAL'])
  })

  it('has an external_integrations table with the expected columns', async () => {
    const cols = await columnsOf('external_integrations')
    expect(cols).toHaveProperty('user_id')
    expect(cols).toHaveProperty('provider')
    expect(cols).toHaveProperty('encrypted_access_token')
    expect(cols).toHaveProperty('encrypted_refresh_token')
    expect(cols).toHaveProperty('expires_at')
    expect(cols).toHaveProperty('scopes')
    expect(cols).toHaveProperty('created_at')
    expect(cols).toHaveProperty('updated_at')
  })

  it('has RLS policy on external_integrations', async () => {
    expect(await pgPoliciesOf('external_integrations')).not.toHaveLength(0)
  })

  it('exposes integration_provider enum with akahu and gmail values', async () => {
    expect(await enumValues('integration_provider')).toEqual(['akahu', 'gmail'])
  })

  it('akahu_account_id on accounts has a unique constraint', async () => {
    const client = new Client({ connectionString: TEST_DB_URL })
    await client.connect()
    try {
      const { rows } = await client.query(
        `SELECT conname FROM pg_constraint
         WHERE conrelid = 'public.accounts'::regclass
           AND contype = 'u'
           AND pg_get_constraintdef(oid) LIKE '%akahu_account_id%'`
      )
      expect(rows.length).toBeGreaterThan(0)
    } finally {
      await client.end()
    }
  })

  it('has a live_sync_runs table with the expected columns', async () => {
    const cols = await columnsOf('live_sync_runs')
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('user_id')
    expect(cols).toHaveProperty('provider')
    expect(cols).toHaveProperty('started_at')
    expect(cols).toHaveProperty('finished_at')
    expect(cols).toHaveProperty('status')
    expect(cols).toHaveProperty('inserted_count')
    expect(cols).toHaveProperty('error_message')
    expect(cols).toHaveProperty('trigger')
    expect(cols.user_id.is_nullable).toBe('NO')
    expect(cols.provider.is_nullable).toBe('NO')
    expect(cols.started_at.is_nullable).toBe('NO')
    expect(cols.status.is_nullable).toBe('NO')
    expect(cols.inserted_count.is_nullable).toBe('NO')
    expect(cols.trigger.is_nullable).toBe('NO')
    expect(cols.finished_at.is_nullable).toBe('YES')
    expect(cols.error_message.is_nullable).toBe('YES')
  })

  it('has an RLS policy on live_sync_runs', async () => {
    expect(await pgPoliciesOf('live_sync_runs')).not.toHaveLength(0)
  })

  it('has a private bank-statements storage bucket with user-scoped policies', async () => {
    const client = new Client({ connectionString: TEST_DB_URL })
    await client.connect()
    try {
      const bucket = await client.query(
        `SELECT id, name, public FROM storage.buckets WHERE id = 'bank-statements'`
      )
      expect(bucket.rows).toHaveLength(1)
      expect(bucket.rows[0].public).toBe(false)

      const policies = await client.query(
        `SELECT policyname, cmd FROM pg_policies
         WHERE schemaname = 'storage' AND tablename = 'objects'
         AND policyname LIKE '%bank-statements%'`
      )
      const cmds = policies.rows.map((r) => r.cmd).sort()
      expect(cmds).toEqual(['DELETE', 'INSERT', 'SELECT', 'UPDATE'])
    } finally {
      await client.end()
    }
  })
})
