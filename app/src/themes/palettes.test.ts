import { describe, it, expect } from 'vitest'
import { THEME_PALETTES } from './palettes'

describe('THEME_PALETTES', () => {
  it.each(THEME_PALETTES.map((p) => [p.id, p] as const))(
    'palette %s exposes --chart-cat-0 through --chart-cat-9',
    (_id, palette) => {
      for (let i = 0; i < 10; i++) {
        expect(palette.cssVars).toHaveProperty(`--chart-cat-${i}`)
      }
    }
  )
})
