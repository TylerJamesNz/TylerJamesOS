# Finance App V1 PRD

## Problem

Tyler's money lives in five accounts across two countries (ANZ NZ, ANZ AU primary, ANZ AU savings, KiwiSaver, Australian Super). Each provider has its own login, its own statement format, its own UI. There is no single place to see what Tyler is worth this week, what changed this month, or how income lined up against outgoings, especially once flatmate reimbursements muddy the picture. The bank apps optimise for transactions; nothing he uses optimises for understanding.

## Users

One. Tyler. Single-tenant by construction. RLS on every row. No collaboration, no sharing, no roles.

## Success criteria

- One URL (`/finance`) shows Net Worth, Liquid balance over time, Investments over time, this month's income vs expense, and category breakdown for the displayed range, in AUD, within 2 seconds of load.
- Importing a statement is a drag onto the page, then a confirm click. Zero typing for known accounts; no manual transaction entry for any text-extractable PDF.
- Flatmate reimbursements cancel the corresponding Rent outgoing automatically; the dashboard shows Net Cost by default, raw available on hover.
- Zero ongoing per-import API cost. The whole pipeline runs free.
- `/finance` installs as its own iOS PWA icon, distinct from `/todos`.

## Non-goals (V1)

- No paid bank-API aggregators (Basiq, Plaid). Free open-banking only.
- No paid AI in the import or categorisation path. Claude is not in the loop.
- No collaboration, sharing, or multi-user features.
- No mobile-native app. iOS PWA only.
- No bills/budgets/goals. Just "see what's there."
- No CSV import. PDF only for statements.
- No tax export, accounting export, or third-party sync.
- No browser-automation (Playwright) into bank web UIs. ToS violation and account-lockout risk.

---

## Architecture

`/finance` is a Vite + React 19 SPA inside Tyler James OS. Data layer is Supabase (Postgres + Storage + Auth + Edge Functions). All architectural terms canonical in `/CONTEXT.md`.

Routes:
- `/finance` (single dashboard page)
- `/finance/transactions` (searchable, filterable table)
- `/finance/accounts` (per-account detail and statement upload)

`/finance/insights` does not exist (collapsed into `/finance`).

---

## Domain model

The canonical glossary lives in `/CONTEXT.md`. In summary:

- **Deposit Account.** Bank account with transaction-level data (ANZ NZ, ANZ AU primary, ANZ AU savings).
- **Investment Account.** Fund-managed account with balance-level data (KiwiSaver, Australian Super).
- **Balance Snapshot.** Recorded balance for an Account on a date, sourced from a statement. Source of truth for any "balance over time" chart.
- **Liquid.** UI metric label. Total of latest Balance Snapshots across all Deposit Accounts, optionally adjusted for transactions since.
- **Net Worth.** Sum of latest Balance Snapshots across all Accounts.
- **Home Currency.** AUD. Native amounts stored on every row; conversion happens at read time using the row-date FX rate.
- **Transaction Link.** Relationship that nets a reimbursement against its parent outgoing.
- **Net Cost.** Outgoing amount minus linked reimbursements. Default chart display.
- **Categorical Slot.** Palette-derived colour position 0..9 used by every categorical chart series.

---

## Statement import

Statements are PDF, sourced from each provider's online portal. The pipeline is **fully free** by design (ADR 0002).

### Strategy chain

Each uploaded file walks the chain top to bottom. First strategy that succeeds wins; failure or zero-rows falls through.

1. **Text extract + format-specific parser.** `pdfjs-dist` extracts text; a per-format parser (initially ANZ NZ, then ANZ AU) reads it deterministically. Free, instant, offline.
2. **Text extract + generic table parser.** Same extraction, but a heuristic parser infers rows from date-token + currency-token co-location. Catches text PDFs from unknown providers.
3. **Tesseract.js OCR + generic table parser.** Browser-side OCR (free, no API key) for scanned PDFs. Slower (5 to 30s per page) but $0.
4. **Manual review queue.** Always available. The human escape hatch.

Format detection sniffs the first page for known headers ("ANZ Bank New Zealand", "AustralianSuper", etc.) and picks the strategy. On miss, falls to the generic strategies.

### What an import produces

For each accepted statement:
- One **Statement** row with `parser_strategy`, `parser_version`, `period_start`, `period_end`, `storage_path`, `opening_balance`, `closing_balance`.
- **Two Balance Snapshots** seeded automatically, opening at `period_start`, closing at `period_end`.
- N **Transaction** rows for each line item.

Re-uploading the same statement (same `account_id`, same period) replaces the previous Statement row and its Transactions. Idempotent.

### Source file storage

Every uploaded PDF lives in Supabase Storage at:

```
bank-statements/{userId}/{accountId}/{YYYY-MM}.pdf
```

`YYYY-MM` is the **period_end** month. Bucket is private. RLS keys off `auth.uid()`. Files kept forever; manual delete only.

### First-time-seen accounts

If the parser sniffs an account number not present in the `accounts` table, the import flow pauses with a modal pre-filled with sniffed details (institution, currency, account_type guess) and resumes after Tyler confirms or edits.

---

## Live data

Statements arrive 5+ days after month-end and (for Tyler's ANZ AU Online Saver) are half-yearly. To see "how is this month trending" requires a live preview surface that updates before the next statement lands. See `docs/adr/0004-live-transaction-sources.md` for the architectural decision.

Two free live-data sources, one per region:

### NZ live: Akahu (open-banking aggregator)

Akahu is the NZ open-banking aggregator, free for personal use. Tyler registers an Akahu Developer app, then connects ANZ NZ in TJOS settings via Akahu's hosted OAuth consent screen. Access + refresh tokens land in Supabase Vault. A Supabase Edge Function (`akahu-sync`) polls Akahu daily plus on a "Refresh now" button on `/finance`. Each Akahu transaction has a stable ID used as the `external_id` for idempotency.

### AU live: Gmail-parsed ANZ Activity Alert emails

ANZ AU's "Account Activity Alerts" can be configured (in internet banking) to email on every transaction. Tyler creates a Gmail filter routing those alerts to a label (e.g., `Finance/ANZ AU/Saver`). TJOS settings has a "Connect Gmail" OAuth button (scope `gmail.readonly`). A Supabase Edge Function (`anz-au-sync`) polls Gmail hourly for new messages under the configured label, regex-parses the email body, and inserts each as a Live Transaction. Unparseable emails surface in a review queue rather than failing silently.

### Source of Truth Hierarchy

See `/CONTEXT.md`. From most to least authoritative: Statement > Live > Manual. Statements supersede Live by **match-and-merge** when imported: for each statement row, find a matching Live row by `(account_id, date, amount, type)` and UPDATE its `source` to `STATEMENT`, filling statement-side metadata (`external_id`, `statement_id`). Unmatched Live rows in the period get a `superseded_at` timestamp + audit note. Manual TransactionLinks tied to a promoted row survive because the primary key does not change.

### Why not Basiq, why not Playwright

- **Basiq / CDR aggregators**: $0.50/user/month minimum + 12-month contract, B2B-shaped onboarding. Not free for personal use. Documented in ADR 0004.
- **Playwright into ANZ web**: ToS violation; bank bot-detection; MFA breaks unattended automation; account lockout risk. Rejected.

---

## Categorisation

Two passes, both free:

1. **Rule engine.** `category_rules` ordered by priority, then created_at. First match wins. Rules ship seeded (`is_system = true`, see seed list below). Tyler can disable system rules without deleting them. Manual confirmations of unmatched transactions can grow the rule library on save.
2. **Manual review queue.** Anything the rule engine misses lands here for one-click categorisation.

`category_rules.created_from` is `SYSTEM | USER`. The previous `AI_SUGGESTION` value is removed (V1 has no AI).

### Seed rule library

Lifted from previous work on this app. Seeded on first run. Tyler can disable any.

**NZ groceries:** COUNTDOWN, PAK N SAVE, PAKNSAVE, NEW WORLD, FOUR SQUARE, FRESH CHOICE, SUPER VALUE, MOORE WILSONS, FARRO.
**NZ dining:** MCDONALD, MCDONALDS, KFC, BURGER KING, SUBWAY, DOMINOS, PIZZA HUT, HELL PIZZA, GUZMAN, CARL'S JR.
**NZ fuel/transport:** Z ENERGY, BP, MOBIL, CALTEX, GULL, ALLIED, NZ BUS, AT HOP, METLINK, SNAPPER, UBER, OLA, ZOOMY.
**NZ utilities:** MERCURY, GENESIS, CONTACT ENERGY, MERIDIAN, TRUSTPOWER, VECTOR, WATERCARE, CHORUS, SPARK, VODAFONE, ONE NZ, 2DEGREES, SKINNY.
**NZ government:** INLAND REVENUE, IRD, ACC, KIWISAVER, WINZ, MSD.
**NZ health:** UNICHEM, LIFE PHARMACY, CHEMIST WAREHOUSE NZ, GREEN CROSS.
**NZ banking:** ANZ FEES, ANZ VISA, ANZ HOME LOAN, ANZ BANK FEE, KIWIBANK, BNZ, WESTPAC, ASB.
**AU groceries:** WOOLWORTHS, COLES, ALDI, IGA, HARRIS FARM, COSTCO.
**AU fuel/transport:** 7-ELEVEN, AMPOL, VIVA ENERGY, PUMA ENERGY, CALTEX AU, OPAL, MYKI, TRANSLINK, UBER AU.
**AU utilities:** ORIGIN ENERGY, AGL, ENERGY AUSTRALIA, SYDNEY WATER, MELBOURNE WATER, TELSTRA, OPTUS, TPG, AUSSIE BROADBAND.
**AU government:** AUSTRALIAN TAXATION, ATO, MEDICARE, CENTRELINK, SERVICES AUSTRALIA.
**AU health:** PRICELINE, TERRY WHITE, CHEMIST WAREHOUSE AU, AMCAL, NATIONAL PHARMACIES.
**Global subs:** NETFLIX, SPOTIFY, APPLE.COM, GOOGLE, YOUTUBE, AMAZON PRIME, DISNEY PLUS, NEON, SKY TV, MICROSOFT, ADOBE, DROPBOX, NOTION, XERO, MYOB, FIGMA, GITHUB, OPENAI, ANTHROPIC, CHATGPT, CANVA, SLACK, ZOOM.
**Global travel:** AIR NZ, AIR NEW ZEALAND, JETSTAR, QANTAS, VIRGIN AUSTRALIA, EMIRATES, SINGAPORE AIR, AIRBNB, BOOKING.COM, EXPEDIA, HOTELS.COM, WOTIF.
**Income:** SALARY, WAGES, PAYROLL, FREELANCE, INVOICE.
**Transfers (excluded from insights):** TRANSFER TO, TRANSFER FROM, OWN ACCOUNT, SAVINGS TRANSFER.

### System categories

Seeded on first run alongside rules.

**Expenses:** Housing, Groceries, Dining & Takeaway, Transport, Subscriptions & Software, Health & Medical, Entertainment & Hobbies, Clothing & Personal Care, Travel, Utilities, Savings & Investments, Transfers, Other.
**Income:** Salary / Wages, Freelance / Contract, Transfers In, Other Income.

---

## Reimbursements (Transaction Links)

Tyler pays full rent each month; flatmates send back roughly two thirds across one or two payments in the days that follow. The default dashboard view should read as a single net expense, not as a spike up and a spike down.

The mechanism is `transaction_links`. Each reimbursement points to its parent outgoing. Charts and totals display **Net Cost** by default; raw figures available on hover or via a "show raw" toggle.

### Auto-link rule

On import completion, an incoming transaction automatically links to a parent outgoing if all hold:

- Description matches one of `user_settings.flatmate_names` (case-insensitive substring).
- Lands within seven days after an outgoing categorised as Housing.
- The outgoing is not already fully linked (sum of children does not exceed parent absolute amount).

Unmatched candidates land in the review queue for one-click manual linking.

---

## Multi-currency

Home Currency is AUD. Every Transaction and Balance Snapshot stores amount in the account's native currency, never converted at write time. The `fx_rates` table holds one row per (date, base, quote) pair; an Edge Function (`fx-daily`) seeds NZD↔AUD daily from frankfurter.app (free, keyless). Conversion happens at read time using the rate for the row's date, so historical charts do not drift retroactively when rates move. Missing-day fallback uses the nearest previous rate.

Tyler can flip Home Currency in settings without re-importing anything.

---

## Dashboard

`/finance` is a single page with a global time range scrubber at the top. All "over time" charts subscribe to the scrubber; pie charts treat the scrubber's end-date as their as-of point.

### Composition (top to bottom)

1. **Time navigator.** ECharts `dataZoom` slider. Default range: last 12 months. Scrubbing only re-renders; data is pre-loaded into the client store on mount.
2. **Net Worth pie** (top-left) + **Liquid line** (top-right). Pie breaks the latest snapshot at the scrubber's end-date down by Account. Line is the running total of Deposit Account balances over the scrubber range.
3. **Investments line.** Per-fund line (KiwiSaver, AustralianSuper) plus a thicker "total" line that is the sum of fund balances over time.
4. **Monthly snapshot.** Income vs expense for the trailing month within the scrubber range. Burn-down style, incoming and outgoing on a shared time axis so the gap reads as "saved this month." Net Cost applies, so flatmate reimbursements do not appear as income spikes.
5. **Category pie.** Breakdown of expenses for the displayed range, by Category, slot-coloured.
6. **Transactions table preview.** Last N transactions in the range, with a "view all" link to `/finance/transactions`.

### Charting

Apache ECharts is the project's default charting library (ADR-not-needed; locked in this V1). React 19 compat: charts use `echarts` core directly via a `useRef` + `useEffect` wrapper component (`app/src/components/Chart.tsx`). `echarts-for-react` is **not used** (lags React 19).

Categorical colours come from a 10-slot ramp `--chart-cat-0` through `--chart-cat-9` defined per palette in `app/src/themes/palettes.ts` (ADR 0003). Categories and Accounts hold a `colour_slot: int`, not a hex. Switching the active palette via the theme helper retints every chart in lockstep with the rest of the UI.

The live brand kit at `/brand-kit` includes a Chart slots swatch row and a demo of pie + line + bar primitives so the colour system can be refined visually.

---

## Upload UX

Three coordinated entry points, all leading to the same import drawer:

1. **Drag anywhere on `/finance`.** Dragging a PDF over the page surfaces a full-screen drop overlay; releasing kicks off the strategy chain.
2. **"Import" button in the page header.** Click-discoverable canonical entry.
3. **"Upload statement" button per account on `/finance/accounts`.** Pre-selects the account in the import flow.

The import drawer:
- Shows the parser strategy picked (and lets Tyler force a different one).
- For first-time-seen accounts, surfaces the prompt-then-continue modal pre-filled from sniffed header data.
- Renders the parsed transactions for confirmation before committing.
- Surfaces rule-engine matches inline so Tyler can see what was auto-categorised.

---

## PWA

Per-app manifests (ADR 0001). `/finance` and `/todos` install as separate iOS home-screen icons with their own name, theme colour, and start URL. Single service worker at the origin root. The TJOS hub at `/` is not installable.

---

## Data tables (summary)

Detailed schema in `_project/data-model.md`. Shape:

- `accounts`, Deposit and Investment Accounts. `account_type` enum. `colour_slot: int`. `institution`, `external_account_number` for sniffing on import. `opening_balance` for one-time seed.
- `transactions`, line items. `statement_id` (nullable). Stores native currency.
- `statements`, parsed source file metadata. Idempotent on `(account_id, period_start, period_end)`.
- `balance_snapshots`, per-Account-per-date balance. Auto-seeded from each statement's opening/closing.
- `transaction_links`, reimbursement relationships. `link_type = NETS_AGAINST`.
- `categories`, `category_rules`, `tags`, `transaction_tags`, categorisation surface.
- `fx_rates`, daily FX. NZD↔AUD seeded by `fx-daily` Edge Function.
- `user_settings`, `home_currency`, `flatmate_names: text[]`.

---

## Open questions

- Term deposit accounts (none today; would they be Deposit or Investment?). Defer until one shows up.
- Currency-denominated tags ("Bali 2025 spend in IDR"). Out of V1.
- Recurring transaction detection. Out of V1.
- Counterparty entity (instead of `flatmate_names: text[]`). Promote when a second use case appears.
