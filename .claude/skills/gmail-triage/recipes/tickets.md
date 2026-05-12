---
name: tickets
priority: 7
description: "Event tickets, booking confirmations, itinerary-bearing emails with an event date. Labels as 'Tickets' while upcoming, transitions to 'Slop/Tickets Past' after the event date passes. Naming convention mirrors other past-dated slop (Slop/Past Trip)."
---

# Tickets

## Purpose
Tickets and booking confirmations for events with a specific future date
— concerts, shows, flights (inbound), rail, sports, RSVPs, reservations
with a specific date/time — need to stay findable in the inbox until the
event happens (you may need the PDF / reference on the night). After the
event date passes, they're noise and should auto-downgrade to slop.

This is distinct from:
- `action-required` — hard deadline where missing it costs you (parcel
  expires, document window closes). Tickets have a date, but you've
  already "acted" by buying the ticket; the date is just *when*.
- `receipts-reimbursement` — pure receipt, no event date
- `flat-bills` — utility bills at shared addresses

## Match
Thread matches if ALL:
1. Contains a specific future event date (not "any time this month")
2. Issued to Tyler personally as a ticket-holder / attendee /
   reservation-holder
3. One of:
   - Ticket / e-ticket (Ticketmaster, Universe, Eventbrite, Moshtix,
     Humanitix, TicketEk, etc.)
   - Booking confirmation with date (Puffing Billy, theatre, restaurant
     reservation with specific time, tour, attraction)
   - Flight *itinerary* for an UPCOMING flight (not flight change
     notifications for past flights — those go to `past-trip` recipe)
   - Accommodation booking confirmation for an upcoming stay
   - RSVP / calendar invite with date

## Negatives (route elsewhere)
- Marketing for events ("concerts near you") — `Slop/Marketing`
- Receipts with no event date — `Receipt`
- Flight CHANGES for past flights — `Slop/Past Trip`
- Flight upgrade-bid offers — `Slop/Marketing`
- "Save the date" without ticket / booking reference — ❓ Needs your call

## Labels & lifecycle

Two labels, following the convention used by `Slop/Past Trip`:

- `Tickets` — applied while the event is upcoming
- `Slop/Tickets Past` — applied after the event date passes; `Tickets`
  label is removed at the same time

### On first classification (event date > today)
Apply `Tickets` label via gmail-proxy, mirror into `email_labels`.
Keep in inbox. Bucket in triage: **🎟️ Tickets — upcoming**.
Each line ends with `(<short event name>, <event date>)`.

### On subsequent scans where event date has passed

**Blocker check first.** Before proposing any transition to
`Slop/Tickets Past`, check for open state on the thread:
1. Any row in `tasks` with `source_ref = thread_id` and
   `status = 'active'` → BLOCK transition
2. Any `decisions` row with `action = 'task-completed'` or
   `action = 'review-completed'` linked to this thread → safe
3. Refund / cancellation / dispute language in the latest message →
   BLOCK transition
4. Thread has `Action Required` or `Receipt` label alongside
   `Tickets` and no clearance event logged → BLOCK transition

If BLOCKED: surface under **⚠️ Date passed but still open** in the
summary with the reason (e.g. "active task: collect Sephora parcel").
Thread keeps its original label. No auto-archive proposal. Tyler
resolves by marking the task done (`done N` / `collected N` /
`cleared N`) or by explicit override (`force-past N` — logs a
`decisions` row with `action='override'` so the pattern is visible).

Otherwise, propose transition as before:
  - Remove `Tickets`, add `Slop/Tickets Past` via a single
    gmail-proxy call
  - Update `email_labels`
  - Propose archive on the next archive pass

Transition still propose-then-confirm. Never silent.

## Proposed actions (upcoming tickets)

**Auto-label when obvious.** If ALL of these hold, apply `Tickets`
during Phase 2 classification without requiring per-item approval
(insert into `email_labels`, log a `decisions` row with
`action='auto-label'`, `metadata.confidence='high'`) rather than
proposing:
1. Specific future event date parseable from the body (not subject
   alone, not a fuzzy "save the date")
2. Subject or body contains an unambiguous ticket keyword ("ticket",
   "booking confirmation", "reservation confirmed", "e-ticket",
   "your booking", "booking details")
3. No refund / cancellation / transfer language in the thread
4. Thread not already labelled
5. Sender not blacklisted

Surface auto-labelled threads in a dedicated **🎟️ Auto-labelled
Tickets** section of the summary (event name + date per line) so
Tyler can still object. Revert with `unlabel N` → delete the
`email_labels` row and log `action='rule-change'`,
`reason='auto-label reverted — {reason}'`. A pattern of reverts is
signal to tighten criteria in a future project-dev-lane session.

**Otherwise propose normally:**
- Apply `Tickets` label (on approval)
- Keep in inbox (never propose archive while upcoming)
- If event is within 48h, surface in the 🚨 Action Required bucket
  with softer framing ("🎟️ tonight/tomorrow") — do NOT create a
  task automatically. Tyler already has the calendar event, usually.

## Edge cases
- **Ticket transfers** (e.g. Ticketmaster "You've accepted X ticket") —
  matches once the transfer is accepted; the transferee is now the
  ticket-holder. Check sender/recipient to confirm direction.
- **Broken merge-tag subjects** (e.g. `You've accepted %%=v(@artistName)=%%`)
  — don't trust the subject alone; fetch the thread body for the actual
  event name and date before labelling.
- **Multiple messages in one thread across the event date** (confirmation
  + reminder + follow-up) — use the LATEST event date referenced. If the
  event is past, the whole thread goes to `Slop/Tickets Past`.
- **Recurring memberships** (season pass, gym, KitKat-of-the-month) —
  not tickets. Route to `receipts-reimbursement` or `Slop/Account Notice`.
- **Refund / cancellation** — surface as ❓ Needs your call; the label
  transition depends on whether the refund is complete.

## Priority
7 — runs after `action-required` (5), before `flat-bills` (10),
`requires-review` (15), `receipts-reimbursement` (20), and
`marketing` (~50). Rationale: upcoming tickets are time-sensitive
reference material. Bumping above bills/receipts keeps them easy to
find on the night.

## Changelog
- 2026-04-19 (v0.2) — Added auto-label clause for obvious future-dated
  tickets. High-confidence matches apply `Tickets` during Phase 2 without
  per-item approval; ambiguous ones still propose-then-confirm.
  Also blocked auto-transition to `Slop/Tickets Past` while the thread
  has an active task, pending refund, or co-labelled `Action Required`
  / `Receipt`. Date passing ≠ done.
