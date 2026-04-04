# Data Model

## Status: Draft — needs review before implementation

---

## Core entities

### User
Single user system, but modelled properly for future extensibility.

```
User {
  id           UUID (PK)
  email        String (unique) — from Google
  name         String
  avatar_url   String?
  google_id    String (unique)
  created_at   DateTime
  updated_at   DateTime
}
```

---

### Session (Auth)
Managed by NextAuth.js / Auth.js. Stored in database.

```
Session {
  id            String (PK)
  user_id       UUID (FK → User)
  session_token String (unique)
  expires       DateTime
}
```

---

### Transaction (Finance)
Core financial record, imported from ANZ.

```
Transaction {
  id               UUID (PK)
  user_id          UUID (FK → User)
  external_id      String?        — ANZ transaction reference, for dedup
  account_id       UUID (FK → Account)
  date             Date
  description      String         — raw description from bank
  amount           Decimal        — positive = income, negative = expense
  type             Enum: DEBIT | CREDIT
  category_id      UUID? (FK → Category)
  category_source  Enum: RULE | AI | MANUAL  — how was it categorised?
  rule_id          UUID?          — which CategoryRule matched (if source = RULE)
  ai_confidence    Enum: HIGH | MEDIUM | LOW | null
  ai_reasoning     String?        — Claude's explanation, stored for debugging
  needs_review     Boolean        — flagged for user to confirm
  notes            String?
  created_at       DateTime
  updated_at       DateTime
}
```

Transactions relate to Tags via a join table (see TransactionTag below).

---

### Account (Finance)
Represents a bank account (ANZ may have multiple — savings, everyday, etc.)

```
Account {
  id           UUID (PK)
  user_id      UUID (FK → User)
  name         String         — e.g. "ANZ Everyday", "ANZ Savings"
  account_type Enum: CHECKING | SAVINGS | CREDIT
  currency     String         — default "NZD"
  created_at   DateTime
}
```

---

### Category (Finance)
Expense/income categories used for triage and insights.

```
Category {
  id           UUID (PK)
  user_id      UUID (FK → User)
  name         String         — e.g. "Groceries", "Rent", "Income - Salary"
  type         Enum: INCOME | EXPENSE
  colour       String?        — hex, for UI display
  icon         String?        — icon name from icon library
  is_system    Boolean        — system-default vs. user-created
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
  name         String         — e.g. "Bali 2025", "groceries", "bills"
  colour       String?        — hex, for UI badge display
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
  @@id([transaction_id, tag_id])  — composite PK
}
```

---

### CategoryRule (Finance)
The interpretation engine's memory. Maps a merchant pattern to a category so future imports don't need AI or manual review for known merchants.

```
CategoryRule {
  id            UUID (PK)
  user_id       UUID (FK → User)
  pattern       String         — text to match against transaction description
  match_type    Enum: CONTAINS | STARTS_WITH | EXACT | REGEX
  category_id   UUID (FK → Category)
  auto_tag_ids  UUID[]         — optional: also apply these tags automatically
  priority      Int            — higher number = checked first. Default 0.
  created_from  Enum: SYSTEM | USER | AI_SUGGESTION
  is_system     Boolean        — true = shipped with the app, false = user/AI created
  disabled      Boolean        — user can turn off a system rule without deleting it
  match_count   Int            — how many times has this rule fired? (for analytics)
  created_at    DateTime
}
```

`is_system` rules are seeded on first run and cover common NZ/AU merchants. Tyler can disable any system rule but cannot accidentally delete it — a future app update won't re-seed rules he's turned off because `disabled = true` is preserved.

Examples of rules:
- `COUNTDOWN` + CONTAINS → Groceries
- `NETFLIX` + CONTAINS → Subscriptions & Software
- `SALARY` + CONTAINS → Salary / Wages
- `AIR NZ` + CONTAINS → Travel, auto-tag: ["travel"]

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
  raw_voice    String?        — original voice transcript, for debugging
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
  is_archived  Boolean        — default false
  created_at   DateTime
}
```

---

## Relationships summary

```
User
 ├── has many Account
 ├── has many Transaction (via Account)
 ├── has many Category
 ├── has many CategoryRule
 ├── has many Tag
 ├── has many Task
 └── has many Project

Account
 └── has many Transaction

Transaction
 ├── belongs to Category (optional)
 ├── matched by CategoryRule (optional, via rule_id)
 └── has many Tags (via TransactionTag)

CategoryRule
 └── belongs to Category
 └── optionally references many Tags (auto_tag_ids)

Tag
 └── has many Transactions (via TransactionTag)

Task
 └── belongs to Project (optional)
```

---

## Open questions

- [ ] Do we need soft deletes (deleted_at) on any entities?
- [ ] Should Category be shared/system-wide or always per-user?
- [ ] How do we handle recurring transactions (rent, subscriptions)?
- [ ] Will there be file attachments on Tasks (receipts, docs)? If so, add storage model.
- [ ] Should tags be shareable across finance and todos, or finance-only? (Probably finance-only for now)
- [ ] CategoryRule.auto_tag_ids — store as UUID array in Postgres or a separate join table?
