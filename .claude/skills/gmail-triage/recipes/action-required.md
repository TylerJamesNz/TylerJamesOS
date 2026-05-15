---
name: action-required
priority: 5
description: "Personal deadlines where missing costs something (parcel returns, ticket expiry, RSVP cutoff). Keeps in inbox, creates a task, surfaces at top of triage until cleared."
---

# Action required

## Purpose
Emails carrying a hard personal deadline — parcel collection, ticket
pickup, RSVP cutoff, document signing window — must stay visible and
be tracked as tasks, not buried in triage. Missing them costs something
concrete (returned parcel, lost seat, expired form).

## Match
Thread matches if ALL:
1. Concrete date / window stated, typically within ~14 days
2. Missing it has a real loss (returns to sender, expires, cancelled, lost spot)
3. Personal / addressed to Tyler, not a generic promo

Positive signals: "returns to sender after", "expires on", "collect by",
"last day to", "RSVP by", "complete by", "your booking will be cancelled",
"pickup deadline".

Negatives (route elsewhere):
- Loyalty rewards "expiring in Nd" with no real personal cost → marketing
- Upgrade-bid expiry, promo countdowns → marketing
- Utility bills → flat-bills / personal-bills
- Receipts needing reimbursement → receipts-reimbursement

## Proposed actions
Bucket: **🚨 Action required — top of the summary, above everything**
- Never propose archive on any pass; thread stays in inbox until cleared
- Create a `tasks` row with:
  - `title` — short imperative (e.g. "Collect Sephora parcel from Chapel Street North LPO")
  - `due_at` — deadline from email, 23:59 local on that date
  - `source_skill` = 'gmail-triage'
  - `source_ref` = thread_id
  - `description` — location / tracking / reference details
  - `priority` — 2 if <3 days out, 1 if <7 days, 0 otherwise
- Apply label `Action Required` via gmail-proxy, mirror into `email_labels`.

## Labelling
Label: `Action Required`. Mirror into `email_labels` on approval.
Never auto-removed — stays for audit after clearance (same convention
as `Receipt`).

## Clearance (user says "done N" / "collected N" / "cleared N")
1. Update linked `tasks` row: `status = 'done'`.
2. Insert `decisions` row: `action = 'task-completed'`,
   `target = thread_ref`, `metadata = {task_id, recipe: 'action-required'}`.
3. Keep the `Action Required` Gmail label.
4. Propose archive of the thread on the NEXT triage pass — now safe.

## Never auto-downgrade while open

An `Action Required` thread is **never** reclassified to slop based
on the due date alone. The clearance signal is an explicit user
action (`done N` / `collected N` / `cleared N`) that marks the
linked task row `status='done'`. Until that happens:
- Thread keeps `Action Required` label regardless of how far past
  the due date
- Surface in the summary under **⚠️ Deadline passed — still open**
  with the original deadline shown, so the thread stays visible
  instead of getting buried
- No archive proposal, no slop transition, no silent state change

If Tyler wants to drop it without completing (e.g. parcel returned
to sender, gave up), he says `drop N` → logs a `decisions` row with
`action='dropped'`, `reason=<captured>` and the task moves to
`status='dropped'`. Label stays for audit.

## Edge cases
- **Deadline already passed.** Still surface with "⚠️ Deadline passed — may be too late". Create task anyway so Tyler can note outcome.
- **Multiple deadlines in one thread.** One task per deadline; single Gmail label on the thread.
- **Fuzzy deadline** ("soon", "this week"). Surface as ❓ Needs your call — don't guess.

## Priority
5 — runs before flat-bills (~10) and receipts (~20). Action-required
trumps other classifications: a flat-bill that's also a final-notice-
before-disconnection is primarily action-required.

## Changelog
- 2026-04-19 (v0.2) — Added "Never auto-downgrade while open" section.
  Action Required threads never transition to slop on due-date alone;
  only explicit `done N` / `drop N` moves them. Overdue-but-open items
  surface under ⚠️ Deadline passed — still open so they stay visible.
