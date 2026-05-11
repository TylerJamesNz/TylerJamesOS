# Data Model

## Status: V1, Finance schema additions locked

Canonical glossary: `/CONTEXT.md`. Architecture: `_project/architecture.md`. Live schema diverges from `_project/data-model.md` for the Todos slice (see `_project/migration-todos.md`); this file is the source of truth for the **Finance** entities about to land.

---

## Core entities

### User
Single user system, but modelled properly for future extensibility.

```
User {
  id           UUID (PK)
  email        String (unique), from Google
  name         String
  avatar_url   String?
  google_id    String (unique)
  created_at   DateTime
  updated_at   DateTime
}
```

---

### Session (Auth)
Removed. Supabase Auth manages sessions via `auth.sessions`; no application-level Session entity.

---

### Transaction (Finance)
Core financial record, imported from a Statement, ingested live, or entered manually.

```
Transaction {
  id               UUID (PK)
  user_id          UUID (FK → User)
  external_id      String?       , bank reference, for dedup; unique with account_id
  account_id       UUID (FK → Account)
  statement_id     UUID? (FK → Statement) , null for manual entries
  source           Enum: STATEMENT | LIVE | MANUAL  , data origin (see Live data section in PRD)
  superseded_at    DateTime?     , set when a Live row could not be matched by a covering Statement
  date             Date
  description      String        , raw description from bank
  amount           Decimal       , positive = income, negative = expense, in account currency
  type             Enum: DEBIT | CREDIT
  category_id      UUID? (FK → Category)
  category_source  Enum: RULE | MANUAL
  rule_id          UUID?         , which CategoryRule matched (if source = RULE)
  needs_review     Boolean       , flagged for user to confirm
  notes            String?
  created_at       DateTime
  updated_at       DateTime
}
```

`source` distinguishes the data origin per `/CONTEXT.md` Source of Truth Hierarchy: Statement > Live > Manual. When a Statement imports rows whose period covers existing Live rows, match-and-merge promotes matched Live rows in place (UPDATE source = 'STATEMENT' + statement_id + statement-side metadata). Unmatched Live rows in the period get a `superseded_at` timestamp; they stop appearing in trending without being silently dropped.

Transactions relate to Tags via TransactionTag, to other Transactions via TransactionLink.

---

### Account (Finance)
A Deposit or Investment account. See `/CONTEXT.md` for the domain distinction.

```
Account {
  id                       UUID (PK)
  user_id                  UUID (FK → User)
  name                     String        , e.g. "ANZ AU Primary", "AustralianSuper"
  institution              String        , e.g. "ANZ NZ", "AustralianSuper", "ANZ AU"
  account_type             Enum: DEPOSIT | INVESTMENT
  external_account_number  String?       , for sniffing on import
  currency                 String        , default "AUD"
  opening_balance          Decimal?      , one-time seed for Deposit running balance
  colour_slot              Int           , 0..9, position in palette categorical ramp
  akahu_account_id         String?       , unique; maps this Account to an Akahu account for NZ live ingest
  gmail_label              String?       , Gmail label that catches this account's Activity Alerts for AU live ingest
  created_at               DateTime
}
```

`akahu_account_id` is set once during the Akahu OAuth flow on the integrations settings page; `gmail_label` is set per AU account during Gmail OAuth setup.

---

### Category (Finance)
Expense/income categories used for triage and insights.

```
Category {
  id           UUID (PK)
  user_id      UUID (FK → User)
  name         String        , e.g. "Groceries", "Rent", "Income - Salary"
  type         Enum: INCOME | EXPENSE
  colour_slot  Int           , 0..9, position in palette categorical ramp
  icon         String?       , icon name from icon library
  is_system    Boolean       , system-default vs. user-created
  created_at   DateTime
}
```

---

### Tag (Finance)
Freeform labels applied to transactions. Unlike categories (one per transaction, structured), tags are many-to-many and user-defined. Examples: "Bali trip", "groceries", "work expense", "date night".

```
Tag {
  id           UUID (PK)
  user_id      UUID (FK → User)
  name         String        , e.g. "Bali 2025", "groceries", "bills"
  colour_slot  Int           , 0..9, position in palette categorical ramp
  created_at   DateTime
}
```

---

### TransactionTag (join table)
Many-to-many relationship between transactions and tags.

```
TransactionTag {
  transaction_id  UUID (FK → Transaction)
  tag_id          UUID (FK → Tag)
  @@id([transaction_id, tag_id]) , composite PK
}
```

---

### CategoryRule (Finance)
The categorisation engine's memory. Maps a merchant pattern to a category so future imports don't need manual review for known merchants.

```
CategoryRule {
  id            UUID (PK)
  user_id       UUID (FK → User)
  pattern       String        , text to match against transaction description
  match_type    Enum: CONTAINS | STARTS_WITH | EXACT | REGEX
  category_id   UUID (FK → Category)
  auto_tag_ids  UUID[]        , optional: also apply these tags automatically
  priority      Int           , higher number = checked first. Default 0.
  created_from  Enum: SYSTEM | USER
  is_system     Boolean       , true = shipped with the app, false = user-created
  disabled      Boolean       , user can turn off a system rule without deleting it
  match_count   Int           , how many times has this rule fired? (for analytics)
  created_at    DateTime
}
```

`is_system` rules are seeded on first run and cover common NZ/AU merchants. Tyler can disable any system rule but cannot accidentally delete it, a future app update won't re-seed rules he's turned off because `disabled = true` is preserved.

Examples of rules:
- `COUNTDOWN` + CONTAINS → Groceries
- `NETFLIX` + CONTAINS → Subscriptions & Software
- `SALARY` + CONTAINS → Salary / Wages
- `AIR NZ` + CONTAINS → Travel, auto-tag: ["travel"]

---

### Statement (Finance)
The source PDF and its parse metadata. One row per imported statement; idempotent on `(account_id, period_start, period_end)`. Re-uploading replaces the row and its child transactions.

```
Statement {
  id                UUID (PK)
  user_id           UUID (FK → User)
  account_id        UUID (FK → Account)
  period_start      Date
  period_end        Date
  storage_path      String        , Supabase Storage key, "userId/accountId/YYYY-MM.pdf" (period_end month)
  parser_strategy   Enum: TEXT_FORMAT_SPECIFIC | TEXT_GENERIC | OCR_GENERIC | MANUAL
  parser_version    String        , "anz-nz/1.0.0" etc., for re-parse on improvement
  opening_balance   Decimal
  closing_balance   Decimal
  status            Enum: IMPORTED | NEEDS_REVIEW | FAILED
  imported_at       DateTime
  created_at, updated_at DateTime
  @@unique([account_id, period_start, period_end])
}
```

Each successful import seeds two BalanceSnapshots: opening at `period_start`, closing at `period_end`.

---

### BalanceSnapshot (Finance)
Recorded balance for an Account on a date. Source of truth for "balance over time" charts. Deposit Accounts get one per imported Statement (opening + closing); Investment Accounts get one per provider statement.

```
BalanceSnapshot {
  id           UUID (PK)
  user_id      UUID (FK → User)
  account_id   UUID (FK → Account)
  date         Date
  balance      Decimal       , in account currency
  source       Enum: STATEMENT | MANUAL
  statement_id UUID? (FK → Statement)
  created_at   DateTime
}
```

---

### TransactionLink (Finance)
Pairs a reimbursement (incoming) against the parent outgoing it nets. See "Net Cost" in `/CONTEXT.md`.

```
TransactionLink {
  id                       UUID (PK)
  user_id                  UUID (FK → User)
  parent_transaction_id    UUID (FK → Transaction) , outgoing
  child_transaction_id     UUID (FK → Transaction) , incoming reimbursement
  link_type                Enum: NETS_AGAINST
  note                     String?
  created_at               DateTime
}
```

Auto-created on import when an incoming Transaction's description matches one of `user_settings.flatmate_names` and the transaction lands within seven days of an outgoing categorised as Housing. Manual creation supported from any transaction row.

---

### FxRate (Finance)
Daily FX snapshots used for Home Currency conversion at read time. Seeded by the `fx-daily` Edge Function from frankfurter.app.

```
FxRate {
  id           UUID (PK)
  date         Date
  base         String        , e.g. "NZD"
  quote        String        , e.g. "AUD"
  rate         Decimal       , 1 base = `rate` quote
  source       String        , "frankfurter" for V1
  fetched_at   DateTime
  @@unique([date, base, quote])
}
```

Read-time conversion uses the rate for the row's date; missing-day fallback is the nearest previous rate.

---

### UserSettings (Finance / global)
One row per User. Holds per-user configuration that affects behaviour across apps.

```
UserSettings {
  user_id          UUID (PK, FK → User)
  home_currency    String        , default "AUD"
  flatmate_names   String[]      , used by TransactionLink auto-link rule
  created_at, updated_at DateTime
}
```

Counterparty entity (a richer registry beyond flatmate names) is deferred until a second use case appears.

---

### ExternalIntegration (Finance / global)
Stores OAuth credentials for the live-data sources: Akahu (NZ live) and Gmail (AU live). Tokens are encrypted at rest via Supabase Vault. One row per (user, provider).

```
ExternalIntegration {
  id                        UUID (PK)
  user_id                   UUID (FK → User)
  provider                  Enum: akahu | gmail
  encrypted_access_token    bytea         , Supabase Vault wraps the plaintext at rest
  encrypted_refresh_token   bytea?        , null if the provider does not issue refresh tokens
  expires_at                DateTime?     , null if non-expiring
  scopes                    String[]      , granted OAuth scopes
  created_at, updated_at    DateTime

  UNIQUE (user_id, provider)
}
```

The Edge Functions (`akahu-sync`, `anz-au-sync`, plus their OAuth-exchange callbacks) are the only readers. RLS keys on `auth.uid() = user_id`. On a 401 from the provider, the function uses `encrypted_refresh_token` to refresh and updates the row.

---

### LiveSyncRun (Finance, observability)
Append-only log of every live-ingest run, for the review queue and debugging.

```
LiveSyncRun {
  id              UUID (PK)
  user_id         UUID (FK → User)
  provider        Enum: akahu | gmail
  started_at      DateTime
  finished_at     DateTime?
  inserted_count  Int           , number of new Live Transactions inserted
  unparseable     JSONB[]       , Gmail-side only: array of { message_id, reason } for emails that did not parse
  error_message   String?
}
```

Surfaced in `/finance` review queue: "3 alerts in the last week couldn't be parsed".

---

### Task (Todos)
A to-do item, replacing Todoist.

```
Task {
  id           UUID (PK)
  user_id      UUID (FK → User)
  title        String
  description  String?
  status       Enum: TODO | IN_PROGRESS | DONE | CANCELLED
  priority     Enum: LOW | MEDIUM | HIGH | URGENT
  due_date     Date?
  project_id   UUID? (FK → Project)
  created_via  Enum: VOICE | MANUAL | API
  raw_voice    String?       , original voice transcript, for debugging
  created_at   DateTime
  updated_at   DateTime
  completed_at DateTime?
}
```

---

### Project (Todos)
Groups tasks together, equivalent to Todoist projects.

```
Project {
  id           UUID (PK)
  user_id      UUID (FK → User)
  name         String
  colour       String?
  is_archived  Boolean       , default false
  created_at   DateTime
}
```

---

## Relationships summary

```
User
 ├── has one  UserSettings
 ├── has many Account
 ├── has many Transaction (via Account)
 ├── has many Statement (via Account)
 ├── has many BalanceSnapshot (via Account)
 ├── has many TransactionLink
 ├── has many ExternalIntegration (one per provider: akahu, gmail)
 ├── has many LiveSyncRun
 ├── has many Category
 ├── has many CategoryRule
 ├── has many Tag
 ├── has many Task
 └── has many Project

Account
 ├── has many Transaction
 ├── has many Statement
 └── has many BalanceSnapshot

Statement
 ├── has many Transaction
 └── has many BalanceSnapshot (opening + closing seeded on import)

Transaction
 ├── belongs to Account
 ├── belongs to Statement (optional, null for manual)
 ├── belongs to Category (optional)
 ├── matched by CategoryRule (optional, via rule_id)
 ├── has many Tags (via TransactionTag)
 └── linked to other Transactions (via TransactionLink, parent or child)

TransactionLink
 ├── parent_transaction_id → Transaction (the outgoing)
 └── child_transaction_id  → Transaction (the reimbursement)

CategoryRule
 ├── belongs to Category
 └── optionally references many Tags (auto_tag_ids)

Tag
 └── has many Transactions (via TransactionTag)

FxRate
 └── unique on (date, base, quote)

Task
 └── belongs to Project (optional)
```

---

## Open questions

- [ ] Soft deletes (deleted_at) on Statement and Transaction, useful for re-parse audit trail?
- [ ] Should Category be shared/system-wide or always per-user?
- [ ] Recurring transaction detection, out of V1; revisit when manual review fatigue appears.
- [ ] CategoryRule.auto_tag_ids, store as UUID array in Postgres or a separate join table?
- [ ] Term deposit accounts: Deposit or Investment? Defer until one shows up.
- [ ] Counterparty entity vs UserSettings.flatmate_names: promote when a second use case appears.
