import type { ThemePalette } from '../themes/palettes'

/** Writes palette CSS variables to :root (the document element). */
export function applyPalette(cssVars: ThemePalette['cssVars']): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value)
  }
}

/** Fills [data-sync-token] nodes with hex values from the active palette (colour swatch labels). */
export function syncTokenLabels(cssVars: ThemePalette['cssVars']): void {
  document.querySelectorAll<HTMLElement>('[data-sync-token]').forEach((el) => {
    const key = el.dataset.syncToken
    if (key && cssVars[key] != null) {
      el.textContent = cssVars[key]
    }
  })
}
