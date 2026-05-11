import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tryParse } from './index'

const HERE = dirname(fileURLToPath(import.meta.url))
const ANZ_AU = readFileSync(join(HERE, '__fixtures__/anz-au-online-saver.txt'), 'utf-8')

describe('tryParse', () => {
  it('returns ANZ AU parsed result when text matches anzAu.canHandle', () => {
    const result = tryParse(ANZ_AU)
    expect(result).not.toBeNull()
    expect(result!.parser).toBe('anzAu')
    expect(result!.statement.transactions).toHaveLength(3)
    expect(result!.statement.openingBalance).toBe('2000.00')
  })

  it('returns null when no parser can handle the text', () => {
    expect(tryParse('Random unrelated text from no known bank')).toBeNull()
  })
})
