import { anzAu, type ParsedStatement } from './anzAu'

export type ParserId = 'anzAu'

export type ParseAttempt = {
  parser: ParserId
  statement: ParsedStatement
}

type Parser = {
  id: ParserId
  canHandle(text: string): boolean
  parse(text: string): ParsedStatement
}

const PARSERS: Parser[] = [
  { id: 'anzAu', canHandle: anzAu.canHandle, parse: anzAu.parse },
]

export function tryParse(text: string): ParseAttempt | null {
  for (const p of PARSERS) {
    if (p.canHandle(text)) {
      return { parser: p.id, statement: p.parse(text) }
    }
  }
  return null
}
