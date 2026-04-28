import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import ThemeHelperFab from './components/ThemeHelperFab'
import { PaletteProvider } from './context/PaletteContext'
import { SessionProvider } from './context/SessionContext'
import { initTjMotionTypeHeadings } from './lib/tjMotion'
import BrandKitPage from './pages/BrandKitPage'
import HomePage from './pages/HomePage'
import PlaceholderAppPage from './pages/PlaceholderAppPage'
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
            <Route path="/" element={<HomePage />} />
            <Route path="/brand-kit" element={<BrandKitPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route
              path="/finance"
              element={
                <PlaceholderAppPage
                  title="Finance"
                  description="Budgeting, transactions, imports, and net worth will live here — aligned with the shared data model and design tokens."
                />
              }
            />
            <Route
              path="/todos"
              element={
                <RequireAuth>
                  <TodosPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ThemeHelperFab />
        </PaletteProvider>
      </SessionProvider>
    </BrowserRouter>
  )
}
