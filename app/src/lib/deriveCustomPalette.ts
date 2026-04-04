import {
  clamp,
  contrastRatio,
  ensureContrast,
  hexToRgb,
  hslToHex,
  mixHex,
  normalizeHex,
  relativeLuminance,
  rgbToHsl,
} from './colorSpace'

const DEFAULT_PRIMARY = '#152c36'
const DEFAULT_SECONDARY = '#7da0a0'

const RATIO_BODY = 4.5
const RATIO_SIDEBAR = 4.5
const RATIO_SIDEBAR_ACCENT = 3.1
const RATIO_ON_ACCENT_BTN = 4.5
const RATIO_MUTED = 3.1

/** Darken a candidate CTA colour until white label text passes contrast on it. */
function ensureAccentForWhiteLabel(accent: string): string {
  let a = normalizeHex(accent)
  for (let i = 0; i < 28; i++) {
    if (contrastRatio('#ffffff', a) >= RATIO_ON_ACCENT_BTN) return a
    a = mixHex(a, '#0f172a', 0.12)
  }
  return '#0f172a'
}

function shadowRgbFromHex(hex: string): { r: number; g: number; b: number } {
  return hexToRgb(hex)
}

/**
 * Builds a full CSS variable map from two seeds. **Custom-only:** enforces readable contrast
 * (sidebar, body, muted text, CTA-on-white) so light or neon primaries do not match preset
 * palettes but stay usable. Preset themes in `palettes.ts` are unchanged.
 *
 * - **Primary** → sidebar shell + page neutrals (tinted bg/border); body text stays mostly neutral slate with a
 *   light primary tint so chromatic primaries do not stain type olive/green.
 * - **Secondary** → sidebar accent + CTA family (clamped for white-on-accent buttons).
 */
export function deriveCustomPalette(primaryInput: string, secondaryInput: string): Record<string, string> {
  const primary = normalizeHex(primaryInput || DEFAULT_PRIMARY)
  const secondary = normalizeHex(secondaryInput || DEFAULT_SECONDARY)

  const Pr = hexToRgb(primary)
  const Ph = rgbToHsl(Pr.r, Pr.g, Pr.b)
  const secRgb = hexToRgb(secondary)
  const Sh = rgbToHsl(secRgb.r, secRgb.g, secRgb.b)

  const hP = Ph.h
  const pageBg = hslToHex(hP, 0.045, 0.976)
  const surface2 = hslToHex(hP, 0.055, 0.936)
  const border = hslToHex(hP, 0.085, 0.885)
  const borderSoft = hslToHex(hP, 0.065, 0.928)

  // Body / “primary” token: must read on page background (user may pick a light “brand” blue).
  // Keep page text mostly neutral slate; high `t` toward primary makes headings muddy (e.g. olive on cream).
  const textSeed =
    contrastRatio(primary, pageBg) >= RATIO_BODY
      ? primary
      : ensureContrast(mixHex('#0f172a', primary, 0.2), pageBg, RATIO_BODY, 'darker')
  const bodyText = ensureContrast(textSeed, pageBg, RATIO_BODY, 'darker')
  const textMuted = ensureContrast(mixHex(bodyText, '#64748b', 0.45), pageBg, RATIO_MUTED, 'auto')
  const textSubtle = ensureContrast(mixHex(bodyText, '#94a3b8', 0.55), pageBg, RATIO_MUTED, 'auto')

  const sidebarBg = primary
  const lightFgBetter = contrastRatio('#ffffff', sidebarBg) >= contrastRatio('#111111', sidebarBg)

  // mixHex(a,b,t) lerps toward b — heavy b here was ~78% chromatic sidebar → olive on yellow. Bias slate/white.
  const sidebarTextSeed = lightFgBetter
    ? mixHex('#f8fafc', sidebarBg, 0.16)
    : mixHex('#0f172a', sidebarBg, 0.12)
  const sidebarText = ensureContrast(
    sidebarTextSeed,
    sidebarBg,
    RATIO_SIDEBAR,
    lightFgBetter ? 'lighter' : 'darker'
  )

  const sidebarHiSeed = lightFgBetter ? mixHex(sidebarText, '#ffffff', 0.28) : mixHex(sidebarText, '#f8fafc', 0.15)
  const sidebarHi = ensureContrast(sidebarHiSeed, sidebarBg, RATIO_SIDEBAR, lightFgBetter ? 'lighter' : 'darker')

  const sidebarBorderSeed = lightFgBetter
    ? mixHex(sidebarBg, '#ffffff', 0.22)
    : mixHex(sidebarBg, '#000000', 0.28)
  const sidebarBorder = ensureContrast(sidebarBorderSeed, sidebarBg, 2.8, lightFgBetter ? 'lighter' : 'darker')

  let sidebarAccent = secondary
  if (contrastRatio(sidebarAccent, sidebarBg) < RATIO_SIDEBAR_ACCENT) {
    sidebarAccent = ensureContrast(
      sidebarAccent,
      sidebarBg,
      RATIO_SIDEBAR_ACCENT,
      lightFgBetter ? 'lighter' : 'darker'
    )
  }

  const accentSat = clamp(Sh.s + 0.32, 0.48, 0.9)
  const accentL = clamp(Sh.l * 0.48, 0.18, 0.42)
  let accent = hslToHex(Sh.h, accentSat, accentL)
  accent = ensureAccentForWhiteLabel(accent)
  const accentHover = ensureAccentForWhiteLabel(mixHex(accent, '#000000', 0.18))

  const { r, g, b } = hexToRgb(accent)
  const lumBody = relativeLuminance(bodyText)
  const shadowBase = shadowRgbFromHex(lumBody < 0.4 ? bodyText : mixHex(bodyText, '#0f172a', 0.65))

  const btnHover = ensureContrast(
    hslToHex(Sh.h, 0.12, 0.91),
    pageBg,
    2.5,
    relativeLuminance(pageBg) > 0.9 ? 'darker' : 'auto'
  )
  const tagDemo = hslToHex((Sh.h + 5 / 12) % 1, 0.62, 0.54)

  return {
    '--color-bg': pageBg,
    '--color-surface': '#ffffff',
    '--color-surface-2': surface2,
    '--color-border': border,
    '--color-border-soft': borderSoft,
    '--color-primary': bodyText,
    '--color-accent': accent,
    '--color-accent-hover': accentHover,
    '--color-text': bodyText,
    '--color-text-muted': textMuted,
    '--color-text-subtle': textSubtle,
    '--color-success': '#16a34a',
    '--color-warning': '#d97706',
    '--color-destructive': '#dc2626',
    '--color-info': accent,
    '--color-sidebar-bg': sidebarBg,
    '--color-sidebar-border': sidebarBorder,
    '--color-sidebar-text': sidebarText,
    '--color-sidebar-text-hi': sidebarHi,
    '--color-sidebar-accent': sidebarAccent,
    '--shadow-sm': `0 1px 3px rgba(${shadowBase.r},${shadowBase.g},${shadowBase.b},0.08)`,
    '--shadow-md': `0 4px 12px rgba(${shadowBase.r},${shadowBase.g},${shadowBase.b},0.10)`,
    '--shadow-lg': `0 8px 32px rgba(${shadowBase.r},${shadowBase.g},${shadowBase.b},0.12)`,
    '--accent-rgb': `${r}, ${g}, ${b}`,
    '--btn-secondary-hover': btnHover,
    '--tag-demo-accent': tagDemo,
  }
}

export const CUSTOM_DEFAULT_PRIMARY = DEFAULT_PRIMARY
export const CUSTOM_DEFAULT_SECONDARY = DEFAULT_SECONDARY
