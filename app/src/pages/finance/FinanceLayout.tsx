import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { DragOverlay } from '../../components/finance/DragOverlay'
import { ImportDrawer } from '../../components/finance/ImportDrawer'
import './finance.css'

export default function FinanceLayout() {
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [importTick, setImportTick] = useState(0)
  const location = useLocation()
  const prefillAccountIdFromQs = new URLSearchParams(location.search).get('account') ?? undefined

  return (
    <div className="finance">
      <header className="finance-header">
        <div className="finance-header-inner">
          <Link to="/" className="finance-back">
            ← Home
          </Link>
          <Link to="/" className="finance-logo">
            TylerJames<span>OS</span>
          </Link>
          <span className="finance-header-spacer">
            <label className="finance-import-button">
              <Upload size={16} aria-hidden /> Import
              <input
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setPendingFile(f)
                  e.target.value = ''
                }}
              />
            </label>
          </span>
        </div>
      </header>
      <nav className="finance-subnav">
        <NavLink to="/finance" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Overview
        </NavLink>
        <NavLink to="/finance/transactions" className={({ isActive }) => (isActive ? 'active' : '')}>
          Transactions
        </NavLink>
        <NavLink to="/finance/accounts" className={({ isActive }) => (isActive ? 'active' : '')}>
          Accounts
        </NavLink>
      </nav>
      <main className="finance-main" key={importTick}>
        <Outlet />
      </main>
      <DragOverlay onFileDropped={setPendingFile} />
      <ImportDrawer
        open={pendingFile != null}
        file={pendingFile}
        prefillAccountId={prefillAccountIdFromQs}
        onClose={() => setPendingFile(null)}
        onImported={() => setImportTick((t) => t + 1)}
      />
    </div>
  )
}
