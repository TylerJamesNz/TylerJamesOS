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

export type ParsedStatement = {
  periodStart: string // ISO YYYY-MM-DD
  periodEnd: string
}

export const anzAu = {
  canHandle(text: string): boolean {
    return text.includes('ANZ ONLINE SAVER STATEMENT')
  },

  parse(text: string): ParsedStatement {
    const periodMatch = text.match(/(\d{1,2}\s+[A-Z]+\s+\d{4})\s+TO\s+(\d{1,2}\s+[A-Z]+\s+\d{4})/)
    if (!periodMatch) throw new Error('Could not find statement period')
    return {
      periodStart: parseDMY(periodMatch[1]),
      periodEnd: parseDMY(periodMatch[2]),
    }
  },
}
