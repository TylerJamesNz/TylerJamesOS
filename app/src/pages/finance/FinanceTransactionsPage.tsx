import { useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../../context/SessionContext'
import {
  insertTransaction,
  listAccounts,
  listTransactions,
  type AccountRow,
  type TransactionRow,
} from '../../lib/finance/queries'

type Row = TransactionRow & { account: { name: string } | null }

export default function FinanceTransactionsPage() {
  const { user } = useSession()
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [transactions, setTransactions] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'DEBIT' | 'CREDIT'>('DEBIT')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listAccounts()
      .then((a) => {
        setAccounts(a)
        if (a[0]) setAccountId(a[0].id)
      })
      .catch((e) => setError(String(e?.message ?? e)))
    listTransactions().then(setTransactions).catch((e) => setError(String(e?.message ?? e)))
  }, [])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!user || !accountId) return
    setSubmitting(true)
    setError(null)
    try {
      const row = await insertTransaction({
        user_id: user.id,
        account_id: accountId,
        date,
        description,
        amount: Number(amount),
        type,
      })
      const account = accounts.find((a) => a.id === accountId) ?? null
      setTransactions((prev) => [
        { ...row, account: account ? { name: account.name } : null } as Row,
        ...prev,
      ])
      setDescription('')
      setAmount('')
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <h1 className="finance-section-title">Transactions</h1>

      <div className="finance-card">
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Add transaction</h2>
        {accounts.length === 0 ? (
          <p className="finance-empty">Add an account first on the Accounts tab.</p>
        ) : (
          <>
            <form className="finance-form" onSubmit={onSubmit}>
              <label>
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label>
                Account
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <input value={description} onChange={(e) => setDescription(e.target.value)} required />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </label>
              <label>
                Type
                <select value={type} onChange={(e) => setType(e.target.value as 'DEBIT' | 'CREDIT')}>
                  <option value="DEBIT">Debit (out)</option>
                  <option value="CREDIT">Credit (in)</option>
                </select>
              </label>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add transaction'}
              </button>
            </form>
            {error ? <div className="finance-error">{error}</div> : null}
          </>
        )}
      </div>

      <div className="finance-card">
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Your transactions</h2>
        {transactions.length === 0 ? (
          <p className="finance-empty">No transactions yet.</p>
        ) : (
          <table className="finance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td>{t.account?.name ?? '—'}</td>
                  <td className={t.type === 'DEBIT' ? 'finance-amount-debit' : 'finance-amount-credit'}>
                    {t.type === 'DEBIT' ? '−' : '+'}
                    {Number(t.amount).toFixed(2)}
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
