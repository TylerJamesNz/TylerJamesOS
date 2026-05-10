import { useEffect, useState, type FormEvent } from 'react'
import { Drawer } from '../Drawer'
import { useSession } from '../../context/SessionContext'
import { listAccounts, type AccountRow } from '../../lib/finance/queries'
import { runImport } from '../../lib/finance/import'

type Props = {
  open: boolean
  file: File | null
  prefillAccountId?: string
  onClose: () => void
  onImported: () => void
}

export function ImportDrawer({ open, file, prefillAccountId, onClose, onImported }: Props) {
  const { user } = useSession()
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [accountId, setAccountId] = useState(prefillAccountId ?? '')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    listAccounts()
      .then((a) => {
        setAccounts(a)
        if (!accountId && a[0]) setAccountId(a[0].id)
      })
      .catch((e) => setError(String(e?.message ?? e)))
  }, [open, accountId])

  useEffect(() => {
    if (prefillAccountId) setAccountId(prefillAccountId)
  }, [prefillAccountId])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!user || !file || !accountId) return
    setSubmitting(true)
    setError(null)
    try {
      await runImport({
        userId: user.id,
        accountId,
        periodStart,
        periodEnd,
        file,
      })
      onImported()
      onClose()
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Import statement">
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        File: <strong>{file?.name ?? '(none)'}</strong>. Parsing arrives in #27 (T1c). For now the
        file uploads to private storage and a Statement row is created with status NEEDS_REVIEW.
      </p>
      <form className="finance-form" onSubmit={onSubmit}>
        <label>
          Account
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            <option value="" disabled>
              Pick an account
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Period start
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
          />
        </label>
        <label>
          Period end
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={submitting || !file || !accountId}>
          {submitting ? 'Uploading…' : 'Upload'}
        </button>
      </form>
      {error ? <div className="finance-error">{error}</div> : null}
    </Drawer>
  )
}
