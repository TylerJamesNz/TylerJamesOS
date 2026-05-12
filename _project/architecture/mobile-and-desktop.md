# Mobile and desktop

All surfaces can edit skills under the same propose-diff-then-approve gate. Different surfaces have different write paths, and they converge in Supabase.

## Source of truth

**Supabase is canonical** for runtime rules and state — that's what every session reads when it starts. Git is the **versioned mirror**: it captures history via reviewable commits whenever Claude Code reconciles Supabase changes into the repo.

Mobile can only write Supabase. Cowork writes both Supabase and the local filesystem. Claude Code (VSCode extension) writes local files + git today (Supabase MCP not yet wired up there — see [roadmap.md](roadmap.md)) and reconciles Supabase-originated edits down to disk at session start.

## Parity rule

Any change to a skill file (`SKILL.md`, `recipes/*.md`) or an instruction file in the [hard-rules.md](hard-rules.md) sense requires:

1. A proposed edit shown as a diff in chat.
2. A plain-language summary of what's changing and why.
3. Explicit approval ("yes, apply it").

Identical on every surface. Only the write target differs.

## Write paths

| Surface | Skill / rule edits land in | Local files | Git | Notes |
| --- | --- | --- | --- | --- |
| Mobile (claude.ai web / iOS) | Supabase `skills` UPSERT | — | — | Reconciled at next Claude Code session |
| Cowork (Claude Desktop app) | Supabase `skills` UPSERT + local filesystem | Yes | Via next Claude Code commit | Cowork has filesystem access but no git; commit lags |
| Claude Code (VSCode extension) | Local filesystem + git; Supabase UPSERT pending MCP | Yes | Commits locally; pushes on trigger | Today the *only* surface that can commit |

State writes (`senders`, `decisions`, `sessions`, `tasks`, `classifications`, `email_labels`) go to Supabase from any surface. No diff gate — per [approvals.md](approvals.md) they're Tier 1 or Tier 0.

## Read path

- **Mobile** reads from Supabase `skills` in this order at session start:
  1. `skills.core_rules` — mirror of [hard-rules.md](hard-rules.md). Universal rules.
  2. `skills.<skill_name>` — the relevant skill (e.g. `gmail-triage`).
  3. `senders`, `classifications`, `sessions` as needed during the session.

  Everything mobile needs to run lives in Supabase. The Claude Project's custom instructions are a thin bootstrap — they tell Claude *how to load* the rules, not what the rules are. Cowork desktop uses the same bootstrap (one placeholder swap). See [PROJECT.md](../PROJECT.md) for the paste-ready instructions covering both surfaces.

- **Desktop** reads local git files directly — [hard-rules.md](hard-rules.md), each `SKILL.md`, and `recipes/*.md` are authoritative on disk. [CLAUDE.md](../CLAUDE.md) is auto-loaded by Claude Code at session start and points at hard-rules.md.

Same rules, two delivery paths. One source of truth.

## Reconcile

The reconcile step is what keeps git honest. Run it at the start of every Claude Code session that touches rules:

1. **Diff** local `.claude/skills/**/*.md` (and `architecture/hard-rules.md`) against the corresponding Supabase `skills` rows.
2. **Surface** any Supabase-ahead-of-git changes as a diff + summary to Tyler — even though those changes already landed through the project development lane on mobile / Cowork, they still need a reviewable git commit per the parity rule.
3. **Apply** on "yes, apply it": write the Supabase content to the local files, commit with a message that captures origin (mobile / Cowork) and a one-line summary of what changed.
4. **Log** a `rule-change` row in `decisions` pointing at the new git commit hash.

Today this is manual because Claude Code can't query Supabase directly (no MCP). Cowork can produce the diff for me; I then commit. A scheduled job (see [roadmap.md](roadmap.md) Medium) will eventually do it automatically.

Until that ships, the practical pattern is: after any mobile / Cowork session that edits skill content, Tyler opens a Claude Code session and says "reconcile from Supabase" or similar — Cowork hands over the diffs, Claude Code commits.

## Changelog
- 2026-04-18 — Mobile was read-only; now has write parity under the same approval gate. Drive mirror dropped.
- 2026-04-18 — Hard rules extracted to [hard-rules.md](hard-rules.md), mirrored to `skills.core_rules` for mobile. Mobile custom instructions thinned to a bootstrap that loads core_rules + the active skill. No more duplicated rule text across surfaces.
- 2026-04-19 — Source of truth flipped: Supabase is canonical for runtime, git is the versioned mirror. Added Cowork as a first-class edit surface (writes both Supabase + filesystem). Reconcile section expanded with the actual manual flow.
