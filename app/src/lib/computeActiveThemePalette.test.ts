import { describe, it, expect } from 'vitest'
import { computeActiveThemePalette } from './computeActiveThemePalette'
import { CUSTOM_PALETTE_ID } from '../themes/palettes'

const customSeeds = { primary: '#152c36', secondary: '#7da0a0' }

describe('computeActiveThemePalette', () => {
  it('returns chart slots for a static palette (light)', () => {
    const palette = computeActiveThemePalette({
      paletteId: 'origin_teal',
      customSeeds,
      darkMode: false,
    })
    for (let i = 0; i < 10; i++) {
      expect(palette.cssVars).toHaveProperty(`--chart-cat-${i}`)
    }
  })

  it('returns chart slots for the custom palette in light mode', () => {
    const palette = computeActiveThemePalette({
      paletteId: CUSTOM_PALETTE_ID,
      customSeeds,
      darkMode: false,
    })
    for (let i = 0; i < 10; i++) {
      expect(palette.cssVars).toHaveProperty(`--chart-cat-${i}`)
    }
  })

  it('returns chart slots for the custom palette in dark mode', () => {
    const palette = computeActiveThemePalette({
      paletteId: CUSTOM_PALETTE_ID,
      customSeeds,
      darkMode: true,
    })
    for (let i = 0; i < 10; i++) {
      expect(palette.cssVars).toHaveProperty(`--chart-cat-${i}`)
    }
  })
})
