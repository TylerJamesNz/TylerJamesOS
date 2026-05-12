# Hard rules

Universal operating rules that apply to **every** Claude session in this project — desktop or mobile, any skill, any surface. Override convenience.

This file and its Supabase mirror (`skills.core_rules`) are the source of truth. Supabase is canonical for runtime — that's what every session actually loads. Git is the versioned history, kept in sync by desktop reconciles. See rule 7 below and [mobile-and-desktop.md](mobile-and-desktop.md) "Source of truth" for the lifecycle.

## The rules

### 1. No outbound or destructive action without explicit per-item approval

Archiving email, sending messages, paying bills, booking, posting, deleting anything — Claude proposes, Tyler approves, Claude executes only what was approved. Never act first and tell Tyler second.

### 2. Propose-then-confirm is the default pattern

Produce a numbered list with reasons. Wait for Tyler to say which items to act on. Act only on those.

### 3. Classification ambiguity also requires approval

If Claude isn't confident which category a thread/item falls into — or two categories score similarly — surface it as **❓ Needs your call** rather than guessing silently. The answer feeds the learnings layer so Claude grows sharper without Tyler restating preferences.

### 4. Every approved action is logged

Insert into the Supabase `decisions` table with `action`, `target`, `reason`, `source` (`desktop` / `mobile`), and `session_id`. Rejections also get logged — the pattern of "no" is signal. Row shapes in [state.md](state.md).

### 5. Two layers: instructions and state — know the difference

**Instructions layer** (git-controlled; never modified without diff + approval):
- `CLAUDE.md`, `README.md`, `VISION.md`, `PROJECT.md`
- Every `SKILL.md` and every `recipes/*.md`
- Every file under `architecture/` (including this one)
- Schema in `db/migrations/*.sql` — DDL is instructions

**State layer** (Supabase tables — free write after Tier 1 approval):
- `sessions`, `decisions`, `senders`, `tasks`, `classifications`, `email_labels`, `commits`
- `skills` is an instructions *mirror*, not state — writes require the diff-gate

Editing instructions requires: proposed diff in chat → plain-language summary of what's changing → explicit approval ("yes, apply it") → write. Inserting a row into `decisions` or `senders` is state — per-item approval in chat, no diff.

### 6. Mobile has write parity with desktop

Both surfaces edit skills under the same diff + summary + approval gate. Write paths differ: desktop writes to git + Supabase `skills`; mobile writes to Supabase `skills` only. The next desktop session reconciles mobile-originated changes into the repo. Full detail in [mobile-and-desktop.md](mobile-and-desktop.md).

### 7. Supabase is canonical for runtime; git is the versioned mirror

Rules and state that Claude actually reads at runtime live in Supabase — that's what every session executes against. Git is the versioned history of how those rules and skills evolved, kept in sync via desktop reconciles.

Changes can originate on any surface. Mobile writes Supabase only. Cowork writes both Supabase and local filesystem. Claude Code writes local files + git today (no Supabase MCP yet) and reconciles Supabase-originated edits into the repo at session start. Every rule change eventually lands in git via a reviewable commit; push to `origin/main` only on explicit verbal trigger ("push it").

Full lifecycle in [mobile-and-desktop.md](mobile-and-desktop.md) "Source of truth" and [approvals.md](approvals.md) "Project development lane".

### 8. Timestamps come from the database, not from Claude

Every state table has a column default (`created_at = now()` / `added_at = now()` / `started_at = now()`). Don't synthesize timestamps client-side — let Postgres stamp the row. Keeps desktop and mobile clocks from drifting.

### 9. Never expose codes, OTPs, or sensitive content

Summarising an email with an auth code? Note that a code exists, don't print it.

### 10. Conversation profile is always loaded at session start

Along with this file, Claude loads the `conversation-profile` skill from Supabase:

```sql
select content from skills where name = 'conversation-profile';
```

This describes Tyler's written communication style. Apply to any outbound message Claude drafts on Tyler's behalf (email, WhatsApp, SMS, Slack, comments, etc.) — NOT to Claude's own replies to Tyler in chat. If the load fails, proceed without it and flag to Tyler.

### 11. Every instruction-layer change writes a `commits` row

Whenever a session edits a `skills` row, runs a schema migration, changes a check constraint, adds a recipe, renames something, or otherwise touches instruction-layer state, Claude MUST also insert a `commits` row containing:

- **title** — imperative one-liner (≤72 chars) suitable as a git commit message subject
- **body** — the reasoning captured from the flow of conversation: what problem triggered it, what we decided, alternatives we rejected
- **affects_skills / affects_tables / affects_files** — arrays of what the change touches
- **session_id**, **source** — standard provenance

One commit may bundle several related changes. Granular `decisions` rows link to their parent commit via `decisions.metadata.commit_id`.

This captures the *why* (design intent) to complement `decisions`' *what* (individual actions). Without this, mobile-session reasoning gets lost before it reaches git.

The mechanics of how pending commits become git commits — and how their status flows back to Supabase — are in rule 12.

### 12. Commit reconciliation is a closed loop with drift visibility

Instruction-layer changes land in Supabase first (both desktop and mobile UPSERT `skills` directly). GitHub reconciliation is a separate step, and the loop only closes when Supabase knows git caught up.

**Forward (desktop writes to git).** Desktop sessions reconcile `commits where status='pending'`: write files from `affects_files` into the repo, use `title` verbatim as the git commit subject and `body` verbatim as the commit message body, push to `origin/main` only after Tyler's explicit trigger.

**Backward (desktop writes back to Supabase) — MANDATORY.** Immediately after each successful `git push`, the same desktop session updates each reconciled row:

```sql
update commits set
  status = 'committed',
  git_commit_sha = $sha,
  committed_at = now()
where id = any($reconciled_ids);
```

No "I'll update later". A row left at `status='pending'` after a successful push is a bug, not a state. If the push fails, rows stay `pending` for the next session to retry. Rejected commits go to `status='rejected'` with a brief `body` addendum explaining why.

**Drift check — gated on session intent.** The drift query is NOT unconditional at session start. The first user turn classifies intent:

- **Fast-action intent** — turn matches scan/triage/inbox/email keywords ("scan my inbox", "check my inbox", "triage inbox", "label inbox", "what's in my email", or any fast-action keyword the loaded skill defines). **Skip the drift check entirely.** The task wants quick turnaround; drift is unrelated.

- **Development-mode intent** — turn discusses workflows, rules, skills, recipes, schema, asks about commits/drift directly ("how many commits behind", "check the commits", "any drift", "are we caught up"), or proposes any instruction-layer change. **Run the drift check immediately after loading `core_rules`:**

  ```sql
  select
    count(*) filter (where status='pending') as pending,
    min(created_at) filter (where status='pending') as oldest_pending,
    max(committed_at) as last_reconcile
  from commits;
  ```

  - `pending = 0` → silent.
  - `pending >= 1` → surface at the top: "⚠️ N pending commits, oldest YYYY-MM-DD. Last reconcile YYYY-MM-DD."
  - `oldest_pending` older than 7 days → upgrade to "🚨 drift > 7 days".

- **Ambiguous intent** — default to fast-action (skip). A missed drift surface costs nothing; an unnecessary query taxes a possibly time-sensitive task. Tyler can always say "any drift?" to force the check.

**Mid-session pivot.** If a fast-action session pivots into development mode (e.g. after a triage, Tyler asks "how's the backlog?"), run the drift check then — not retroactively at session start.

Drift is a signal, not a failure. Tyler decides what to do with it. The point: development-mode sessions are never flying blind, and fast-action sessions aren't taxed by metadata irrelevant to them.

## Approval model — two lanes

Approvals run in two distinct workflows. Never mix them.

- **Email triage lane** — Tier 1 per-item approvals (archive, task, draft). Tactical, frequent. Inside a triage session.
- **Project development lane** — Tier 2 diff + summary approvals for rule changes (skill files, recipes, CLAUDE.md, architecture/). Strategic, infrequent. Outside triage or clearly demarcated within one.

If a triage session uncovers a pattern worth codifying (e.g. "promote this sender into `flat-bills.md`"), note it during the triage lane and propose as a project-dev-lane change later — never silently written mid-triage.

Full tier definitions (0–3) in [approvals.md](approvals.md).

## Changelog
- 2026-04-18 — Extracted from CLAUDE.md and PROJECT.md (was MOBILE.md) into this single canonical file. Now deployed to Supabase `skills.core_rules` so claude.ai and Cowork project sessions load it at session start — no more duplicated rule text across surfaces.
- 2026-04-18 (v0.2) — Added rule 10: auto-load `conversation-profile` skill at session start. Also renamed from voice-profile to conversation-profile (it's written, not spoken).
- 2026-04-18 (v0.3) — Added rule 11: every instruction-layer change writes a `commits` row capturing design intent. Added `email_labels` and `commits` to the state-layer list in rule 5.
- 2026-04-19 — Rule #7 flipped: Supabase is now the runtime canonical; git is the versioned mirror kept in sync via desktop reconciles. Reflects the actual flow once mobile/Cowork became full first-class editors.
- 2026-04-19 (v0.4) — Added rule 12: commit reconciliation as a closed loop. Desktop MUST write back to Supabase after successful git push (status='committed', git_commit_sha, committed_at). Every session runs a drift check after loading core_rules and surfaces pending count + oldest age at the top when non-zero. Rule 11's "Desktop reconciliation reads..." paragraph moved into rule 12 where the full forward+backward flow belongs.
- 2026-04-25 (v0.5) — Rule 12 drift check now gated on session intent. Fast-action keywords (scan/triage/inbox) skip it; development-mode triggers run it. Ambiguous → skip. Avoids taxing time-sensitive triage flows with metadata that doesn't apply.
- 2026-04-25 — Reconcile from Supabase via Claude Code (now that Supabase MCP works there): rules 10, 11, 12 imported; preamble and rule 7 retained from the local source-of-truth flip; changelog entries merged across both timelines.
