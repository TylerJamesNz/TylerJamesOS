import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ThemeHelperFab from './components/ThemeHelperFab'
import { PaletteProvider } from './context/PaletteContext'
import { initTjMotionTypeHeadings } from './lib/tjMotion'
import BrandKitPage from './pages/BrandKitPage'
import HomePage from './pages/HomePage'
import PlaceholderAppPage from './pages/PlaceholderAppPage'

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
      <PaletteProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/brand-kit" element={<BrandKitPage />} />
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
              <PlaceholderAppPage
                title="Todos"
                description="Task lists, priorities, and due dates will live here — same navigation and visual system as the rest of Tyler James OS."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ThemeHelperFab />
      </PaletteProvider>
    </BrowserRouter>
  )
}
