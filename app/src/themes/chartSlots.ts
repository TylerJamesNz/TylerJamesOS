import chroma from 'chroma-js'

const SLOT_COUNT = 10
const HUE_STEP = 360 / SLOT_COUNT
const MIN_SATURATION = 0.45
const LIGHT_BG_TARGET_L = 0.5
const DARK_BG_TARGET_L = 0.65

export function chartCatRamp(accentHex: string, surfaceHex: string): Record<string, string> {
  const seed = chroma(accentHex)
  const seedHue = seed.get('hsl.h')
  const seedSat = seed.get('hsl.s')
  const surfaceL = chroma(surfaceHex).get('hsl.l')

  const targetL = surfaceL > 0.5 ? LIGHT_BG_TARGET_L : DARK_BG_TARGET_L
  const targetS = Number.isNaN(seedSat) ? MIN_SATURATION : Math.max(seedSat, MIN_SATURATION)
  const baseHue = Number.isNaN(seedHue) ? 200 : seedHue

  const slots: Record<string, string> = {}
  for (let i = 0; i < SLOT_COUNT; i++) {
    const hue = (baseHue + i * HUE_STEP) % 360
    slots[`--chart-cat-${i}`] = chroma.hsl(hue, targetS, targetL).hex()
  }
  return slots
}

export function withChartSlots(vars: Record<string, string>): Record<string, string> {
  const accent = vars['--color-accent'] ?? '#196061'
  const surface = vars['--color-surface'] ?? '#ffffff'
  return {
    ...vars,
    ...chartCatRamp(accent, surface),
  }
}
