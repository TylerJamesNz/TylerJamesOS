# Finance App

## Goal

Replace manual financial tracking with an automatic, intelligent system. Import transactions from ANZ (Australia and New Zealand accounts), automatically categorise them, and surface meaningful insights — without Tyler having to manually enter anything.

---

## ANZ Data Import

### The challenge
ANZ does not have a public developer API. Options for getting data into the system:

**Option A: CSV / OFX export (V1 — recommended starting point)**
- ANZ lets you export transactions as CSV or OFX from internet banking
- Build an import page where Tyler uploads the file
- Parse it server-side, deduplicate against existing transactions, and store
- Simple, reliable, no ongoing auth headaches
- Downside: manual step required periodically

**Option B: Screen scraping / unofficial API**
- Tools like Basiq (AU) or Akahu (NZ) act as open banking middleware
- Akahu is specifically built for NZ and has ANZ support — worth investigating
- Would enable automatic/scheduled imports
- Has a cost (Akahu is free for personal use, worth confirming)
- ✅ **Akahu is the recommended long-term path for NZ accounts**

**Option C: Email parsing**
- ANZ sends transaction notification emails
- Could parse these to capture transactions in near-real-time
- Fragile and incomplete (not all transactions trigger emails)
- Last resort only

### Recommended approach
1. **V1:** CSV import with a clean upload UI
2. **V2:** Integrate Akahu for automatic NZ account sync
3. **V3 (if needed):** Investigate Australian ANZ options (Basiq or similar)

### Deduplication
Each transaction gets an `external_id` derived from the bank's reference. On import, skip any transaction where `external_id` already exists for that account.

---

## Tags

Tags are freeform labels applied to one or many transactions. Unlike categories (which are structured, one per transaction, used for insights and charts), tags are for personal context — grouping transactions that belong together even if they span multiple categories.

Examples:
- `"Bali 2025"` — tag all flights, hotels, restaurants, and activities from one trip
- `"groceries"` — tag supermarket runs separately from the Groceries category if needed
- `"bills"` — cross-cutting tag for anything that's a fixed obligation
- `"work expense"` — anything you might claim back

Tags can be applied manually on any transaction, or automatically via a CategoryRule (so every Air NZ transaction automatically gets tagged `"travel"`).

---

## Interpretation Engine

### The goal
Upload a CSV once and never manually categorise a known merchant again. The system should only ask Tyler about things it genuinely hasn't seen before. Claude is a fallback, not the primary engine — the rule library does the heavy lifting.

### Seeded rule library (ships with the app)

The app seeds a comprehensive set of `is_system = true` rules on first run, covering the merchants that appear in virtually every NZ and AU bank account. Claude is only called for transactions that make it past this entire list.

**New Zealand — Groceries**
- COUNTDOWN, PAK N SAVE, PAKNSAVE, NEW WORLD, FOUR SQUARE, FRESH CHOICE, SUPER VALUE, MOORE WILSONS, FARRO

**New Zealand — Dining & Takeaway**
- MCDONALD, MCDONALDS, KFC, BURGER KING, SUBWAY, DOMINOS, PIZZA HUT, HELL PIZZA, GUZMAN, FATIMA, CARL'S JR

**New Zealand — Fuel & Transport**
- Z ENERGY, BP, MOBIL, CALTEX, GULL, ALLIED, NZ BUS, AT HOP, METLINK, SNAPPER, UBER, OLA, ZOOMY

**New Zealand — Utilities**
- MERCURY, GENESIS, CONTACT ENERGY, MERIDIAN, TRUSTPOWER, VECTOR, WATERCARE, CHORUS, SPARK, VODAFONE, ONE NZ, 2DEGREES, SKINNY

**New Zealand — Government & Tax**
- INLAND REVENUE, IRD, ACC, KIWISAVER, WINZ, MSD

**New Zealand — Health**
- UNICHEM, LIFE PHARMACY, CHEMIST WAREHOUSE NZ, GREEN CROSS, ACCIDENT COMPENSATION

**New Zealand — Finance & Banking**
- ANZ FEES, ANZ VISA, ANZ HOME LOAN, ANZ BANK FEE, KIWIBANK, BNZ, WESTPAC, ASB

**Australia — Groceries**
- WOOLWORTHS, COLES, ALDI, IGA, HARRIS FARM, COSTCO

**Australia — Fuel & Transport**
- 7-ELEVEN, AMPOL, VIVA ENERGY, PUMA ENERGY, CALTEX AU, OPAL, MYKI, TRANSLINK, UBER AU

**Australia — Utilities**
- ORIGIN ENERGY, AGL, ENERGY AUSTRALIA, SYDNEY WATER, MELBOURNE WATER, TELSTRA, OPTUS, TPG, AUSSIE BROADBAND

**Australia — Government & Tax**
- AUSTRALIAN TAXATION, ATO, MEDICARE, CENTRELINK, SERVICES AUSTRALIA

**Australia — Health**
- PRICELINE, TERRY WHITE, CHEMIST WAREHOUSE AU, AMCAL, NATIONAL PHARMACIES

**Global — Subscriptions & Software**
- NETFLIX, SPOTIFY, APPLE.COM, APPLE ITUNES, GOOGLE, YOUTUBE, AMAZON PRIME, DISNEY PLUS, NEON, SKY TV, MICROSOFT, ADOBE, DROPBOX, NOTION, XERO, MYOB, FIGMA, GITHUB, OPENAI, ANTHROPIC, CHATGPT, CANVA, SLACK, ZOOM

**Global — Travel**
- AIR NZ, AIR NEW ZEALAND, JETSTAR, QANTAS, VIRGIN AUSTRALIA, EMIRATES, SINGAPORE AIR, AIRBNB, BOOKING.COM, EXPEDIA, HOTELS.COM, WOTIF

**Global — Dining chains**
- STARBUCKS, MCCAFE, GLORIA JEANS, THE COFFEE CLUB, ROBERT HARRIS

**Income patterns**
- SALARY, WAGES, PAYROLL, DIRECT CREDIT (employer name), FREELANCE, INVOICE

**Transfers (exclude from insights)**
- TRANSFER TO, TRANSFER FROM, OWN ACCOUNT, SAVINGS TRANSFER

### How it works — three-pass pipeline

Every transaction runs through three passes in order. The first pass that succeeds wins.

**Pass 1: Rule engine**

Before touching AI, check every transaction against the `CategoryRule` table. Rules are ordered by `priority` (higher first), then by `created_at` (newer first as a tiebreaker).

```
For each transaction:
  → Run description against each rule in priority order
  → If a rule matches: assign category + any auto-tags, mark source = RULE
  → Move to next transaction
```

Rules are cheap (a simple string match), fast, and deterministic. A transaction matched by a rule never touches the AI.

**Pass 2: Claude categorisation**

Any transaction that didn't match a rule goes to Claude in a single batched prompt (not one API call per transaction — send the whole unmatched batch at once to keep costs low).

Claude receives:
- The list of unmatched transactions (description, amount, type)
- The full list of available categories
- The full list of available tags
- A few examples of previously confirmed categorisations (for context)
- Today's date

Claude returns a structured array:
```json
[
  {
    "external_id": "txn_abc123",
    "category": "Groceries",
    "tags": ["groceries"],
    "confidence": "high",
    "reasoning": "Description 'COUNTDOWN METRO AUCKLAND' matches a major NZ supermarket chain",
    "suggest_rule": "COUNTDOWN"
  },
  {
    "external_id": "txn_def456",
    "category": "Travel",
    "tags": ["travel"],
    "confidence": "medium",
    "reasoning": "Description 'AIR NZ' suggests a flight but could be a refund",
    "suggest_rule": "AIR NZ"
  }
]
```

Note `suggest_rule` — Claude proactively recommends rules to create for merchants it recognises with high confidence. This is how the rule engine grows over time.

**Pass 3: Review queue**

Any transaction Claude returns with `confidence: low`, or any that errored, lands in the review queue for manual action.

---

### After import — the confirmation step

Once the pipeline runs, Tyler sees a summary screen before anything is committed to the database:

```
Import summary — 47 transactions

✅ 31 matched by rules (auto-confirmed, no action needed)
🤖 12 categorised by AI — review suggested
⚠️  4 need manual categorisation

[Confirm all AI suggestions]  [Review individually]  [Cancel import]
```

The "review individually" flow shows each AI-categorised transaction with Claude's reasoning and a one-click confirm or reassign. Fast to get through — most will be right.

---

### Rule creation flow

After confirming an AI categorisation, Tyler is offered the option to save a rule:

> "COUNTDOWN METRO AUCKLAND → Groceries. Save as rule for future imports?"
> Rule pattern: `COUNTDOWN` (pre-filled, editable) → [Save rule] [Skip]

Saved rules go into `CategoryRule` with `created_from = AI_SUGGESTION`. Next import, those transactions are handled instantly in Pass 1 with no AI cost.

Over time, the rule engine handles more and more of each import. The AI is only needed for genuinely new merchants.

---

### Cost management

Sending 100 transactions to Claude in a single batched prompt costs a few cents at most. The bigger risk is API latency — batching keeps this to one round trip regardless of import size. For large imports (500+ transactions), split into batches of ~100.

Rule coverage metric: worth tracking what percentage of each import is handled by rules vs AI. As this number grows, imports get faster and cheaper.

---

## Categories (system defaults)

These are created on first run. Tyler can add, rename, or merge them.

**Expenses:**
- Housing (rent, rates, insurance)
- Groceries
- Dining & Takeaway
- Transport (fuel, parking, public transport)
- Subscriptions & Software
- Health & Medical
- Entertainment & Hobbies
- Clothing & Personal Care
- Travel
- Utilities (power, water, internet, phone)
- Savings & Investments
- Transfers (between own accounts — exclude from insights)
- Other / Uncategorised

**Income:**
- Salary / Wages
- Freelance / Contract
- Transfers In
- Other Income

---

## Insights

Things the finance tab should surface:

**Monthly summary**
- Total income vs total expenses
- Net savings for the month
- Comparison to previous month

**Spending by category**
- Breakdown chart of where money went
- Biggest categories vs last month

**Recurring transactions**
- Automatically detected subscriptions and regular payments
- Total monthly committed spend

**Trends over time**
- 6 and 12-month views of income, spending, savings rate

**Alerts (future)**
- Unusual spending in a category
- Large single transactions

---

## UI overview

```
/finance
├── Overview card — this month's income, expenses, net
├── Recent transactions (last 10, with category badges)
└── Quick link to review queue if items need attention

/finance/transactions
├── Search + filter (date range, category, account)
├── Sortable table of all transactions
└── Click any row to edit category / add note

/finance/insights
├── Monthly summary
├── Category breakdown (pie/bar chart)
├── Trend over time (line chart)
└── Recurring transactions list

/finance/accounts
└── Connected accounts, import history, manual import button
```

---

## Open questions

- [ ] Confirm Akahu supports ANZ NZ — check akahu.nz
- [ ] What Australian bank accounts need to be covered?
- [ ] How frequently should auto-import run if using Akahu?
- [ ] Should transfers between own accounts be hidden from insights by default?
- [ ] Currency — transactions in NZD and AUD? Need multi-currency support?
- [ ] Should tag filtering be available in the transactions view? (e.g. show all transactions tagged "Bali 2025")
- [ ] Should there be a "trip summary" view — filter by tag and show total spend for that tag across all categories?
