# Supabase consolidation — working understanding

Output of `/grill-with-docs` on 2026-05-13. Input to `/to-prd`. Supersedes the federation framing in GH issue #37 and tracers #38, #46, #47, #48, #50.

## Problem

Two Supabase projects exist. The original plan was to leave the legacy project ("life-admin-agent", id `yjyckwrftrswfhviqdqc`) as a federation target that TJOS (`ktxouxcqhccadpitheig`) reads/writes via service-role bearer until a later tracer migrates data across. The operator surfaced that "life-admin-agent" was a working repo name, not a domain concept, and that the federation existed only to defer migration. Collapse the two projects into TJOS and strike the term.

## Decisions

1. **Cutover shape: one-shot.** No staged dual-write. If something breaks mid-cutover, re-run the cutover; do not live in a partial state.
2. **Schema approach: single squashed migration.** `pg_dump --schema-only --schema=assistant` of the legacy project, hand-edited into `supabase/migrations/20260513120000_assistant_schema.sql`. Fix schema drift in the same SQL: `task_name` → `title`, add `folder_context` column to `assistant.projects`, reconcile status vocabulary. Eliminates the EF adapter shim permanently.
3. **Data copy: MCP-driven `INSERT ... SELECT`.** Per-table, FK-dependency order (`projects` → `plans` → `tasks` → `task_archive` → `decisions` → `plan_bookings`). Checked in as `_project/migrations/laa-to-tjos-data-copy.sql`. ~143 rows total; the operator watches row counts inline.
4. **gmail-proxy: reuse existing Google OAuth client.** Lift the refresh token from legacy storage to TJOS. Storage shape (Supabase secret vs `assistant.*` row) audited during execution. No re-consent.
5. **Skill switchover: one-commit audit-then-switch.** Single commit on `claude-guardrails` rewrites `skills/task-queue/SKILL.md` (lines 3, 8, 18, 29, 646) and `CLAUDE.md:92` to drop legacy refs. Paired commit on TJOS rewrites `supabase/functions/task-service/src/config.{ts,test.ts}` and `index.ts` to read `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (auto-injected for the EF's own project) and removes the adapter shim. `_project/architecture/README.md:3` reframed.
6. **Legacy repo: tag, move, archive.** `git tag pre-archive-2026-05-13`, `mv ~/Projects/life-admin-agent ~/Projects/_archive/`, `gh repo archive`. No scheduled jobs in the repo; safe to retire as-is.
7. **ADR: yes.** `docs/adr/0006-single-supabase-no-federation.md`. Hard-to-reverse, surprising-without-context, real trade-off; all three criteria hit.
8. **Cutover sequence:**

| # | Step | Reversible? |
|---|------|-------------|
| 1 | Generate and hand-edit `20260513120000_assistant_schema.sql`. | Yes |
| 2 | Apply migration to TJOS. | Yes |
| 3 | Run `laa-to-tjos-data-copy.sql` via MCP, verify row counts. | Yes |
| 4 | Lift gmail-proxy Google refresh token to TJOS secret. | Yes |
| 5 | Redeploy `task-service` EF (no adapter shim, native `assistant.*` reads). | Yes |
| 6 | Redeploy `gmail-proxy` EF to TJOS. | Yes |
| 7 | UPSERT `public.skills` row `name='task-queue'` into TJOS with TJOS project ref. | Yes |
| 8 | **🔻 Point of no return: commit + push claude-guardrails skill rewrite.** | **No** |
| 9 | Operator repoints mobile claude.ai Supabase connector URL (immediate succession with step 8, idle window). | Yes |
| 10 | Smoke test: desktop adds task → mobile sees it; mobile adds task → desktop sees it. | n/a |
| 11 | Tag legacy repo, move to `~/Projects/_archive/`, `gh repo archive`. | Mostly yes |
| 12 | Commit ADR `0006-single-supabase-no-federation.md`. | Yes |
| 13 | **🔻 Two-gate destructive op: decommission legacy Supabase project.** Authorise only after 24h clean operation post-step 10. | **No** |

## Out of scope

- Splitting domain schemas (finance vs assistant) into separate Supabase projects — explicitly rejected; this ADR records the rejection.
- Any task-service feature work; the EF code stays; only env wiring and the adapter shim change.

## Open during execution

- Storage shape of the gmail-proxy refresh token (audited at step 4).
- ADR numbering (`0006` assumes `0005` is the latest; confirmed via `docs/adr/` listing).
