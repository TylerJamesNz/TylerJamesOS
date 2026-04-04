import { mixHex } from './colorSpace'
import type { ThemePalette } from '../themes/palettes'

/**
 * Sidebar gradient: **sidebar base only** (same token as Origin teal’s `--color-sidebar-bg`) ramped toward
 * slate — mirrors a primary-hued shell without folding in `--color-sidebar-accent`. Secondary stays on labels,
 * links, and CTAs only.
 * `--color-sidebar-bg` stays the solid hex for tokens / contrast reference.
 */
export function mergeSidebarPresentation(cssVars: Record<string, string>): Record<string, string> {
  const base = cssVars['--color-sidebar-bg']
  if (!base) return { ...cssVars }
  if (base.includes('gradient')) {
    return { ...cssVars, '--color-sidebar-bg-gradient': base }
  }
  const end = mixHex(base, '#0f172a', 0.46)
  const mid = mixHex(base, end, 0.5)
  return {
    ...cssVars,
    '--color-sidebar-bg-gradient': `linear-gradient(172deg, ${base} 0%, ${mid} 52%, ${end} 100%)`,
  }
}

/** Writes palette CSS variables to :root (the document element). */
export function applyPalette(cssVars: ThemePalette['cssVars']): void {
  const merged = mergeSidebarPresentation({ ...(cssVars as Record<string, string>) })
  if (!merged['--color-accent-on-surface'] && merged['--color-accent']) {
    merged['--color-accent-on-surface'] = merged['--color-accent']
  }
  const root = document.documentElement
  for (const [key, value] of Object.entries(merged)) {
    root.style.setProperty(key, value)
  }
}

/** Fills [data-sync-token] nodes with hex values from the active palette (colour swatch labels). */
export function syncTokenLabels(cssVars: ThemePalette['cssVars']): void {
  const vars = cssVars as Record<string, string | undefined>
  document.querySelectorAll<HTMLElement>('[data-sync-token]').forEach((el) => {
    const key = el.dataset.syncToken
    if (!key) return
    const resolved =
      vars[key] ?? (key === '--color-sidebar-label' ? vars['--color-sidebar-accent'] : undefined)
    if (resolved != null) el.textContent = resolved
  })
}
