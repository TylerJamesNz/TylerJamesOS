import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { normalizeHex } from '../lib/colorSpace'
import { applyPalette, syncTokenLabels } from '../lib/applyPalette'
import {
  CUSTOM_DEFAULT_PRIMARY,
  CUSTOM_DEFAULT_SECONDARY,
  deriveCustomPalette,
} from '../lib/deriveCustomPalette'
import { pickNearestSecondary } from '../lib/proposeComplementarySecondaries'
import {
  CUSTOM_PALETTE_ID,
  DEFAULT_THEME_ID,
  PALETTE_STORAGE_KEY,
  THEME_PALETTES,
  THEME_PALETTES_BY_ID,
  paletteCustom,
  type ThemePalette,
} from '../themes/palettes'

const CUSTOM_SEEDS_KEY = 'tjos-custom-palette-seeds'

function readCustomSeeds(): { primary: string; secondary: string } {
  if (typeof window === 'undefined') {
    return { primary: CUSTOM_DEFAULT_PRIMARY, secondary: CUSTOM_DEFAULT_SECONDARY }
  }
  try {
    const raw = window.localStorage.getItem(CUSTOM_SEEDS_KEY)
    if (raw) {
      const j = JSON.parse(raw) as { primary?: string; secondary?: string }
      if (j.primary && j.secondary) {
        const primary = normalizeHex(j.primary)
        const secondary = pickNearestSecondary(primary, normalizeHex(j.secondary))
        return { primary, secondary }
      }
    }
  } catch {
    /* ignore */
  }
  return { primary: CUSTOM_DEFAULT_PRIMARY, secondary: CUSTOM_DEFAULT_SECONDARY }
}

function readInitialPaletteId(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    const stored = window.localStorage.getItem(PALETTE_STORAGE_KEY)
    if (stored && THEME_PALETTES_BY_ID[stored]) return stored
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID
}

type PaletteContextValue = {
  activePalette: ThemePalette
  setPaletteId: (id: string) => void
  palettes: ThemePalette[]
  customPrimary: string
  customSecondary: string
  /** Accent derived from current custom seeds (for list swatch). */
  customAccentPreview: string
  saveCustomPalette: (primary: string, secondary: string) => void
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteIdState] = useState(readInitialPaletteId)
  const [customSeeds, setCustomSeeds] = useState(readCustomSeeds)

  const customDerived = useMemo(
    () => deriveCustomPalette(customSeeds.primary, customSeeds.secondary),
    [customSeeds]
  )

  const activePalette = useMemo((): ThemePalette => {
    if (paletteId !== CUSTOM_PALETTE_ID) {
      return THEME_PALETTES_BY_ID[paletteId] ?? THEME_PALETTES[0]
    }
    return {
      ...paletteCustom,
      cssVars: customDerived,
    }
  }, [paletteId, customDerived])

  const setPaletteId = useCallback((id: string) => {
    if (!THEME_PALETTES_BY_ID[id]) return
    setPaletteIdState(id)
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id)
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
    applyPalette(activePalette.cssVars)
    syncTokenLabels(activePalette.cssVars)
  }, [activePalette])

  const value = useMemo(
    () => ({
      activePalette,
      setPaletteId,
      palettes: THEME_PALETTES,
      customPrimary: customSeeds.primary,
      customSecondary: customSeeds.secondary,
      customAccentPreview: customDerived['--color-accent'] ?? '#196061',
      saveCustomPalette,
    }),
    [activePalette, customSeeds, customDerived, saveCustomPalette, setPaletteId]
  )

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
}

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider')
  return ctx
}
