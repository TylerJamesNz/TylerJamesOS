import { Link, NavLink, Outlet } from 'react-router-dom'
import './finance.css'

export default function FinanceLayout() {
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
          <span className="finance-header-spacer" aria-hidden />
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
      <main className="finance-main">
        <Outlet />
      </main>
    </div>
  )
}
