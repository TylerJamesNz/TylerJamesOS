import { clamp, hexToRgb, hslToHex, normalizeHex, rgbToHsl } from './colorSpace'

/**
 * Fifteen recipes: **near-primary first** (same hue + light analogous shifts — Origin-style family tints),
 * then distant harmonies (complement, split, triad, square corners).
 */
const SECONDARY_SPECS: { deg: number; sAdd: number; l: number }[] = [
  { deg: 0, sAdd: 0.1, l: 0.31 },
  { deg: 0, sAdd: -0.1, l: 0.51 },
  { deg: 12, sAdd: 0.2, l: 0.39 },
  { deg: -12, sAdd: 0.2, l: 0.39 },
  { deg: 26, sAdd: 0.18, l: 0.42 },
  { deg: 180, sAdd: 0.38, l: 0.3 },
  { deg: 180, sAdd: 0.1, l: 0.52 },
  { deg: 150, sAdd: 0.34, l: 0.34 },
  { deg: 210, sAdd: 0.34, l: 0.34 },
  { deg: 120, sAdd: 0.32, l: 0.32 },
  { deg: 240, sAdd: 0.32, l: 0.32 },
  { deg: 90, sAdd: 0.28, l: 0.4 },
  { deg: 270, sAdd: 0.3, l: 0.36 },
  { deg: 60, sAdd: 0.22, l: 0.46 },
  { deg: 195, sAdd: 0.36, l: 0.28 },
]

const DEG_TO_TURN = 1 / 360

export const COMPLEMENTARY_SECONDARY_COUNT = SECONDARY_SPECS.length

/**
 * Fifteen accent-family colours: near-primary / analogous, then complement, split, triad, and square hues.
 */
export function proposeComplementarySecondaries(primaryHex: string): string[] {
  const p = normalizeHex(primaryHex)
  const { r, g, b } = hexToRgb(p)
  const Ph = rgbToHsl(r, g, b)
  const seen = new Set<string>()
  const out: string[] = []

  for (const { deg, sAdd, l } of SECONDARY_SPECS) {
    const hh = (Ph.h + deg * DEG_TO_TURN + 1) % 1
    const sat = clamp(Ph.s + sAdd, 0.36, 0.95)
    const ll = clamp(l, 0.22, 0.56)
    const hex = hslToHex(hh, sat, ll)
    if (!seen.has(hex)) {
      seen.add(hex)
      out.push(hex)
    }
  }

  let bump = 0
  while (out.length < COMPLEMENTARY_SECONDARY_COUNT) {
    bump += 0.015
    const hex = hslToHex((Ph.h + 0.5 + bump) % 1, clamp(Ph.s + 0.22 + bump, 0.45, 0.9), 0.39)
    if (!seen.has(hex)) {
      seen.add(hex)
      out.push(hex)
    }
  }

  return out.slice(0, COMPLEMENTARY_SECONDARY_COUNT)
}

/** Uniform pick from `proposeComplementarySecondaries` (e.g. after primary changes in the custom editor). */
export function randomHarmonySecondary(primaryHex: string): string {
  const list = proposeComplementarySecondaries(primaryHex)
  if (list.length === 0) return normalizeHex(primaryHex)
  return list[Math.floor(Math.random() * list.length)]
}

/** If `saved` is not one of the proposals for this primary, snap to closest in HSL space. */
export function pickNearestSecondary(primaryHex: string, savedSecondaryHex: string): string {
  const candidates = proposeComplementarySecondaries(primaryHex)
  const want = normalizeHex(savedSecondaryHex)
  if (candidates.includes(want)) return want

  const { r, g, b } = hexToRgb(want)
  const Sh = rgbToHsl(r, g, b)
  let best = candidates[0]
  let bestScore = Infinity

  for (const c of candidates) {
    const cr = hexToRgb(c)
    const Ch = rgbToHsl(cr.r, cr.g, cr.b)
    const dh = Math.min(Math.abs(Ch.h - Sh.h), 1 - Math.abs(Ch.h - Sh.h))
    const ds = Math.abs(Ch.s - Sh.s)
    const dl = Math.abs(Ch.l - Sh.l)
    const score = dh * 4 + ds * 1.2 + dl
    if (score < bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}
