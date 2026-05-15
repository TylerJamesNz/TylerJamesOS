---
name: flat-bills
priority: 10
---

# Flat bills

Bills addressed to the flat — power, internet, water, rates — that need to be split three ways.

## Match

- Sender in `senders` with `list='flat-bill'` (seeded by explicit approval over time), **or**
- Known utility domain (candidates to confirm via first-time approval: `mercury.co.nz`, `contact.co.nz`, `2degrees.nz`, `slingshot.co.nz`, `wcc.govt.nz`), **and**
- Subject/body contains bill keywords: `invoice`, `bill`, `account statement`, `amount due`, `due date`.

If domain is a utility but subject looks like marketing ("upgrade your plan", "new offer"), bail — hand off to the `marketing` recipe.

## Confidence

- **High** — sender in `senders` as `flat-bill` + keyword match.
- **Medium** — utility domain + keyword match, sender not yet classified (propose + first-time approval to add to `senders`).
- **Low / ambiguous** — utility domain with no keywords, or keywords with unknown domain → ❓ Needs your call.

## Action spec

On per-item approval:

1. **Extract bill details** from the thread: amount, due date, account reference. Keep sensitive refs (account numbers) out of forward body.
2. **Archive** the original thread (remove `INBOX`).
3. **Create task** in `tasks`:
   - `title`: `Follow up with flatmates re: [provider] bill — $[amount], 1/3 share = $[share]`
   - `due_at`: now + 7 days
   - `source_thread_id`: Gmail thread id
4. **Draft forward to flatmates** via `create_draft`:
   - **To:** flatmate addresses (seed in `senders` with `list='flatmate'`; ask first time).
   - **Subject:** `Flat bill — [provider] — $[amount] due [date]`
   - **Body:** short ask. `Your third is $[share]. Can you send by [due]?`
   - **Attachments:** TBD. The forward must carry the bill PDF/image, not just the ask. Mechanism to be picked in a live session after probing `create_draft`'s schema — see [roadmap.md](../../../../architecture/roadmap.md).

## Approval prompt

```
Flat bill from [provider] — $[amount] due [date].
Proposed: archive + task "follow up in 7 days" + draft forward to flatmates ($[share] each).
OK? (y / adjust / skip)
```

## Changelog
- 2026-04-18 — Scaffold. Attachment mechanism deferred; needs live probe of `create_draft` schema.
