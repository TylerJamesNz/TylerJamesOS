---
name: gmail-triage
description: "Use when Tyler asks to triage, scan, review, clean up, summarize, or archive emails in his Gmail inbox. Triggers on phrases like 'triage my inbox', 'what's in my Gmail', 'scan my emails', 'clean up my inbox', 'archive junk', or similar. Always requires the Gmail connector. Never acts without explicit per-item approval."
---

# Gmail Triage

## Purpose

Scan Tyler's Gmail inbox, identify obviously-archival emails, propose them with
reasons, and archive **only** what he explicitly approves. Every decision he
makes is logged so the skill gets sharper over time without him having to
restate preferences.

## Core rules — non-negotiable

1. **Propose, then confirm. Never archive-then-tell.** Produce a numbered list
   with a reason per item. Wait for Tyler to say which items to archive.
2. **Scope to Gmail's Archive action.** Do not delete, do not mark as spam, do
   not move to trash. "Archive" = remove the `INBOX` label only.
3. **Instructions layer (this SKILL.md) is git-controlled.** Never modify
   this file without a proposed diff in chat, explicit approval, and the
   full git + UPSERT-to-Supabase flow.

   **State layer (Supabase tables `senders`, `decisions`, `sessions`,
   `tasks`, `email_labels`)** is the shared DB. Write to these directly
   via the Supabase connector after Tyler's per-item chat approval —
   "add Spotify to whitelist" is enough, no separate diff step. The
   same tables are read/written by desktop AND mobile sessions.
4. **Log every decision to the `decisions` table.** Every approved
   archive, every explicit rejection, every rule change inserts a row
   into `decisions` with `action`, `target`, `reason`, `source`
   (`desktop`/`mobile`), and `session_id`. Timestamps come from the
   column default (`created_at = now()`) — you don't generate them.
5. **Marketing requires explicit approval per sender first time.** A
   sender only becomes auto-archive after Tyler has explicitly approved
   archiving from them in a chat session, and an `insert` into `senders`
   has been performed with `list = 'blacklist'`. No separate diff step
   for data entries — the chat approval is the approval.

## Workflow

### Phase 0 — Open a session

Insert a row into `sessions` at the start:

```sql
insert into sessions (source, skill) values ('desktop', 'gmail-triage') returning id;
```

Hold the returned `session_id` for the rest of the session. Update
`ended_at` and `summary` when the triage wraps up.

Also load current blacklist/whitelist from the DB:

```sql
select email, list, reason from senders;
```

### Phase 1 — Retrieve & inventory (FAST)

When Tyler says "triage my inbox" / "scan my emails" / "show me
emails from X" / any scan trigger, retrieve immediately — no
confirmation prompt, no preamble. But DO NOT classify yet.

1. **Retrieve threads.** `search_threads` with the appropriate
   Gmail query and `pageSize: 50`. Translate Tyler's phrasing into
   operators ("last 24 hours" → `newer_than:1d`, "from Qantas" →
   `from:qantas`, "unread" → `is:unread`). Default scope if none
   specified: `in:inbox`.

2. **Enrich with existing labels in ONE query:**

   ```sql
   select thread_id, label
   from email_labels
   where thread_id = any($thread_ids);
   ```

3. **Do NOT `get_thread` yet. Do NOT run recipes yet.** Phase 1 is
   retrieval + labels join only. Per-thread fetches and recipes run
   in Phase 2 on confirmation.

4. **Surface overdue/imminent tasks at the top** (cheap — single
   DB query, no Gmail calls):

   ```sql
   select title, due_at, source_ref from tasks
   where source_skill = 'gmail-triage'
     and status = 'active'
     and due_at < now() + interval '48 hours';
   ```

   Any hits get a "🚨 overdue" / "🚨 due tomorrow" callout.

5. **Output a compact inventory:**

   ```
   ## Inbox scan — YYYY-MM-DD
   Retrieved N threads (query: `<query>`).

   🚨 <overdue/imminent callouts if any>

   ### Already labelled (M)
   - Action Required: 1 — Sephora parcel (due tomorrow)
   - Tickets: 2 — Puffing Billy (31 May), AYYBO (8 May)
   - Flat Bill: 2 — Origin, SEW
   - Requires Review: 4
   - Receipt: 12

   ### New / unlabelled (K)
   1. [sender] — "subject" (date)
   ...

   Want me to triage the K new ones?
   ```

6. **Log the retrieval:**

   ```sql
   insert into decisions (session_id, source, skill, action, metadata)
   values ($session_id, <source>, 'gmail-triage', 'scan',
     jsonb_build_object('scanned', N, 'query', $query,
       'labelled', M, 'unlabelled', K));
   ```

7. **Wait for confirmation.** Tyler may say "yes / go / triage them",
   narrow it ("just the first 5", "skip Sephora"), ask to re-triage
   existing labels ("also re-check Tickets"), or decline ("nah just
   checking"). On decline, skip to Phase 5 close. On keyword-driven
   scans where he was just looking, the inventory is often the whole
   answer — don't push him into triage he didn't ask for.

### Phase 2 — Classify (on confirmation)

Runs only after Tyler confirms in Phase 1 that he wants triage.
Operates on the unlabelled set by default, or the subset Tyler
specifies. Re-classification of already-labelled threads runs only
on explicit ask.

For each thread, run it through the **recipes** in `recipes/` in `priority`
order (lower runs first). First match wins. Each recipe returns either a
proposed action (archive, create task, draft forward, keep) or "not me"
with a bail reason — e.g. a utility domain sending marketing hands off to
the `marketing` recipe.

**Before running recipes**, query `classifications` for prior resolutions on
the same sender / domain / subject pattern. If a stable prior resolution
exists, bias toward that category.

**Senders in `senders` with `list='whitelist'`** are never proposed for
archive regardless of recipe match.

**❓ Needs your call.** If the top recipe returns low confidence, or two
recipes score close to each other, the thread goes to a "Needs your call"
section in the proposal — candidates listed with short reasoning, Tyler
picks. His pick inserts a row into `classifications` so the same pattern
is resolved confidently next time.

Design detail in [`../../../architecture/email-triage.md`](../../../architecture/email-triage.md).

### Phase 3 — Propose

Output format:

```
## Inbox triage — YYYY-MM-DD

Scanned N threads.

### Proposed to archive (X items)

1. **[Sender]** — "Subject"
   Reason: privacy policy update
   Recipe: privacy-policy-updates

2. **[Sender]** — "Subject"
   Reason: generic marketing, first time seeing this sender
   Recipe: marketing (first-time sender approval)

…

### Proposed actions (beyond archive)

- **[Sender]** — "Subject"
  Recipe: flat-bills
  Actions: archive + create task "Ask flatmates for 1/3 of $X, due 2026-04-25" + draft forward to flatmates

### Kept for your attention (Y items)

- **[Sender]** — "Subject" — one-line why it matters

### ❓ Needs your call (Z items)

1. **[Sender]** — "Subject"
   Could be: `flat-bills` (water provider keyword) OR `personal-bills` (addressed to you only)
   Gut: personal-bills. Which?

### Whitelisted — untouched (W items)

- **[Sender]** — count of threads
```

Then ask: "Reply with the item numbers to archive, or 'all obvious' / 'all' / 'none'.
Resolve any ❓ items. Any sender you'd like added to blacklist / whitelist / flat-bill?"

### Phase 4 — Execute

Only after Tyler confirms. For each approved thread, in a single round trip:

1. **POST to `gmail-proxy`** with the action:

   ```json
   {
     "thread_id":     "<thread_id>",
     "add_labels":    ["Slop/Marketing"],   // optional — omit for pure archive
     "remove_labels": ["INBOX"]             // include "INBOX" to archive
   }
   ```

   A single call can both archive and categorise. If only labelling
   (e.g. Whitelist, Action Required), omit `INBOX` from `remove_labels`.
   If only archiving with no category, omit `add_labels`.

2. **Mirror the write into `email_labels`** (idempotent on composite PK):

   ```sql
   insert into email_labels (thread_id, label, applied_via, session_id, event_date)
   values ('<thread_id>', '<label>', 'gmail-proxy', $session_id, <date or null>)
   on conflict (thread_id, label) do nothing;
   ```

   `event_date` only when the recipe supplies one (e.g. tickets with a
   future event date). Null otherwise.

3. **Insert a row into `decisions`:**

   ```sql
   insert into decisions (session_id, source, skill, action, target, reason, metadata)
   values ($session_id, 'desktop', 'gmail-triage', 'archived',
     'Netflix info@account.netflix.com — "Updates to our Terms"',
     'Bucket A, privacy policy update',
     jsonb_build_object('bucket', 'A', 'thread_id', 'abc123',
       'sender', 'info@account.netflix.com', 'gmail_proxy_response', $resp));
   ```

4. If Tyler said "add [sender] to blacklist/whitelist", upsert into
   `senders`:

   ```sql
   insert into senders (email, list, reason, added_via, added_by_session)
   values ('no-reply@spotify.com', 'whitelist', 'concerts/artists I want to see',
     'desktop', $session_id)
   on conflict (email) do update set
     list = excluded.list,
     reason = excluded.reason,
     added_at = now(),
     added_via = excluded.added_via,
     added_by_session = excluded.added_by_session;
   ```

   Also insert a `rule-change` event into `decisions`.

Report what was archived in one concise summary.

### Phase 5 — Close the session

Update the `sessions` row with an `ended_at` and a short `summary`, and
make sure at least one `decisions` row exists (even for a no-archive
scan — the `scan` event from Phase 1 covers this).

```sql
update sessions set
  ended_at = now(),
  summary = 'Scanned 50, archived 9, kept 3 for attention, 2 whitelist untouched.'
where id = $session_id;
```

## Row shapes quick reference

```sql
-- decisions: one row per event
(session_id uuid, source text, skill text, action text, target text, reason text, metadata jsonb)

-- senders: one row per email address (upsert)
(email text PK, list text, reason text, added_via text, added_by_session uuid)

-- sessions: one row per triage run
(id uuid PK, started_at, ended_at, source text, skill text, summary text)

-- email_labels: one row per (thread, label) pair; mirrors Gmail state
(thread_id text, label text, applied_via text, session_id uuid, event_date date, PRIMARY KEY (thread_id, label))
```

See `db/migrations/` in the repo for the full schema including indexes
and check constraints.

## How this skill talks to Gmail

**Reads** go through Anthropic's Gmail connector. Tools relevant to triage:

- `Gmail:search_threads(query, pageSize)` — list threads matching a Gmail query.
- `Gmail:get_thread(threadId, messageFormat)` — fetch full thread details.
- `Gmail:list_labels()` — enumerate labels. Well-known system label IDs:
  INBOX, TRASH, SPAM, STARRED, UNREAD, IMPORTANT, CHAT, DRAFT, SENT.
- `Gmail:create_label(displayName)` — create a user label (name only, no colour —
  connector limitation).
- `Gmail:create_draft(to, subject, body, htmlBody, cc, bcc)` — create a
  standalone draft. Note: no `threadId` parameter, so drafts do NOT thread
  to originals. Use sparingly.

**Writes** go through the `gmail-proxy` Supabase Edge Function. The official
connector is read + drafts only; it does not expose label/archive mutations.
`gmail-proxy` fills that gap by calling the Gmail API directly with an OAuth
refresh token stored in Supabase secrets.

  URL:  https://yjyckwrftrswfhviqdqc.supabase.co/functions/v1/gmail-proxy
  Auth: verify_jwt=true — caller supplies a valid Supabase JWT in Authorization

  POST body:
    {
      "thread_id":     "19d74ac20330d9c0",
      "add_labels":    ["Receipt"],       // optional
      "remove_labels": ["INBOX"]          // optional; "INBOX" = archive
    }

  - At least one of add_labels / remove_labels required.
  - System labels (INBOX, UNREAD, STARRED, IMPORTANT, SPAM, TRASH, SENT, DRAFT,
    CHAT, CATEGORY_*) pass through as-is.
  - add_labels auto-creates missing user labels (no colour).
  - remove_labels NEVER creates — removing a non-existent label surfaces as an
    error.
  - Archive a thread = include "INBOX" in remove_labels. Combine with add_labels
    to archive + categorise in a single round trip.
  - Returns { ok, thread_id, applied_add, applied_remove, thread_labels }.

**Never POST TRASH or SPAM in add_labels.** Destructive mutations are out of
scope for this skill.

**Refresh-token caveat.** The OAuth client is in Google "Testing" publishing
status → the refresh token expires every 7 days. On `invalid_grant` from the
function, Tyler re-runs the ADC flow on his Mac and resets
`GOOGLE_REFRESH_TOKEN` in Supabase secrets.

**Mobile-execution caveat.** `gmail-proxy` requires a Supabase JWT. Mobile
Claude sessions today don't have one and can't invoke the function directly.
Mobile sessions can still: inventory, classify, propose, log `decisions`, and
mirror `email_labels`. The actual Gmail mutation must run from desktop (which
does have the JWT) or via a future flip to custom auth.

## Edge cases

- **Thread with multiple messages, one of which is a reply from Tyler.** Treat
  as "keep" regardless of marketing classification — it's an active
  conversation.
- **Senders impersonating transactional emails.** If a sender looks
  transactional (flight change, bill) but the content is actually marketing
  (upgrade offer from `virginaustralia@plusgrade.com` is marketing, flight
  change from `no-reply@virginaustralia.com` is transactional), classify on
  the content, not the sender domain alone.
- **Confirmation codes (OTPs, 2FA).** Never include the code contents in any
  output, even when summarising. Just note "auth code from [service]" and
  keep in inbox.
- **Ambiguous.** When in doubt, keep in inbox. Better to under-archive than
  lose something.

## Starting state

- `senders` table — seeded via explicit approval during triage.
- `decisions` table — one row per scan/archive/rule-change/reject event.
- `sessions` table — one row per triage run.
- `email_labels` table — mirrors Gmail labels (source of truth for Claude's
  fast-path inventory).

## Self-modification

If Tyler asks to change anything about the INSTRUCTIONS of this skill —
a rule in this SKILL.md, a classification heuristic, the output format,
a new recipe, the shape of a DB query — produce the proposed edit as a
diff in chat first, **plus a plain-language summary of what's changing
and why** (required so mobile and desktop reviews look identical — see
[`architecture/mobile-and-desktop.md`](../../../architecture/mobile-and-desktop.md)).
Wait for "yes, update it" before writing.

**On desktop:** write to the file, commit, and UPSERT the new content
into Supabase `skills`. **On mobile:** UPSERT only (no git); desktop
reconciles to the repo next session.

```sql
insert into skills (name, version, content, updated_via)
values ('gmail-triage', '0.4', $content$...full SKILL.md...$content$, 'desktop')
on conflict (name) do update set
  version = excluded.version,
  content = excluded.content,
  updated_at = now(),
  updated_via = excluded.updated_via;
```

STATE writes are different. Inserts/updates to `senders`, `decisions`,
`sessions`, `tasks`, and `email_labels` don't need a separate diff step —
the chat approval is the approval. Both desktop and mobile sessions write
directly to the same tables; DB constraints and timestamps keep everything
consistent.

## Changelog
- 2026-04-19 (v0.4) — Land the deferred gmail-proxy rewrite (commit 24e9a15c,
  previously pending since Apr 18). "Commands to the Gmail connector" section
  replaced with "How this skill talks to Gmail" — accurately describes the
  read (Anthropic connector) / write (gmail-proxy edge function) split,
  including full POST contract, system-label passthrough, auto-create
  semantics, and the 7-day refresh-token caveat. Phase 4 rewritten to POST
  gmail-proxy + mirror email_labels + log decisions in one flow. Added
  explicit mobile-execution caveat (no JWT today). email_labels added to
  state-layer list in rule 3 and to row-shapes quick reference.
- 2026-04-19 (v0.3) — Split Phase 1 into fast retrieve+inventory; Phase 2
  classification gated on confirmation. Keyword scans share the same flow.
  Overdue/imminent tasks surface in the inventory so deadlines stay
  visible even on quick scans.
