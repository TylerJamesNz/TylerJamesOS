import { applyPalette, syncTokenLabels } from './applyPalette'
import { CUSTOM_PALETTE_ID, type ThemePalette } from '../themes/palettes'

/** Writes palette CSS variables to the document root and updates token label nodes. */
export function syncDocumentTheme(palette: ThemePalette, darkMode: boolean): void {
  applyPalette(palette.cssVars)
  syncTokenLabels(palette.cssVars)
  document.documentElement.dataset.darkMode =
    darkMode && palette.id === CUSTOM_PALETTE_ID ? 'true' : 'false'
}
