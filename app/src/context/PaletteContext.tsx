import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { normalizeHex } from '../lib/colorSpace'
import { computeActiveThemePalette } from '../lib/computeActiveThemePalette'
import {
  CUSTOM_SEEDS_KEY,
  DARK_MODE_KEY,
  PALETTE_STORAGE_KEY,
  readCustomSeeds,
  readDarkMode,
  readInitialPaletteId,
} from '../lib/paletteStorage'
import { syncDocumentTheme } from '../lib/syncDocumentTheme'
import { pickNearestSecondary } from '../lib/proposeComplementarySecondaries'
import {
  CUSTOM_PALETTE_ID,
  THEME_PALETTES,
  THEME_PALETTES_BY_ID,
  type ThemePalette,
} from '../themes/palettes'

type PaletteContextValue = {
  activePalette: ThemePalette
  setPaletteId: (id: string) => void
  palettes: ThemePalette[]
  customPrimary: string
  customSecondary: string
  /** Accent derived from current custom seeds (for list swatch). */
  customAccentPreview: string
  saveCustomPalette: (primary: string, secondary: string) => void
  darkMode: boolean
  setDarkMode: (on: boolean) => void
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

export function PaletteProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [paletteId, setPaletteIdState] = useState(readInitialPaletteId)
  const [customSeeds, setCustomSeeds] = useState(readCustomSeeds)
  const [darkMode, setDarkModeState] = useState(readDarkMode)

  const activePalette = useMemo(
    () => computeActiveThemePalette({ paletteId, customSeeds, darkMode }),
    [paletteId, customSeeds, darkMode]
  )

  const setPaletteId = useCallback((id: string) => {
    if (!THEME_PALETTES_BY_ID[id]) return
    setPaletteIdState(id)
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const setDarkMode = useCallback((on: boolean) => {
    setDarkModeState(on)
    try {
      window.localStorage.setItem(DARK_MODE_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const saveCustomPalette = useCallback((primary: string, secondary: string) => {
    const pri = normalizeHex(primary)
    const next = { primary: pri, secondary: pickNearestSecondary(pri, normalizeHex(secondary)) }
    setCustomSeeds(next)
    setPaletteIdState(CUSTOM_PALETTE_ID)
    try {
      window.localStorage.setItem(CUSTOM_SEEDS_KEY, JSON.stringify(next))
      window.localStorage.setItem(PALETTE_STORAGE_KEY, CUSTOM_PALETTE_ID)
    } catch {
      /* ignore */
    }
  }, [])

  useLayoutEffect(() => {
    syncDocumentTheme(activePalette, darkMode)
  }, [activePalette, darkMode, pathname])

  const value = useMemo(
    () => ({
      activePalette,
      setPaletteId,
      palettes: THEME_PALETTES,
      customPrimary: customSeeds.primary,
      customSecondary: customSeeds.secondary,
      customAccentPreview: activePalette.cssVars['--color-accent'] ?? '#196061',
      saveCustomPalette,
      darkMode,
      setDarkMode,
    }),
    [activePalette, customSeeds, saveCustomPalette, setPaletteId, darkMode, setDarkMode]
  )

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
}

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider')
  return ctx
}
