import { describe, it, expect } from 'vitest'
import { chartCatRamp, withChartSlots } from './chartSlots'

describe('withChartSlots', () => {
  it('adds --chart-cat-0 through --chart-cat-9 to the input vars', () => {
    const input = {
      '--color-accent': '#196061',
      '--color-surface': '#ffffff',
    }
    const result = withChartSlots(input)
    for (let i = 0; i < 10; i++) {
      expect(result).toHaveProperty(`--chart-cat-${i}`)
    }
  })
})

describe('chartCatRamp', () => {
  it('produces 10 distinct, valid 6-digit hex colours from an accent and surface', () => {
    const slots = chartCatRamp('#196061', '#ffffff')
    const values = Object.values(slots)
    expect(values).toHaveLength(10)
    expect(new Set(values).size).toBe(10)
    for (const value of values) {
      expect(value).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})
