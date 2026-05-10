import { useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../../context/SessionContext'
import { insertAccount, listAccounts, type AccountRow } from '../../lib/finance/queries'

export default function FinanceAccountsPage() {
  const { user } = useSession()
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('ANZ NZ')
  const [accountType, setAccountType] = useState<'DEPOSIT' | 'INVESTMENT'>('DEPOSIT')
  const [currency, setCurrency] = useState('AUD')
  const [openingBalance, setOpeningBalance] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listAccounts().then(setAccounts).catch((e) => setError(String(e?.message ?? e)))
  }, [])

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

      <div className="finance-card">
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Your accounts</h2>
        {accounts.length === 0 ? (
          <p className="finance-empty">No accounts yet. Add one above.</p>
        ) : (
          <table className="finance-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Institution</th>
                <th>Type</th>
                <th>Currency</th>
                <th style={{ textAlign: 'right' }}>Opening balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.institution}</td>
                  <td>{a.account_type}</td>
                  <td>{a.currency}</td>
                  <td style={{ textAlign: 'right' }}>
                    {a.opening_balance != null ? a.opening_balance.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
