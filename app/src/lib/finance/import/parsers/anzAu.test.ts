import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { anzAu } from './anzAu'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_TEXT = readFileSync(join(HERE, '__fixtures__/anz-au-online-saver.txt'), 'utf-8')

describe('anzAu.canHandle', () => {
  it('returns true for ANZ AU Online Saver statement text', () => {
    expect(anzAu.canHandle(FIXTURE_TEXT)).toBe(true)
  })

  it('returns false for unrelated text', () => {
    expect(anzAu.canHandle('Some other bank statement, nothing to do with ANZ AU')).toBe(false)
  })
})

describe('anzAu.parse', () => {
  it('extracts period_start and period_end from the statement header', () => {
    const result = anzAu.parse(FIXTURE_TEXT)
    expect(result.periodStart).toBe('2025-05-01')
    expect(result.periodEnd).toBe('2025-11-03')
  })
})
