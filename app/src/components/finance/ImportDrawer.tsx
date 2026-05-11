import { useEffect, useState, type FormEvent } from 'react'
import { Drawer } from '../Drawer'
import { useSession } from '../../context/SessionContext'
import { listAccounts, type AccountRow } from '../../lib/finance/queries'
import { runImport, tryParse, type ParseAttempt } from '../../lib/finance/import'
import { extractPdfText } from '../../lib/finance/import/extractText'

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
  const [parsed, setParsed] = useState<ParseAttempt | null>(null)
  const [parsing, setParsing] = useState(false)

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

  useEffect(() => {
    if (!open || !file) {
      setParsed(null)
      return
    }
    let cancelled = false
    setParsing(true)
    setError(null)
    extractPdfText(file)
      .then((text) => {
        if (cancelled) return
        const attempt = tryParse(text)
        setParsed(attempt)
        if (attempt) {
          setPeriodStart(attempt.statement.periodStart)
          setPeriodEnd(attempt.statement.periodEnd)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(`Could not read PDF text: ${String((e as Error)?.message ?? e)}`)
      })
      .finally(() => {
        if (!cancelled) setParsing(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, file])

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
        parsed,
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
        File: <strong>{file?.name ?? '(none)'}</strong>
      </p>

      {parsing ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Reading PDF…</p>
      ) : parsed ? (
        <ParsedPreview parsed={parsed} />
      ) : file ? (
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          No matching parser. File will upload as <strong>NEEDS_REVIEW</strong>; fill the period
          manually below.
        </p>
      ) : null}

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
          {submitting ? 'Uploading…' : parsed ? `Import ${parsed.statement.transactions.length} transactions` : 'Upload'}
        </button>
      </form>
      {error ? <div className="finance-error">{error}</div> : null}
    </Drawer>
  )
}

function ParsedPreview({ parsed }: { parsed: ParseAttempt }) {
  const s = parsed.statement
  return (
    <div className="finance-parsed-preview">
      <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
        Detected <strong>{parsed.parser}</strong>. Period {s.periodStart} to {s.periodEnd}. Opening{' '}
        ${s.openingBalance} → closing ${s.closingBalance}.
      </p>
      <table className="finance-parsed-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Type</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {s.transactions.map((t, i) => (
            <tr key={i}>
              <td>{t.date}</td>
              <td>{t.description}</td>
              <td>{t.type}</td>
              <td style={{ textAlign: 'right' }}>${t.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
