import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { computeActiveThemePalette } from './lib/computeActiveThemePalette'
import { readPaletteStateFromStorage } from './lib/paletteStorage'
import { syncDocumentTheme } from './lib/syncDocumentTheme'
import './styles/brand-kit.css'
import './styles/theme-helper.css'

const bootState = readPaletteStateFromStorage()
syncDocumentTheme(computeActiveThemePalette(bootState), bootState.darkMode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
