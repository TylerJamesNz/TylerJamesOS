---
name: receipts-reimbursement
priority: 20
description: "Purchase receipts/invoices that may be reimbursable. Never auto-archive; hold in inbox until Tyler clears each one."
---

# Receipts (reimbursement review)

## Purpose
Any receipt that might be work-reimbursable must stay visible in the
inbox until Tyler decides: submit for reimbursement, mark personal,
or archive. Prevents the generic marketing/transactional rules from
silently archiving something he hasn't actioned.

## Match
Thread matches if ALL:
1. Looks like a purchase receipt/invoice — subject contains "receipt",
   "invoice", "tax invoice", "your order", "payment confirmation",
   "order confirmation"; OR body leads with order/invoice number or
   "thanks for your purchase"
2. NOT a utility/flat bill (hand to `flat-bills`)
3. NOT a $0 plan/subscription confirmation with no charge

Matches: Anthropic receipts, Apple tax invoices, Uber trips,
restaurant receipts, hotel/flight invoices, Amazon order confirmations.
Does not match: ALDI "plan added" ($0 confirmation), policy updates.

## Proposed action
Bucket: **Kept for attention — receipts to action**
Reason: `receipt — review for reimbursement`
Include merchant + amount + date in the one-liner so Tyler can scan.
Never propose archive on first pass.

## Labelling (Supabase-backed, NOT Gmail)

The official Gmail connector is read + drafts only — it cannot
apply or remove labels on threads. Labels are stored in the
Supabase `email_labels` table instead. A thread can carry multiple
labels. The summary output surfaces labels inline on every line.

### Labels used
- `Receipt` — applied when the thread lands in "Kept for attention".
  Signals "not yet reviewed".
- `Reimbursement` — applied on clearance if Tyler says `reimbursed N`.
  Coexists with `Receipt` (do NOT remove `Receipt` on reimbursement) so
  the full audit trail stays visible.

### Lifecycle
1. **On approve at triage** (receipts confirmed as kept-for-attention):
   ```sql
   insert into email_labels (thread_id, label, source, session_id)
   values ($thread_id, 'Receipt', 'mobile'|'desktop', $session_id)
   on conflict (thread_id, label) do nothing;
   ```
2. **On `reimbursed N`**:
   ```sql
   insert into email_labels (thread_id, label, source, session_id)
   values ($thread_id, 'Reimbursement', ..., ...)
   on conflict do nothing;
   ```
   Do not delete the `Receipt` row.
3. **On `personal N` or `archive receipt N`**:
   No label change. Log disposition in `decisions`:
   ```sql
   insert into decisions (session_id, source, skill, action, target, reason, metadata)
   values (..., 'archived', $thread_ref, 'receipt cleared — personal',
     jsonb_build_object('receipt_disposition', 'personal', 'thread_id', $thread_id));
   ```
   Tyler is responsible for archiving the thread in Gmail manually until
   the connector gains modify scope or a custom MCP is wired in.

### Summary rendering
Each summary line ends with `[labels]` — e.g.
`Anthropic receipt #2966 (today) [Receipt]`
`Anthropic receipt #2458 (Apr 4) [Receipt, Reimbursement]`
Prior-session labels are loaded at scan time and surfaced the same way.

## Clearance log (decisions)
Every clearance also inserts a `decisions` row with
`metadata.receipt_disposition = 'reimbursed' | 'personal'`
so disposition trends feed future learnings.

## Edge cases
- Recurring subscription receipts (monthly Anthropic, Apple) — each
  instance reviewed independently. No bulk-clear past instances
  without explicit say-so.
- Refund / credit note — surface as **Needs your call**; could affect
  a reimbursement already submitted.
- Flight *invoices* (with $) match; flight *updates/changes* don't.

## Priority
20 — runs before marketing (~50). After flat-bills (~10) so utility
bills at shared addresses go there first.
