# Tyler James OS Glossary

The canonical names for things in this system. When a user-facing label, a route, a database column, or a function name needs to refer to one of these concepts, use the term defined here. If a new term comes up in conversation that conflicts with an entry below, surface the conflict before substituting.

## Account types

**Deposit Account.** An account at a bank where money is held on deposit and withdrawable per the account terms. Covers checking, savings, and money market sub-types. Tyler's Deposit Accounts are ANZ NZ, ANZ AU primary, and ANZ AU savings. Source data is transaction-level: every debit and credit is recorded individually, and the running balance is derived from the latest known statement balance plus transactions since.

**Investment Account.** An account holding units, shares, or fund interests managed by a trustee or fund manager. Tyler's Investment Accounts are his KiwiSaver (NZ) and Australian Super (AU). Source data is balance-level: each statement records the balance at a point in time, not individual market movements. Contributions may be recorded as transactions when the source statement breaks them out.

## Balances and net worth

**Balance Snapshot.** The recorded balance of an Account on a specific date, sourced from a statement. Deposit Accounts produce one snapshot per imported bank statement (opening and closing balance); Investment Accounts produce one snapshot per provider statement. Snapshots are the source of truth for any "balance over time" chart.

**Liquid.** UI-only metric label. The total of the latest Balance Snapshot across all Deposit Accounts, optionally adjusted for transactions since that snapshot. The home-page top chart is "Liquid over time." Not an entity name; never appears in table or column names.

**Net Worth.** The sum of the latest Balance Snapshot across all Accounts (Deposit + Investment). The home-page top-left pie chart breaks Net Worth down by Account.

## Currency

**Home Currency.** The single currency every cross-account chart and total is converted to before display. Set to AUD. Source amounts on Transactions and Balance Snapshots are always stored in the account's native currency; conversion happens at read time using the FX rate for the row's date, so historical charts don't shift retroactively when rates move.

## Transactions and netting

**Transaction Link.** A relationship between two Transactions where one is a reimbursement that nets against the other. The classic case: Tyler pays the full rent ($X outgoing) and receives flatmate reimbursements ($0.67X incoming over a few days), and wants the chart to read as a single $0.33X expense rather than as a $X expense plus $0.67X of income. Auto-created when an incoming transaction matching a known flatmate's name lands within seven days of an outgoing categorised as Rent. Manually creatable from any transaction row.

**Net Cost.** The amount of an outgoing Transaction after subtracting the sum of its linked incoming reimbursements. Shown by default on charts and totals. The pre-link figure is "Gross Cost" and is exposed on hover or via a "show raw" toggle.

**Live Transaction.** A Transaction inserted from a real-time data source (Akahu for NZ accounts, ANZ Activity Alert email parse for AU accounts) before the canonical Statement covering its period is imported. Live Transactions power current-month trending on `/finance` home; they are never used for audit reporting. When a Statement covering a Live Transaction's date is later imported, the Live row is promoted in place to a Statement-source row by match-and-merge on (account_id, date, amount, type). Manual Transaction Links pinned to the row survive the promotion because the primary key does not change.

**Source of Truth Hierarchy.** From most to least authoritative: Statement (canonical audit truth) > Live (mid-period preview, replaced by Statement when one arrives) > Manual (user-entered, sits between in trust depending on context).

## Charts and theming

**Categorical Slot.** A position 0..9 in the active palette's 10-colour categorical ramp. Categories and Accounts are assigned a slot at creation, not a fixed hex. Charts read the slot's current colour from CSS custom properties (`--chart-cat-0` through `--chart-cat-9`), so flipping the palette retints every chart in lockstep with the rest of the UI. The Category and Account `colour` fields hold a slot index (integer), not a hex string.
