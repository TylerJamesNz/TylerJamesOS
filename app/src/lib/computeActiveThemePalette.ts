import { invertHex } from './colorSpace'
import { deriveCustomPalette } from './deriveCustomPalette'
import { pickNearestSecondary } from './proposeComplementarySecondaries'
import {
  CUSTOM_PALETTE_ID,
  THEME_PALETTES,
  THEME_PALETTES_BY_ID,
  paletteCustom,
  type ThemePalette,
} from '../themes/palettes'
import type { PaletteStorageState } from './paletteStorage'

/**
 * Resolves the active theme palette from runtime state (React state or a storage snapshot).
 * Single source of truth for `PaletteProvider` and boot-time `applyPalette` in `main.tsx`.
 */
export function computeActiveThemePalette(state: PaletteStorageState): ThemePalette {
  const { paletteId, customSeeds, darkMode } = state
  const customDerived = deriveCustomPalette(customSeeds.primary, customSeeds.secondary)

  const basePalette: ThemePalette =
    paletteId !== CUSTOM_PALETTE_ID
      ? (THEME_PALETTES_BY_ID[paletteId] ?? THEME_PALETTES[0])
      : {
          ...paletteCustom,
          cssVars: customDerived,
        }

  let appliedCssVars = basePalette.cssVars
  if (darkMode && basePalette.id === CUSTOM_PALETTE_ID) {
    const ip = invertHex(customSeeds.primary)
    const is = pickNearestSecondary(ip, invertHex(customSeeds.secondary))
    appliedCssVars = deriveCustomPalette(ip, is, {
      appearance: 'dark',
      pageTintHueFrom: customSeeds.primary,
    })
  }

  return {
    ...basePalette,
    cssVars: appliedCssVars,
  }
}
