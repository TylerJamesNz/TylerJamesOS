# 0002. Free-only statement import pipeline

**Status:** Accepted, 2026-05-10.

## Context

The Finance app imports bank and provider statements as PDFs. The previous draft (`_project/app-finance.md`, pre-V1) included Claude as a fallback parser via Anthropic's vision API and as a categorisation engine.

Examining the actual sample PDFs (ANZ NZ, ANZ AU) showed they are text-rendered, not scanned: 22 font references, 5 image XObjects each (logo and decorations only). Text is extractable with `pdfjs-dist` in the browser, deterministically and at zero cost. For genuinely scanned PDFs from future providers, `tesseract.js` runs OCR client-side, also free, also offline-capable.

The user wants the import pipeline to be free by construction. Paid services can be added later if a real failure mode appears, but they should not be the default path. He also wants the system to "intelligently choose" the right tool per file rather than always sending everything to the most-expensive option.

## Decision

The import pipeline is a strategy chain. Each strategy declares a can-handle predicate; the first strategy that succeeds wins. Failure or zero-rows falls through. No paid services anywhere in the chain.

1. **Text extract + format-specific parser.** `pdfjs-dist` extracts text. A per-format deterministic parser reads it (initially ANZ NZ, then ANZ AU, with new parsers added as new statement formats arrive). Free, instant, offline.
2. **Text extract + generic table parser.** Same extraction. A heuristic parser infers transaction rows from date-token + currency-token co-location. Catches text PDFs from unknown providers without writing a hand parser first. Free, instant, offline.
3. **Tesseract.js OCR + generic table parser.** For scanned PDFs without extractable text. Browser-side OCR, no API key, runs offline. Slower (5 to 30 seconds per page) but $0.
4. **Manual review queue.** Always available as the human escape hatch.

Categorisation is a parallel engine: rule library first (priority-ordered, deterministic), manual review for unmatched. Confirming a manual categorisation can promote a rule for future imports. Categorisation has no AI pass at all in V1.

## Consequences

- Per-import cost is zero. Bandwidth in, parsing local, categorisation local.
- The pipeline runs offline once the app is loaded (PDF parsing and OCR are entirely client-side).
- Format coverage grows by writing more format-specific parsers, not by leaning on a smarter model. Each new parser ships with a regression test against a sample fixture.
- Manual review queue is the failure mode that absorbs everything the chain misses. As coverage grows the queue shrinks; on day one it absorbs more.
- Re-introducing a paid AI strategy is a strict addition to the chain (a fifth step, gated on explicit user click), not a rewrite. If accuracy or speed pressure ever justifies it, the door is open.
- This decision deliberately closes off Akahu, Plaid, and other live-banking integrations for the V1 timeframe. File import is the only data ingress.
