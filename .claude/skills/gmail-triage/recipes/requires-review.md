---
name: requires-review
priority: 15
description: "Informational content Tyler needs to read to stay informed — money-in notices, investment statements, optional paid products from services he uses, policy changes that actually affect him. Not a deadline (that's action-required) and not a receipt of his own spending."
---

# Requires review

## Purpose
Emails that carry real information Tyler wants to absorb but don't
trigger a hard deadline. Distinct from `Slop/Account Notice` (passive
confirmations of things he's already done) and `Receipt` (outgoing
spend). This is inbound-value attention: money coming in, investment
performance, optional-but-legit paid products from services he uses,
policy changes that actually affect his accounts.

## Match
Thread matches if ANY of:
1. **Income / money-in notice** — dividend statement, interest payment,
   refund, rebate, reimbursement received, government payment.
2. **Investment / KiwiSaver / super statement** — periodic performance
   update, unit price notice, annual statement, tax certificate.
3. **Legal / policy change that actually affects him** — not a generic
   T&C refresh, but a change to a service he uses with material impact
   (fee change, benefit change, coverage change).
4. **Optional paid product from a service he uses** where there's a
   real buy/skip decision (e.g. MUFG/Link NZ Annual Tax Summary).
5. **AGM / voting notice / meeting invitation** as a shareholder or
   member where he may want to attend or vote.

## Negatives (route elsewhere)
- Generic T&C updates from services he barely uses → `Slop/Privacy Policy Update`
- Marketing pitches from services he doesn't use → `Slop/Marketing`
- Receipts for his own purchases → `Receipt` (or `receipts-reimbursement`)
- Hard personal deadlines → `Action Required`
- Confirmations of things he's already done → `Slop/Account Notice`

## Proposed actions
Bucket: **👀 Requires review — between 🚨 Action Required and Receipts in the triage summary**
- Never propose archive on first pass; thread stays in inbox until Tyler clears it
- **No task creation.** This is attention, not a deadline. If a deadline
  later emerges, a separate `action-required` entry is proposed.
- Apply label `Requires Review` via gmail-proxy, mirror into `email_labels`

## Labelling
Label: `Requires Review`. Mirror into `email_labels` on approval.
Never auto-removed — stays for audit (same convention as `Receipt` and
`Action Required`).

## Clearance (user says "reviewed N" / "read N" / "cleared N")
1. Insert `decisions` row: `action = 'review-completed'`,
   `target = thread_ref`, `metadata = {recipe: 'requires-review'}`.
2. Keep the `Requires Review` Gmail label.
3. Propose archive of the thread on the NEXT triage pass — now safe.

## Edge cases
- **Income notice that's also a tax document** — matches here; don't
  also tag it as `Receipt` (Receipt is outgoing spend).
- **Dividend re-investment confirmations** — matches (money-in, even
  if immediately re-invested).
- **Ambiguous between `Slop/Marketing` and `Requires Review`** — surface
  as ❓ Needs your call; Tyler's answer feeds future classification.
- **Investment / registry spam-looking content from a provider he
  doesn't actually use** — route to `Slop/Marketing`.

## Priority
15 — runs after `action-required` (5) and `flat-bills` (10), before
`receipts-reimbursement` (20) and `marketing` (~50). Rationale:
deadlines and shared-cost bills trump informational review;
informational review trumps receipts and generic slop.
