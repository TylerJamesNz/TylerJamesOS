import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import ThemeHelperFab from './components/ThemeHelperFab'
import { PaletteProvider } from './context/PaletteContext'
import { SessionProvider } from './context/SessionContext'
import { initTjMotionTypeHeadings } from './lib/tjMotion'
import BrandKitPage from './pages/BrandKitPage'
import FinanceLayout from './pages/finance/FinanceLayout'
import FinancePage from './pages/finance/FinancePage'
import FinanceAccountsPage from './pages/finance/FinanceAccountsPage'
import FinanceTransactionsPage from './pages/finance/FinanceTransactionsPage'
import HomePage from './pages/HomePage'
import SignInPage from './pages/SignInPage'
import TodosPage from './pages/TodosPage'

function useTjMotionTypeInit() {
  useEffect(() => {
    let cancelled = false
    const run = () => {
      if (!cancelled) initTjMotionTypeHeadings(document.body)
    }
    void document.fonts.ready.then(() => {
      requestAnimationFrame(run)
    })
    return () => {
      cancelled = true
    }
  }, [])
}

export default function App() {
  useTjMotionTypeInit()

  return (
    <BrowserRouter>
      <SessionProvider>
        <PaletteProvider>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route
              element={
                <RequireAuth>
                  <Outlet />
                </RequireAuth>
              }
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/brand-kit" element={<BrandKitPage />} />
              <Route element={<FinanceLayout />}>
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/finance/transactions" element={<FinanceTransactionsPage />} />
                <Route path="/finance/accounts" element={<FinanceAccountsPage />} />
              </Route>
              <Route path="/todos" element={<TodosPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <ThemeHelperFab />
        </PaletteProvider>
      </SessionProvider>
    </BrowserRouter>
  )
}
