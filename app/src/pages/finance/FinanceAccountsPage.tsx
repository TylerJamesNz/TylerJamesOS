import { useEffect, useState, type FormEvent } from 'react'
import { Upload } from 'lucide-react'
import { useSession } from '../../context/SessionContext'
import {
  insertAccount,
  listAccounts,
  listStatementsForAccount,
  type AccountRow,
  type StatementRow,
} from '../../lib/finance/queries'
import { signedUrlForStatement } from '../../lib/finance/import/storage'
import { ImportDrawer } from '../../components/finance/ImportDrawer'

export default function FinanceAccountsPage() {
  const { user } = useSession()
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [statementsByAccount, setStatementsByAccount] = useState<Record<string, StatementRow[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('ANZ NZ')
  const [accountType, setAccountType] = useState<'DEPOSIT' | 'INVESTMENT'>('DEPOSIT')
  const [currency, setCurrency] = useState('AUD')
  const [openingBalance, setOpeningBalance] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importAccountId, setImportAccountId] = useState<string | undefined>(undefined)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    listAccounts().then(setAccounts).catch((e) => setError(String(e?.message ?? e)))
  }, [tick])

  useEffect(() => {
    if (accounts.length === 0) return
    Promise.all(accounts.map((a) => listStatementsForAccount(a.id).then((s) => [a.id, s] as const)))
      .then((entries) => setStatementsByAccount(Object.fromEntries(entries)))
      .catch((e) => setError(String(e?.message ?? e)))
  }, [accounts, tick])

  async function openStatement(path: string): Promise<void> {
    try {
      const url = await signedUrlForStatement(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    }
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError(null)
    try {
      const row = await insertAccount({
        user_id: user.id,
        name,
        institution,
        account_type: accountType,
        currency,
        opening_balance: openingBalance ? Number(openingBalance) : null,
        colour_slot: accounts.length % 10,
      })
      setAccounts((prev) => [...prev, row])
      setName('')
      setOpeningBalance('')
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <h1 className="finance-section-title">Accounts</h1>

      <div className="finance-card">
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Add account</h2>
        <form className="finance-form" onSubmit={onSubmit}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Institution
            <input value={institution} onChange={(e) => setInstitution(e.target.value)} required />
          </label>
          <label>
            Type
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as 'DEPOSIT' | 'INVESTMENT')}
            >
              <option value="DEPOSIT">Deposit</option>
              <option value="INVESTMENT">Investment</option>
            </select>
          </label>
          <label>
            Currency
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} required />
          </label>
          <label>
            Opening balance
            <input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="optional"
            />
          </label>
          <button type="submit" disabled={submitting || !user}>
            {submitting ? 'Adding…' : 'Add account'}
          </button>
        </form>
        {error ? <div className="finance-error">{error}</div> : null}
      </div>

      {accounts.length === 0 ? (
        <div className="finance-card">
          <p className="finance-empty">No accounts yet. Add one above.</p>
        </div>
      ) : (
        accounts.map((a) => (
          <div key={a.id} className="finance-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)' }}>
                  {a.name}{' '}
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                    {a.institution} · {a.account_type} · {a.currency}
                    {a.opening_balance != null ? ` · opening ${Number(a.opening_balance).toFixed(2)}` : ''}
                  </span>
                </h2>
              </div>
              <label className="finance-import-button">
                <Upload size={14} aria-hidden /> Upload statement
                <input
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setImportFile(f)
                      setImportAccountId(a.id)
                    }
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <StatementsList
              rows={statementsByAccount[a.id] ?? []}
              onOpen={openStatement}
            />
          </div>
        ))
      )}

      <ImportDrawer
        open={importFile != null}
        file={importFile}
        prefillAccountId={importAccountId}
        onClose={() => {
          setImportFile(null)
          setImportAccountId(undefined)
        }}
        onImported={() => setTick((t) => t + 1)}
      />
    </>
  )
}

function StatementsList({
  rows,
  onOpen,
}: {
  rows: StatementRow[]
  onOpen: (path: string) => void
}) {
  if (rows.length === 0) {
    return <p className="finance-empty">No statements uploaded yet.</p>
  }
  return (
    <table className="finance-table">
      <thead>
        <tr>
          <th>Period</th>
          <th>Strategy</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.id}>
            <td>
              {s.period_start} to {s.period_end}
            </td>
            <td>{s.parser_strategy}</td>
            <td>{s.status}</td>
            <td style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => onOpen(s.storage_path)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent-on-surface)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 'var(--text-sm)',
                  padding: 0,
                }}
              >
                View PDF
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
