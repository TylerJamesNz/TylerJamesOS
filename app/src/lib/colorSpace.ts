/** Hex / RGB / HSL helpers for building derived palettes (no external deps). */

export function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Normalise to lowercase `#rrggbb`; invalid input falls back to `#152c36`. */
export function normalizeHex(hex: string): string {
  let h = hex.trim()
  if (!h.startsWith('#')) h = `#${h}`
  if (h.length === 4 && /^#[0-9a-fA-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return '#152c36'
  return h.toLowerCase()
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex)
  const n = parseInt(h.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.round(clamp(x, 0, 255))
  return `#${((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1)}`
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return { h: h % 1, s, l }
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t
      if (tt < 0) tt += 1
      if (tt > 1) tt -= 1
      if (tt < 1 / 6) return p + (q - p) * 6 * tt
      if (tt < 1 / 2) return q
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1))
  return rgbToHex(r, g, b)
}

export function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex(lerp(A.r, B.r, t), lerp(A.g, B.g, t), lerp(A.b, B.b, t))
}

/** WCAG 2.1 relative luminance for sRGB hex (0–1). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const lin = [r, g, b].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

/** WCAG contrast ratio between two colours (≥4.5 is common UI text target). */
export function contrastRatio(fg: string, bg: string): number {
  const L1 = relativeLuminance(fg)
  const L2 = relativeLuminance(bg)
  const light = Math.max(L1, L2)
  const dark = Math.min(L1, L2)
  return (light + 0.05) / (dark + 0.05)
}

/**
 * Nudge `fg` toward white or black until contrast with `bg` reaches `minRatio`.
 */
export function ensureContrast(
  fg: string,
  bg: string,
  minRatio: number,
  bias: 'auto' | 'lighter' | 'darker' = 'auto'
): string {
  let cur = normalizeHex(fg)
  const bgN = normalizeHex(bg)
  if (contrastRatio(cur, bgN) >= minRatio) return cur

  let toward: 'lighter' | 'darker'
  if (bias === 'lighter') toward = 'lighter'
  else if (bias === 'darker') toward = 'darker'
  else {
    const up = contrastRatio(mixHex(cur, '#ffffff', 0.18), bgN)
    const down = contrastRatio(mixHex(cur, '#111111', 0.18), bgN)
    toward = up >= down ? 'lighter' : 'darker'
  }

  for (let i = 0; i < 36; i++) {
    if (contrastRatio(cur, bgN) >= minRatio) return cur
    cur =
      toward === 'lighter'
        ? mixHex(cur, '#ffffff', 0.14)
        : mixHex(cur, '#111111', 0.14)
  }
  return toward === 'lighter' ? '#ffffff' : '#111111'
}
