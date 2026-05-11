# 0004. Live transaction sources alongside statement import

**Status:** Accepted, 2026-05-11.

## Context

ADR 0002 locked the Finance app's import pipeline to free, file-only sources. That decision held up well for audit-grade history, but it left a gap: statements lag real life by 5+ days after month-end, and ANZ AU Online Saver statements are half-yearly. Tyler cannot see "how is this month trending" until the statement lands, which is months away for some accounts.

A second grill session walked the options for live data:

- **Akahu (NZ)** is a free open-banking aggregator built for personal use, with full ANZ NZ support via an OAuth consent flow.
- **Basiq (AU)** is the closest equivalent in Australia (CDR), but its lowest tier is $0.50 per Basiq-user per month with a 12-month contract and B2B onboarding. Not "free" by ADR 0002's principle, and not friction-free.
- **Gmail-parse of ANZ AU Activity Alert emails.** ANZ AU lets you enable per-transaction email alerts. The user owns the inbox; reading it with consent (Gmail OAuth, `gmail.readonly`) is bank-sanctioned and free. Brittle to email template changes, but the failure is loud (unparseable emails surface in a review queue) and the alternative paid path costs real money.
- **Playwright into ANZ web** was considered and rejected. It violates ANZ's terms of use, trips bot-detection (TLS fingerprinting, headless flags, mouse-entropy heuristics), breaks on MFA, and risks account lockout. The "most secure" version still isn't secure.

The architectural question: does live data **replace** statement-import, live **alongside** it, or get deferred entirely.

## Decision

**Live data sources land alongside statement-import, not in place of it.** Statements remain the canonical source of truth for audit reporting; live transactions are a preview surface for the current period.

Concretely:

1. **One `transactions` table** with a `source` enum (`STATEMENT | LIVE | MANUAL`). All charts and totals query the union; live rows are filtered out of audit reports by date-range + source predicate.
2. **Match-and-merge on statement import.** When a statement covering a period of live transactions is imported, for each statement row the import flow finds a matching live row by `(account_id, date, amount, type)` and UPDATEs its `source` to `STATEMENT`, filling statement-side metadata (`external_id`, `statement_id`, official description). Unmatched live rows in the period get a `superseded_at` timestamp and an audit note. Manual TransactionLinks tied to a promoted row survive because the primary key does not change.
3. **NZ live: Akahu via OAuth.** Tyler registers an Akahu developer app once. TJOS settings has a "Connect Akahu" button that runs the consent flow. Access + refresh tokens land in Supabase Vault. A Supabase Edge Function (`akahu-sync`) polls daily plus on demand.
4. **AU live: Gmail-parse ANZ Activity Alert emails.** Tyler enables Activity Alerts in ANZ AU internet banking (per-transaction, $1 threshold), creates a Gmail filter routing those alerts to a label. TJOS settings has a "Connect Gmail" OAuth button. An Edge Function (`anz-au-sync`) polls Gmail hourly, regex-parses each alert, inserts as Live Transactions.
5. **Both sources are free.** ADR 0002's "no paid services in the import pipeline" principle is preserved: Akahu is free for personal use; Gmail API is free; only Basiq and Plaid-like aggregators are explicitly rejected.
6. **Two new tables: `external_integrations` (OAuth tokens, Vault-encrypted) and `live_sync_runs` (append-only log, powers the review queue).** Schema additions on `transactions` and `accounts` documented in `_project/data-model.md`.

## Consequences

- The "this month trending" use case is unblocked for both NZ and AU without spending money or violating any bank's terms.
- Statement import becomes slightly more complex (match-and-merge step) but the audit invariant is stronger than before: a statement always wins over a live record for the same transaction.
- TransactionLinks survive the live-to-statement promotion because the primary key does not change. Tyler does not have to relink flatmate reimbursements every six months.
- The Gmail parser is brittle to ANZ template changes. Acceptable cost: each break is visible (unparseable count rises in the review queue), localised to AU live, and fixable in one parser commit. The synthetic fixture in `__fixtures__/` catches regressions.
- The system now stores OAuth tokens for external services. Supabase Vault wraps them at rest; only the Edge Functions read them. RLS keeps them user-scoped.
- ADR 0002 stays valid. ADR 0004 amends the file-only constraint to "free-only", which includes free aggregator OAuth (Akahu) and free email-consent flows (Gmail).
- If Akahu ever changes its free tier or pulls support for ANZ NZ, the file-import path still covers NZ accounts. Same for Gmail-parse on AU. No single source of failure.
- Reversing this decision is meaningful work: schema migration to drop the new columns, removing the Edge Functions, deleting the integrations rows. We do not plan to reverse.
