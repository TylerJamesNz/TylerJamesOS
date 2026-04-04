import { invertHex } from './colorSpace'

/**
 * RGB channel invert for preset palettes in dark mode: every `#rrggbb`, `rgba(...)` in shadows/gradients,
 * and `--accent-rgb` are flipped. Custom themes use inverted seeds + `deriveCustomPalette` instead.
 */
export function invertPaletteCssVars(vars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(vars)) {
    const v = raw.trim()
    if (/^#[0-9a-fA-F]{6}$/i.test(v)) {
      out[key] = invertHex(v)
      continue
    }
    if (key === '--accent-rgb') {
      out[key] = raw
        .split(',')
        .map((part) => {
          const n = parseInt(part.trim(), 10)
          if (Number.isNaN(n)) return part.trim()
          return String(255 - Math.min(255, Math.max(0, n)))
        })
        .join(', ')
      continue
    }
    if (raw.includes('rgba') || raw.includes('#')) {
      let nv = raw.replace(
        /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/gi,
        (_, r: string, g: string, b: string, a: string) =>
          `rgba(${255 - +r}, ${255 - +g}, ${255 - +b}, ${a})`
      )
      nv = nv.replace(/#([0-9a-fA-F]{6})\b/gi, (m) => invertHex(m))
      out[key] = nv
      continue
    }
    out[key] = raw
  }
  return out
}
