const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
}

function parseDMY(input: string): string {
  // "01 MAY 2025" → "2025-05-01"
  const match = input.match(/^(\d{1,2})\s+([A-Z]{3,})\s+(\d{4})$/)
  if (!match) throw new Error(`Unparseable date: ${input}`)
  const day = match[1].padStart(2, '0')
  const month = MONTHS[match[2].slice(0, 3).toUpperCase()]
  if (!month) throw new Error(`Unknown month: ${match[2]}`)
  return `${match[3]}-${month}-${day}`
}

function parseAmount(input: string): string {
  // "2,000.00" → "2000.00" (string preserves precision; Postgres numeric accepts it)
  return input.replace(/,/g, '')
}

export type ParsedTransaction = {
  date: string // ISO YYYY-MM-DD
  description: string
  amount: string // decimal as string
  type: 'DEBIT' | 'CREDIT'
}

export type ParsedStatement = {
  periodStart: string // ISO YYYY-MM-DD
  periodEnd: string
  openingBalance: string // decimal as string, e.g. "2000.00"
  closingBalance: string
  transactions: ParsedTransaction[]
}

export const anzAu = {
  canHandle(text: string): boolean {
    return text.includes('ANZ ONLINE SAVER STATEMENT')
  },

  parse(text: string): ParsedStatement {
    const periodMatch = text.match(/(\d{1,2}\s+[A-Z]+\s+\d{4})\s+TO\s+(\d{1,2}\s+[A-Z]+\s+\d{4})/)
    if (!periodMatch) throw new Error('Could not find statement period')

    const openingMatch = text.match(/Opening Balance:\s*\$\s*([\d,]+\.\d{2})/)
    if (!openingMatch) throw new Error('Could not find opening balance')

    const closingMatch = text.match(/Closing Balance:\s*\$\s*([\d,]+\.\d{2})/)
    if (!closingMatch) throw new Error('Could not find closing balance')

    const periodStart = parseDMY(periodMatch[1])
    const year = periodStart.slice(0, 4)

    return {
      periodStart,
      periodEnd: parseDMY(periodMatch[2]),
      openingBalance: parseAmount(openingMatch[1]),
      closingBalance: parseAmount(closingMatch[1]),
      transactions: parseTransactions(text, year),
    }
  },
}

const TXN_DATE_RE = /^(\d{1,2})\s+([A-Z]{3})(?:\s+(.+))?$/
const TXN_AMOUNT_RE = /^(blank|[\d,]+\.\d{2})\s+(blank|[\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/

function parseTransactions(text: string, year: string): ParsedTransaction[] {
  const lines = text.split('\n').map(l => l.trim())
  const out: ParsedTransaction[] = []

  let i = 0
  while (i < lines.length) {
    const dateMatch = lines[i].match(TXN_DATE_RE)
    if (!dateMatch || !MONTHS[dateMatch[2]]) {
      i++
      continue
    }
    const [, day, mon, tail] = dateMatch
    const descParts: string[] = tail ? [tail] : []
    i++

    while (i < lines.length) {
      if (lines[i].match(TXN_DATE_RE) && MONTHS[lines[i].match(TXN_DATE_RE)![2]]) break
      const amtMatch = lines[i].match(TXN_AMOUNT_RE)
      if (amtMatch) {
        const [, withdrawal, deposit] = amtMatch
        if (withdrawal !== 'blank' && deposit === 'blank') {
          out.push({
            date: `${year}-${MONTHS[mon]}-${day.padStart(2, '0')}`,
            description: descParts.join(' '),
            amount: parseAmount(withdrawal),
            type: 'DEBIT',
          })
        } else if (deposit !== 'blank' && withdrawal === 'blank') {
          out.push({
            date: `${year}-${MONTHS[mon]}-${day.padStart(2, '0')}`,
            description: descParts.join(' '),
            amount: parseAmount(deposit),
            type: 'CREDIT',
          })
        }
        i++
        break
      }
      descParts.push(lines[i])
      i++
    }
  }

  return out
}
