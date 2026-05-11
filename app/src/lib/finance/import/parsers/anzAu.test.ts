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

  it('extracts opening and closing balance from the at-a-glance block', () => {
    const result = anzAu.parse(FIXTURE_TEXT)
    expect(result.openingBalance).toBe('2000.00')
    expect(result.closingBalance).toBe('2200.00')
  })

  it('extracts the first DEBIT transaction with date, description, amount, type', () => {
    const result = anzAu.parse(FIXTURE_TEXT)
    const first = result.transactions[0]
    expect(first.date).toBe('2025-05-03')
    expect(first.description).toBe('PAYMENT TO ACME UTILITIES 12345')
    expect(first.amount).toBe('100.00')
    expect(first.type).toBe('DEBIT')
  })

  it('extracts a CREDIT transaction (salary deposit)', () => {
    const result = anzAu.parse(FIXTURE_TEXT)
    const credit = result.transactions.find(t => t.type === 'CREDIT')
    expect(credit).toBeDefined()
    expect(credit!.date).toBe('2025-05-15')
    expect(credit!.description).toBe('PAYMENT FROM EMPLOYER PTY LTD SALARY PMNT')
    expect(credit!.amount).toBe('500.00')
  })

  it('handles a multi-line description (TRANSFER with EFFECTIVE DATE continuation)', () => {
    const result = anzAu.parse(FIXTURE_TEXT)
    const transfer = result.transactions.find(t => t.description.includes('M-BANKING'))
    expect(transfer).toBeDefined()
    expect(transfer!.date).toBe('2025-05-22')
    expect(transfer!.description).toBe(
      'ANZ M-BANKING FUNDS TFER TRANSFER 111111 TO 012345123456789 EFFECTIVE DATE 21 MAY 2025'
    )
    expect(transfer!.amount).toBe('200.00')
    expect(transfer!.type).toBe('DEBIT')
  })

  it('skips OPENING and CLOSING BALANCE pseudo-rows', () => {
    const result = anzAu.parse(FIXTURE_TEXT)
    expect(result.transactions).toHaveLength(3)
    expect(result.transactions.every(t => !t.description.includes('OPENING BALANCE'))).toBe(true)
    expect(result.transactions.every(t => !t.description.includes('CLOSING BALANCE'))).toBe(true)
  })
})
