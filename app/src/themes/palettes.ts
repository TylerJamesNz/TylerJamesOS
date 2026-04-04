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

/** Unofficial vibe snapshots — not affiliated with the products named in labels. */
export const paletteProductJiraBlue: ThemePalette = {
  id: 'product_jira_blue',
  label: 'Product · Jira blue',
  description: 'Navy backlog shell, electric board blue—ticket closed, dopamine unlocked.',
  source: 'Inspired by Atlassian Jira',
  cssVars: {
    '--color-bg': '#F7F8F9',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#EBECF0',
    '--color-border': '#DFE1E6',
    '--color-border-soft': '#F4F5F7',
    '--color-primary': '#172B4D',
    '--color-accent': '#0052CC',
    '--color-accent-hover': '#0747A6',
    '--color-text': '#172B4D',
    '--color-text-muted': '#5E6C84',
    '--color-text-subtle': '#97A0AF',
    '--color-success': '#00875A',
    '--color-warning': '#FFAB00',
    '--color-destructive': '#DE350B',
    '--color-info': '#0052CC',
    '--color-sidebar-bg': '#0747A6',
    '--color-sidebar-border': '#0052CC',
    '--color-sidebar-text': '#DEEBFF',
    '--color-sidebar-text-hi': '#ffffff',
    '--color-sidebar-accent': '#4C9AFF',
    '--color-sidebar-label': '#B3CEF0',
    ...shadowsFromRgb(7, 71, 166),
    '--accent-rgb': '0, 82, 204',
    '--btn-secondary-hover': '#DEEBFF',
    '--tag-demo-accent': '#6554C0',
  },
}

export const paletteProductConfluenceTeal: ThemePalette = {
  id: 'product_confluence_teal',
  label: 'Product · Confluence teal',
  description: 'Doc-green accent on warm paper—wiki energy without the stale links.',
  source: 'Inspired by Atlassian Confluence',
  cssVars: {
    '--color-bg': '#FAFBFC',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#E6FCFF',
    '--color-border': '#DFE1E6',
    '--color-border-soft': '#F4F5F7',
    '--color-primary': '#172B4D',
    '--color-accent': '#008DA6',
    '--color-accent-hover': '#006B7D',
    '--color-text': '#172B4D',
    '--color-text-muted': '#5E6C84',
    '--color-text-subtle': '#97A0AF',
    '--color-success': '#00875A',
    '--color-warning': '#FFAB00',
    '--color-destructive': '#DE350B',
    '--color-info': '#008DA6',
    '--color-sidebar-bg': '#0747A6',
    '--color-sidebar-border': '#0052CC',
    '--color-sidebar-text': '#DEEBFF',
    '--color-sidebar-text-hi': '#ffffff',
    '--color-sidebar-accent': '#79E2F2',
    '--color-sidebar-label': '#B3E5F0',
    ...shadowsFromRgb(0, 141, 166),
    '--accent-rgb': '0, 141, 166',
    '--btn-secondary-hover': '#E6FCFF',
    '--tag-demo-accent': '#36B37E',
  },
}

export const paletteProductSlackAubergine: ThemePalette = {
  id: 'product_slack_aubergine',
  label: 'Product · Slack dark (aubergine)',
  description: 'Dark main chrome like Slack—purple rail, cyan highlights, pink jabs. Not the white marketing page.',
  source: 'Inspired by Slack',
  cssVars: {
    '--color-bg': '#1a1d21',
    '--color-surface': '#222529',
    '--color-surface-2': '#2b2d31',
    '--color-border': '#3c3f44',
    '--color-border-soft': '#2b2d31',
    '--color-primary': '#f8f8f8',
    '--color-accent': '#36c5f0',
    '--color-accent-hover': '#56d9ff',
    '--color-text': '#f8f8f8',
    '--color-text-muted': '#ababad',
    '--color-text-subtle': '#717274',
    '--color-success': '#2eb67d',
    '--color-warning': '#ecb22e',
    '--color-destructive': '#e01e5a',
    '--color-info': '#36c5f0',
    '--color-sidebar-bg': '#350d36',
    '--color-sidebar-border': '#611f69',
    '--color-sidebar-text': '#d8c4dc',
    '--color-sidebar-text-hi': '#ffffff',
    '--color-sidebar-accent': '#e01e5a',
    '--color-sidebar-label': '#b39bba',
    ...shadowsFromRgb(0, 0, 0),
    '--accent-rgb': '54, 197, 240',
    '--btn-secondary-hover': '#3c3f44',
    '--tag-demo-accent': '#ecb22e',
  },
}

export const paletteProductSlackCanvas: ThemePalette = {
  id: 'product_slack_canvas',
  label: 'Product · Slack dark (violet rail)',
  description: 'Same dark-app energy, deeper violet shell—still not the bright marketing site.',
  source: 'Inspired by Slack',
  cssVars: {
    '--color-bg': '#16131f',
    '--color-surface': '#1e1a2e',
    '--color-surface-2': '#262136',
    '--color-border': '#3d3558',
    '--color-border-soft': '#221c33',
    '--color-primary': '#f4f0ff',
    '--color-accent': '#a78bfa',
    '--color-accent-hover': '#c4b5fd',
    '--color-text': '#f4f0ff',
    '--color-text-muted': '#b4a8d4',
    '--color-text-subtle': '#7d7199',
    '--color-success': '#2eb67d',
    '--color-warning': '#ecb22e',
    '--color-destructive': '#e01e5a',
    '--color-info': '#36c5f0',
    '--color-sidebar-bg': '#2e1068',
    '--color-sidebar-border': '#5b21b6',
    '--color-sidebar-text': '#ddd6fe',
    '--color-sidebar-text-hi': '#ffffff',
    '--color-sidebar-accent': '#f472b6',
    '--color-sidebar-label': '#a89cc4',
    ...shadowsFromRgb(20, 16, 40),
    '--accent-rgb': '167, 139, 250',
    '--btn-secondary-hover': '#322a4a',
    '--tag-demo-accent': '#36c5f0',
  },
}

/** Blue CTA, green sidebar highlights, yellow surfaces, red tag pop: one pass at the four-colour rhythm. */
export const paletteProductGoogleWorkspace: ThemePalette = {
  id: 'product_google_workspace',
  label: 'Product · Google workspace',
  description:
    'Material light base with blue buttons, green rail accents, butter yellow cards, and red pings in the mix.',
  source: 'Inspired by Google',
  cssVars: {
    '--color-bg': '#F8F9FA',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#FEF7E0',
    '--color-border': '#DADCE0',
    '--color-border-soft': '#F1F3F4',
    '--color-primary': '#202124',
    '--color-accent': '#1A73E8',
    '--color-accent-hover': '#1557B0',
    '--color-text': '#202124',
    '--color-text-muted': '#5F6368',
    '--color-text-subtle': '#80868B',
    '--color-success': '#188038',
    '--color-warning': '#F9AB00',
    '--color-destructive': '#D93025',
    '--color-info': '#00897B',
    '--color-sidebar-bg': '#3C4043',
    '--color-sidebar-border': '#5F6368',
    '--color-sidebar-text': '#E8EAED',
    '--color-sidebar-text-hi': '#ffffff',
    '--color-sidebar-accent': '#34A853',
    '--color-sidebar-label': '#BDC1C6',
    ...shadowsFromRgb(60, 64, 67),
    '--accent-rgb': '26, 115, 232',
    '--btn-secondary-hover': '#FEEFC3',
    '--tag-demo-accent': '#EA4335',
  },
}

export const paletteProductNotion: ThemePalette = {
  id: 'product_notion',
  label: 'Product · Notion',
  description: 'Warm paper grey, ink type, and that familiar red nudge on a calm workspace canvas.',
  source: 'Inspired by Notion',
  cssVars: {
    '--color-bg': '#FBFBFA',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#F7F6F3',
    '--color-border': '#E3E2E0',
    '--color-border-soft': '#EFEFED',
    '--color-primary': '#37352F',
    '--color-accent': '#EB5757',
    '--color-accent-hover': '#D44C4C',
    '--color-text': '#37352F',
    '--color-text-muted': '#6F6E69',
    '--color-text-subtle': '#9B9A97',
    '--color-success': '#0F7B6C',
    '--color-warning': '#D9730D',
    '--color-destructive': '#E03E3E',
    '--color-info': '#2383E2',
    '--color-sidebar-bg': '#F7F6F3',
    '--color-sidebar-border': '#E3E2E0',
    '--color-sidebar-text': '#6F6E69',
    '--color-sidebar-text-hi': '#37352F',
    '--color-sidebar-accent': '#2383E2',
    '--color-sidebar-label': '#9B9A97',
    ...shadowsFromRgb(55, 53, 47),
    '--accent-rgb': '235, 87, 87',
    '--btn-secondary-hover': '#E8E7E4',
    '--tag-demo-accent': '#2383E2',
  },
}

export const paletteProductDiscord: ThemePalette = {
  id: 'product_discord',
  label: 'Product · Discord',
  description: 'Blurple buttons on charcoal and slate, the late-night server aesthetic.',
  source: 'Inspired by Discord',
  cssVars: {
    '--color-bg': '#313338',
    '--color-surface': '#2B2D31',
    '--color-surface-2': '#1E2124',
    '--color-border': '#3F4147',
    '--color-border-soft': '#2B2D31',
    '--color-primary': '#F2F3F5',
    '--color-accent': '#5865F2',
    '--color-accent-hover': '#4752C4',
    '--color-text': '#F2F3F5',
    '--color-text-muted': '#B5BAC1',
    '--color-text-subtle': '#949BA4',
    '--color-success': '#3BA55D',
    '--color-warning': '#FAA61A',
    '--color-destructive': '#ED4245',
    '--color-info': '#5865F2',
    '--color-sidebar-bg': '#1E2124',
    '--color-sidebar-border': '#111214',
    '--color-sidebar-text': '#949BA4',
    '--color-sidebar-text-hi': '#F2F3F5',
    '--color-sidebar-accent': '#5865F2',
    '--color-sidebar-label': '#72767D',
    ...shadowsFromRgb(0, 0, 0),
    '--accent-rgb': '88, 101, 242',
    '--btn-secondary-hover': '#3F4147',
    '--tag-demo-accent': '#EB459E',
  },
}

export const paletteProductSpotify: ThemePalette = {
  id: 'product_spotify',
  label: 'Product · Spotify',
  description: 'Ink black chrome, elevator grey text, and that unmistakable green play energy.',
  source: 'Inspired by Spotify',
  cssVars: {
    '--color-bg': '#121212',
    '--color-surface': '#181818',
    '--color-surface-2': '#282828',
    '--color-border': '#333333',
    '--color-border-soft': '#1E1E1E',
    '--color-primary': '#FFFFFF',
    '--color-accent': '#1DB954',
    '--color-accent-hover': '#1AA34A',
    '--color-text': '#FFFFFF',
    '--color-text-muted': '#B3B3B3',
    '--color-text-subtle': '#6A6A6A',
    '--color-success': '#1DB954',
    '--color-warning': '#F59B23',
    '--color-destructive': '#E91429',
    '--color-info': '#2E77D0',
    '--color-sidebar-bg': '#000000',
    '--color-sidebar-border': '#181818',
    '--color-sidebar-text': '#B3B3B3',
    '--color-sidebar-text-hi': '#FFFFFF',
    '--color-sidebar-accent': '#1DB954',
    '--color-sidebar-label': '#727272',
    ...shadowsFromRgb(0, 0, 0),
    '--accent-rgb': '29, 185, 84',
    '--btn-secondary-hover': '#282828',
    '--tag-demo-accent': '#E91429',
  },
}

export const CUSTOM_PALETTE_ID = 'custom' as const

/** Listed in the theme helper; runtime values come from deriveCustomPalette(seeds). */
export const paletteCustom: ThemePalette = {
  id: CUSTOM_PALETTE_ID,
  label: 'Custom',
  description:
    'Mix your own colours for the whole app. We nudge contrast so everything stays easy to read.',
  source: 'Your colours',
  cssVars: deriveCustomPalette(CUSTOM_DEFAULT_PRIMARY, CUSTOM_DEFAULT_SECONDARY),
}

export const THEME_PALETTES: ThemePalette[] = [
  paletteCustom,
  paletteOriginTeal,
  paletteHueShift30,
  paletteWildcardNoir,
  paletteWildcardPaper,
  paletteWildcardSynthwave,
  paletteWildcardOatMoss,
  paletteProductJiraBlue,
  paletteProductConfluenceTeal,
  paletteProductSlackAubergine,
  paletteProductSlackCanvas,
  paletteProductGoogleWorkspace,
  paletteProductNotion,
  paletteProductDiscord,
  paletteProductSpotify,
]

export const THEME_PALETTES_BY_ID: Record<string, ThemePalette> = Object.fromEntries(
  THEME_PALETTES.map((p) => [p.id, p])
)

export const DEFAULT_THEME_ID = paletteHueShift30.id

export const PALETTE_STORAGE_KEY = 'tjos-theme-palette-id'
