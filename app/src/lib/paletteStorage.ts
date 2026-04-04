import { normalizeHex } from './colorSpace'
import { CUSTOM_DEFAULT_PRIMARY, CUSTOM_DEFAULT_SECONDARY } from './deriveCustomPalette'
import { pickNearestSecondary } from './proposeComplementarySecondaries'
import { DEFAULT_THEME_ID, PALETTE_STORAGE_KEY, THEME_PALETTES_BY_ID } from '../themes/palettes'

const CUSTOM_SEEDS_KEY = 'tjos-custom-palette-seeds'
const DARK_MODE_KEY = 'tjos-dark-mode'

export type PaletteStorageState = {
  paletteId: string
  customSeeds: { primary: string; secondary: string }
  darkMode: boolean
}

export function readDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DARK_MODE_KEY) === '1'
  } catch {
    return false
  }
}

export function readCustomSeeds(): { primary: string; secondary: string } {
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

export function readInitialPaletteId(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    const stored = window.localStorage.getItem(PALETTE_STORAGE_KEY)
    if (stored && THEME_PALETTES_BY_ID[stored]) return stored
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID
}

/** Snapshot of persisted theme state (same keys as `PaletteProvider` uses). */
export function readPaletteStateFromStorage(): PaletteStorageState {
  return {
    paletteId: readInitialPaletteId(),
    customSeeds: readCustomSeeds(),
    darkMode: readDarkMode(),
  }
}

export { CUSTOM_SEEDS_KEY, DARK_MODE_KEY, PALETTE_STORAGE_KEY }
