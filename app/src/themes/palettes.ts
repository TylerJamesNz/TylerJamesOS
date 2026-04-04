/**
 * Canonical colour palettes for Tyler James OS.
 * Import this map from any app and call applyPalette() (or mirror keys in CSS)
 * so new surfaces stay aligned with the brand kit.
 */

import {
  CUSTOM_DEFAULT_PRIMARY,
  CUSTOM_DEFAULT_SECONDARY,
  deriveCustomPalette,
} from '../lib/deriveCustomPalette'

export type ThemePalette = {
  id: string
  label: string
  description: string
  /** Where this snapshot came from */
  source: string
  /** Applied to document.documentElement as CSS custom properties */
  cssVars: Record<string, string>
}

const SHADOW_ORIGIN = {
  '--shadow-sm': '0 1px 3px rgba(21,44,54,0.08)',
  '--shadow-md': '0 4px 12px rgba(21,44,54,0.10)',
  '--shadow-lg': '0 8px 32px rgba(21,44,54,0.12)',
} as const

const SHADOW_HUE_SHIFT = {
  '--shadow-sm': '0 1px 3px rgba(21,27,54,0.08)',
  '--shadow-md': '0 4px 12px rgba(21,27,54,0.10)',
  '--shadow-lg': '0 8px 32px rgba(21,27,54,0.12)',
} as const

function shadowsFromRgb(r: number, g: number, b: number) {
  return {
    '--shadow-sm': `0 1px 3px rgba(${r},${g},${b},0.08)`,
    '--shadow-md': `0 4px 12px rgba(${r},${g},${b},0.10)`,
    '--shadow-lg': `0 8px 32px rgba(${r},${g},${b},0.12)`,
  }
}

/** Matches latest colour tokens on origin/main (teal / navy ramp). */
export const paletteOriginTeal: ThemePalette = {
  id: 'origin_teal',
  label: 'Origin teal',
  description: 'Navy text, teal accent — the ramp from origin/main before the +30° hue shift.',
  source: 'origin/main (git)',
  cssVars: {
    '--color-bg': '#F7F9F9',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#EEF2F2',
    '--color-border': '#DDE5E5',
    '--color-border-soft': '#EBF0F0',
    '--color-primary': '#152c36',
    '--color-accent': '#196061',
    '--color-accent-hover': '#0f4a4b',
    '--color-text': '#152c36',
    '--color-text-muted': '#4A6670',
    '--color-text-subtle': '#8FAAAF',
    '--color-success': '#16a34a',
    '--color-warning': '#d97706',
    '--color-destructive': '#dc2626',
    '--color-info': '#196061',
    '--color-sidebar-bg': '#152c36',
    '--color-sidebar-border': '#1e3d4a',
    '--color-sidebar-text': '#a8c4cb',
    '--color-sidebar-text-hi': '#e8f0f2',
    '--color-sidebar-accent': '#7DA0A0',
    ...SHADOW_ORIGIN,
    '--accent-rgb': '25, 96, 97',
    '--btn-secondary-hover': '#dde8e8',
    '--tag-demo-accent': '#5b6ef8',
  },
}

/** Local “+30° on the wheel” shift — cooler blue emphasis, same structure. */
export const paletteHueShift30: ThemePalette = {
  id: 'hue_shift_30',
  label: 'Hue +30° (blue shift)',
  description: 'Same roles as Origin teal, entire brand ramp rotated +30° in HSL.',
  source: 'Local development palette',
  cssVars: {
    '--color-bg': '#F7F8F9',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#EEF0F2',
    '--color-border': '#DDE1E5',
    '--color-border-soft': '#EBEEF0',
    '--color-primary': '#151B36',
    '--color-accent': '#193C61',
    '--color-accent-hover': '#0F2C4B',
    '--color-text': '#151B36',
    '--color-text-muted': '#4A5370',
    '--color-text-subtle': '#8F9AAF',
    '--color-success': '#16a34a',
    '--color-warning': '#d97706',
    '--color-destructive': '#dc2626',
    '--color-info': '#193C61',
    '--color-sidebar-bg': '#151B36',
    '--color-sidebar-border': '#1E274A',
    '--color-sidebar-text': '#A8B3CB',
    '--color-sidebar-text-hi': '#E8EBF2',
    '--color-sidebar-accent': '#7D8EA0',
    ...SHADOW_HUE_SHIFT,
    '--accent-rgb': '25, 60, 97',
    '--btn-secondary-hover': '#DDE3E8',
    '--tag-demo-accent': '#975bf8',
  },
}

/** Origin ramp rotated +72° — indigo / violet emphasis. */
export const paletteHueRot72: ThemePalette = {
  id: 'hue_rot_72',
  label: 'Hue +72° (indigo)',
  description: 'Full origin system rotated +72° on the HSL wheel.',
  source: 'Derived from Origin teal',
  cssVars: {
    '--color-bg': '#f7f7f9',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#efedf5',
    '--color-border': '#dfdde5',
    '--color-border-soft': '#ebe9f0',
    '--color-primary': '#261536',
    '--color-accent': '#281961',
    '--color-accent-hover': '#1c0f4b',
    '--color-text': '#261536',
    '--color-text-muted': '#5c4a70',
    '--color-text-subtle': '#9a8faf',
    '--color-success': '#16a34a',
    '--color-warning': '#d97706',
    '--color-destructive': '#dc2626',
    '--color-info': '#281961',
    '--color-sidebar-bg': '#261536',
    '--color-sidebar-border': '#341e4a',
    '--color-sidebar-text': '#b6a8cb',
    '--color-sidebar-text-hi': '#ece8f2',
    '--color-sidebar-accent': '#847da0',
    ...shadowsFromRgb(38, 21, 54),
    '--accent-rgb': '40, 25, 97',
    '--btn-secondary-hover': '#dfdde8',
    '--tag-demo-accent': '#f85bec',
  },
}

/** +120° — triadic move toward berry / wine accent. */
export const paletteHueRot120: ThemePalette = {
  id: 'hue_rot_120',
  label: 'Hue +120° (berry)',
  description: 'Triadic rotation — plum text, magenta accent family.',
  source: 'Derived from Origin teal',
  cssVars: {
    '--color-bg': '#f9f7f9',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#f2edf2',
    '--color-border': '#e5dde5',
    '--color-border-soft': '#f0ebf0',
    '--color-primary': '#36152c',
    '--color-accent': '#611960',
    '--color-accent-hover': '#4b0f4a',
    '--color-text': '#36152c',
    '--color-text-muted': '#704a66',
    '--color-text-subtle': '#af8faa',
    '--color-success': '#16a34a',
    '--color-warning': '#d97706',
    '--color-destructive': '#dc2626',
    '--color-info': '#611960',
    '--color-sidebar-bg': '#36152c',
    '--color-sidebar-border': '#4a1e3d',
    '--color-sidebar-text': '#cba8c4',
    '--color-sidebar-text-hi': '#f2e8f0',
    '--color-sidebar-accent': '#a07da0',
    ...shadowsFromRgb(54, 21, 44),
    '--accent-rgb': '97, 25, 96',
    '--btn-secondary-hover': '#e8dde8',
    '--tag-demo-accent': '#f85b6e',
  },
}

/** +150° — rosewood / rust accent. */
export const paletteHueRot150: ThemePalette = {
  id: 'hue_rot_150',
  label: 'Hue +150° (rosewood)',
  description: 'Rotated toward red-brown accent while keeping cool neutrals.',
  source: 'Derived from Origin teal',
  cssVars: {
    '--color-bg': '#f9f7f8',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#f2edef',
    '--color-border': '#e5dde1',
    '--color-border-soft': '#f0ebed',
    '--color-primary': '#36151b',
    '--color-accent': '#61193c',
    '--color-accent-hover': '#4b0f2c',
    '--color-text': '#36151b',
    '--color-text-muted': '#704a53',
    '--color-text-subtle': '#af8f9a',
    '--color-success': '#16a34a',
    '--color-warning': '#d97706',
    '--color-destructive': '#dc2626',
    '--color-info': '#61193c',
    '--color-sidebar-bg': '#36151b',
    '--color-sidebar-border': '#4a1e27',
    '--color-sidebar-text': '#cba8b3',
    '--color-sidebar-text-hi': '#f2e8eb',
    '--color-sidebar-accent': '#a07d8e',
    ...shadowsFromRgb(54, 21, 27),
    '--accent-rgb': '97, 25, 60',
    '--btn-secondary-hover': '#e8dde3',
    '--tag-demo-accent': '#f8975b',
  },
}

/** +180° — complementary warm accent vs cool teal origin. */
export const paletteHueRot180: ThemePalette = {
  id: 'hue_rot_180',
  label: 'Hue +180° (ember)',
  description: 'Complementary rotation — warm brick accent, cool brown text.',
  source: 'Derived from Origin teal',
  cssVars: {
    '--color-bg': '#f9f7f7',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#f2eded',
    '--color-border': '#e5dddd',
    '--color-border-soft': '#f0ebeb',
    '--color-primary': '#361f15',
    '--color-accent': '#611a19',
    '--color-accent-hover': '#4b100f',
    '--color-text': '#361f15',
    '--color-text-muted': '#70544a',
    '--color-text-subtle': '#af948f',
    '--color-success': '#16a34a',
    '--color-warning': '#d97706',
    '--color-destructive': '#dc2626',
    '--color-info': '#611a19',
    '--color-sidebar-bg': '#361f15',
    '--color-sidebar-border': '#4a2b1e',
    '--color-sidebar-text': '#cbafa8',
    '--color-sidebar-text-hi': '#f2eae8',
    '--color-sidebar-accent': '#a07d7d',
    ...shadowsFromRgb(54, 31, 21),
    '--accent-rgb': '97, 26, 25',
    '--btn-secondary-hover': '#e8dddd',
    '--tag-demo-accent': '#f8e55b',
  },
}

/** +210° — amber / bronze accent. */
export const paletteHueRot210: ThemePalette = {
  id: 'hue_rot_210',
  label: 'Hue +210° (bronze)',
  description: 'Shift toward amber-gold accent and olive-brown neutrals.',
  source: 'Derived from Origin teal',
  cssVars: {
    '--color-bg': '#f9f8f7',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#f2f0ed',
    '--color-border': '#e5e1dd',
    '--color-border-soft': '#f0eeeb',
    '--color-primary': '#363015',
    '--color-accent': '#613e19',
    '--color-accent-hover': '#4b2e0f',
    '--color-text': '#363015',
    '--color-text-muted': '#70674a',
    '--color-text-subtle': '#afa48f',
    '--color-success': '#16a34a',
    '--color-warning': '#d97706',
    '--color-destructive': '#dc2626',
    '--color-info': '#613e19',
    '--color-sidebar-bg': '#363015',
    '--color-sidebar-border': '#4a411e',
    '--color-sidebar-text': '#cbc1a8',
    '--color-sidebar-text-hi': '#f2efe8',
    '--color-sidebar-accent': '#a08f7d',
    ...shadowsFromRgb(54, 48, 21),
    '--accent-rgb': '97, 62, 25',
    '--btn-secondary-hover': '#e8e3dd',
    '--tag-demo-accent': '#bcf85b',
  },
}

/** +270° — lime / chartreuse accent (90° from teal the other way). */
export const paletteHueRot270: ThemePalette = {
  id: 'hue_rot_270',
  label: 'Hue +270° (chartreuse)',
  description: 'Strong shift toward yellow-green accent and forest text.',
  source: 'Derived from Origin teal',
  cssVars: {
    '--color-bg': '#f8f9f7',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#edf0eb',
    '--color-border': '#e1e5dd',
    '--color-border-soft': '#e9ebe5',
    '--color-primary': '#1b3615',
    '--color-accent': '#3c6119',
    '--color-accent-hover': '#2c4b0f',
    '--color-text': '#1b3615',
    '--color-text-muted': '#53704a',
    '--color-text-subtle': '#9aaf8f',
    '--color-success': '#16a34a',
    '--color-warning': '#d97706',
    '--color-destructive': '#dc2626',
    '--color-info': '#3c6119',
    '--color-sidebar-bg': '#1b3615',
    '--color-sidebar-border': '#274a1e',
    '--color-sidebar-text': '#b3cba8',
    '--color-sidebar-text-hi': '#ebf2e8',
    '--color-sidebar-accent': '#8fa07d',
    ...shadowsFromRgb(27, 54, 21),
    '--accent-rgb': '60, 97, 25',
    '--btn-secondary-hover': '#e3e8dd',
    '--tag-demo-accent': '#5bf897',
  },
}

/** Dark “editor” chrome — high contrast, neon teal accent. */
export const paletteWildcardNoir: ThemePalette = {
  id: 'wildcard_noir',
  label: 'Wildcard · Noir terminal',
  description: 'Near-OLED surfaces, electric teal accent, adjusted semantic hues for dark UI.',
  source: 'Wildcard',
  cssVars: {
    '--color-bg': '#0e0e12',
    '--color-surface': '#16161c',
    '--color-surface-2': '#1c1c24',
    '--color-border': '#2e2e38',
    '--color-border-soft': '#22222a',
    '--color-primary': '#ececf0',
    '--color-accent': '#5eead4',
    '--color-accent-hover': '#2dd4bf',
    '--color-text': '#ececf0',
    '--color-text-muted': '#9898a6',
    '--color-text-subtle': '#6c6c7a',
    '--color-success': '#4ade80',
    '--color-warning': '#fbbf24',
    '--color-destructive': '#f87171',
    '--color-info': '#38bdf8',
    '--color-sidebar-bg': '#08080c',
    '--color-sidebar-border': '#1a1a22',
    '--color-sidebar-text': '#888899',
    '--color-sidebar-text-hi': '#f4f4f8',
    '--color-sidebar-accent': '#5eead4',
    ...shadowsFromRgb(0, 0, 0),
    '--accent-rgb': '94, 234, 212',
    '--btn-secondary-hover': '#252530',
    '--tag-demo-accent': '#c084fc',
  },
}

/** Warm paper, sepia ink, amber CTA. */
export const paletteWildcardPaper: ThemePalette = {
  id: 'wildcard_paper',
  label: 'Wildcard · Paper & ink',
  description: 'Cream stock, brown type, amber accent — editorial / notebook feel.',
  source: 'Wildcard',
  cssVars: {
    '--color-bg': '#faf6f0',
    '--color-surface': '#fffdf8',
    '--color-surface-2': '#f3ece4',
    '--color-border': '#e5d9ce',
    '--color-border-soft': '#efe6dc',
    '--color-primary': '#3d2e25',
    '--color-accent': '#b45309',
    '--color-accent-hover': '#92400e',
    '--color-text': '#3d2e25',
    '--color-text-muted': '#6b5344',
    '--color-text-subtle': '#a08b7a',
    '--color-success': '#15803d',
    '--color-warning': '#b45309',
    '--color-destructive': '#b91c1c',
    '--color-info': '#b45309',
    '--color-sidebar-bg': '#2c221c',
    '--color-sidebar-border': '#433329',
    '--color-sidebar-text': '#c4b5a8',
    '--color-sidebar-text-hi': '#faf6f0',
    '--color-sidebar-accent': '#d97706',
    ...shadowsFromRgb(61, 46, 37),
    '--accent-rgb': '180, 83, 9',
    '--btn-secondary-hover': '#e8ddd4',
    '--tag-demo-accent': '#7c3aed',
  },
}

/** Neon purple fantasy UI — not for accessibility-critical flows. */
export const paletteWildcardSynthwave: ThemePalette = {
  id: 'wildcard_synthwave',
  label: 'Wildcard · Synthwave',
  description: 'Violet void, hot pink accent, cyan highlights — loud on purpose.',
  source: 'Wildcard',
  cssVars: {
    '--color-bg': '#1a0b2e',
    '--color-surface': '#2d1b4e',
    '--color-surface-2': '#3d2a5c',
    '--color-border': '#5b3c8f',
    '--color-border-soft': '#3d2658',
    '--color-primary': '#f4ecff',
    '--color-accent': '#ff2d92',
    '--color-accent-hover': '#e11d7e',
    '--color-text': '#f4ecff',
    '--color-text-muted': '#c4b5dc',
    '--color-text-subtle': '#9b8ab8',
    '--color-success': '#4ade80',
    '--color-warning': '#fde047',
    '--color-destructive': '#fb7185',
    '--color-info': '#22d3ee',
    '--color-sidebar-bg': '#12061f',
    '--color-sidebar-border': '#2d1b4e',
    '--color-sidebar-text': '#a78bfa',
    '--color-sidebar-text-hi': '#faf5ff',
    '--color-sidebar-accent': '#ff2d92',
    ...shadowsFromRgb(26, 11, 46),
    '--accent-rgb': '255, 45, 146',
    '--btn-secondary-hover': '#3d2a5c',
    '--tag-demo-accent': '#00fff0',
  },
}

/** Quiet sage field — calm product UI. */
export const paletteWildcardOatMoss: ThemePalette = {
  id: 'wildcard_oat_moss',
  label: 'Wildcard · Oat & moss',
  description: 'Oat background, forest green type, muted sage accent.',
  source: 'Wildcard',
  cssVars: {
    '--color-bg': '#f4f2eb',
    '--color-surface': '#fffcf7',
    '--color-surface-2': '#ebe8df',
    '--color-border': '#d8d4c8',
    '--color-border-soft': '#e8e4da',
    '--color-primary': '#2d3a2d',
    '--color-accent': '#4f6f52',
    '--color-accent-hover': '#3d523f',
    '--color-text': '#2d3a2d',
    '--color-text-muted': '#5c6659',
    '--color-text-subtle': '#8a9289',
    '--color-success': '#3f6212',
    '--color-warning': '#a16207',
    '--color-destructive': '#b91c1c',
    '--color-info': '#4f6f52',
    '--color-sidebar-bg': '#243024',
    '--color-sidebar-border': '#364236',
    '--color-sidebar-text': '#a8b5a8',
    '--color-sidebar-text-hi': '#eef2ee',
    '--color-sidebar-accent': '#6b8f71',
    ...shadowsFromRgb(45, 58, 45),
    '--accent-rgb': '79, 111, 82',
    '--btn-secondary-hover': '#dde2d9',
    '--tag-demo-accent': '#ca8a04',
  },
}

export const CUSTOM_PALETTE_ID = 'custom' as const

/** Listed in the theme helper; runtime values come from deriveCustomPalette(seeds). */
export const paletteCustom: ThemePalette = {
  id: CUSTOM_PALETTE_ID,
  label: 'Custom',
  description:
    'Primary tints the page; sidebar uses your primary as-is. Body text and sidebar labels are contrast-balanced automatically so extreme picks stay legible (presets are unchanged).',
  source: 'Your colours',
  cssVars: deriveCustomPalette(CUSTOM_DEFAULT_PRIMARY, CUSTOM_DEFAULT_SECONDARY),
}

export const THEME_PALETTES: ThemePalette[] = [
  paletteCustom,
  paletteOriginTeal,
  paletteHueShift30,
  paletteHueRot72,
  paletteHueRot120,
  paletteHueRot150,
  paletteHueRot180,
  paletteHueRot210,
  paletteHueRot270,
  paletteWildcardNoir,
  paletteWildcardPaper,
  paletteWildcardSynthwave,
  paletteWildcardOatMoss,
]

export const THEME_PALETTES_BY_ID: Record<string, ThemePalette> = Object.fromEntries(
  THEME_PALETTES.map((p) => [p.id, p])
)

export const DEFAULT_THEME_ID = paletteHueShift30.id

export const PALETTE_STORAGE_KEY = 'tjos-theme-palette-id'
