# Task Service v1

## Status: PRD, ready for /to-issues

PRD lives in this file rather than as a GitHub issue per the single-user override in `~/Projects/claude-guardrails/pocock-flow.md`. Decision lineage: `~/.claude/plans/buzzing-hugging-orbit.md` holds the full 9-question grill (Q1 to Q9) and the 4-phase plan; this PRD condenses both into the shape `pocock-flow.md` expects before `/to-issues`.

---

## Problem Statement

Task management is split across two surfaces. life-admin-agent's `public.tasks` (4 rows, written by email triage) and life-admin-agent's `assistant.tasks` (96 rows, written by the v5 task-queue skill) live in the same Supabase project but have drifted schemas and no shared surface. Tyler James OS plans to ship its own `public.tasks` (talktask-derived) as the substrate for `/todos`, which would make three parallel task tables.

Every Claude interaction renders the current chart by composing raw SQL via the Supabase MCP connector. A typical "add task then show chart" flow is five MCP round-trips, two to four seconds perceived. Mobile claude.ai uses the same MCP path and feels worse. When Tyler had local markdown files for tasks, the same flow was instant. The speed gap is the round-trip count, not the data layer.

The killer feature in `app-todos.md` (voice transcript to structured task) and the chart-management features already in `assistant.tasks` (`day`, `parent_task_id`, `time_prefix`, `sort_order`, 5-state status) live in separate worlds with no shared API. Email-triage tasks cannot land in the same chart as voice-created tasks. Mobile and desktop hit different code paths.

## Solution

A single Edge Function (`task-service`) inside the TJOS Supabase project owns every task read and write. Claude on desktop and mobile sends one HTTPS request per action and receives the rendered chart, active plans, and counts in the same response. The fat-response-on-mutate shape collapses today's five MCP round-trips into one HTTP call plus three collocated Postgres queries, target latency 300 to 600 ms.

Schema unifies on `assistant.tasks`-extended. The chart-management columns stay canonical. Additive migration adds `user_id` (FK to `auth.users`), `source_skill`, and `source_ref` so email-triage outputs co-exist with voice-created tasks under one discriminator. TJOS's planned `public.tasks` (talktask-shape, currently a local-only migration not yet applied) is dropped before it lands.

life-admin-agent's repo absorbs into TJOS (`db/migrations/`, `supabase/functions/gmail-proxy/`, the `gmail-triage` and `conversation-profile` skills, plus doc merges). life-admin-agent's Supabase project gets migrated row-by-row into TJOS Supabase, then deleted. One repo, one Supabase project, one task service, one chart shape.

Claude authenticates to the service via a service-role bearer token (`CLAUDE_API_KEY`). The service authenticates to Supabase via the project service-role key, RLS bypassed inside the function. user_id is passed explicitly in every request body so the row-level discriminator stays correct.

## User Stories

1. As Tyler on Claude Code desktop, I want a single round-trip per task action, so that "add task X" returns the updated chart in well under a second.
2. As Tyler on mobile claude.ai, I want the same one-call latency as desktop, so that cross-device task management feels identical regardless of surface.
3. As Tyler triaging email, I want gmail-triage's outputs to land in the same task store as my voice-created todos, so that one chart shows everything.
4. As Tyler in the browser at `/todos`, I want the SPA and Claude to read/write the same rows with the same chart shape, so that the two surfaces never diverge.
5. As Tyler, I want one Supabase project to administer, so that billing, migrations, RLS, and OAuth all live in one place.
6. As Tyler, I want one GitHub repo for the whole OS, so that planning docs, code, skills, and migrations are co-located.
7. As Tyler dogfooding the new path, I want life-admin-agent to stay hot until the new service proves itself, so that a regression in the service does not block daily work.
8. As Tyler, I want every mutation response to include the rendered chart, active plans, and counts, so that "what changed and what's still going on" is one network call.
9. As Tyler, I want the read endpoint (`GET /chart`) to return the exact same response shape with `mutation_result: null`, so that the client never branches by call type.
10. As Tyler, I want the service to authenticate Claude with a service-role bearer token, so that secret rotation happens in one place (Vercel env + Edge Function secrets).
11. As Tyler, I want the chart-management columns (`day`, `parent_task_id`, `time_prefix`, `sort_order`, 5-state status) preserved through the schema migration, so that the QLD trip plan and other in-flight work keeps rendering correctly.
12. As Tyler, I want `gmail-proxy` redeployed in TJOS Supabase with the same Google OAuth env vars, so that email triage continues uninterrupted post-merge.
13. As Tyler, I want a row-count audit and repo-wide grep for the old project UUID before life-admin-agent Supabase is deleted, so that decommission cannot silently lose data or break a forgotten reference.
14. As a future Claude session resuming this work, I want the service contract to be obvious from a single guardrails skill file, so that the resume cost after compact is minutes, not hours.
15. As Tyler, I want the new task-queue skill to be re-UPSERTed into `public.skills` immediately, so that mobile claude.ai picks up the updated skill at next session start.
16. As Tyler, I want zero new AI/LLM costs, so that this work fits inside the existing Claude Desktop and Claude Code plans.

## Implementation Decisions

### Major modules

**Chart Renderer.** Pure function `renderChart(rows) → { markdown, active_plans, counts }`. No I/O. Shared by every endpoint. Deep module: encapsulates day-grouping, status-icon mapping, sort_order respect, prefix rendering, and active-plan filtering behind a one-argument signature.

**Project Resolver.** `resolveProject(ctx, projects) → project_id | null`. Pure function. Folder-context lookup (the working directory of the Claude session, passed in the request body), with a fallback to the `is_default_personal = true` row in `assistant.projects` when no folder_context is supplied. Returns null when a folder_context is supplied but no row matches (sentinel; caller decides whether to create). On ambiguous match (multiple rows share the same folder_context), the most recently created project wins.

**Task Service Edge Function.** Single Deno-runtime Edge Function deployed at `task-service`, dispatching internally by path:
- `POST /tasks/add` — single-task create
- `POST /tasks/batch` — multi-task create
- `POST /tasks/:id/done` — complete a task
- `POST /tasks/:id/start` — set status active/in-progress
- `POST /tasks/:id/cancel` — set status cancelled
- `GET /chart` — pure read

Every endpoint returns the fat-response shape. Mutations include `mutation_result`; reads return `mutation_result: null`.

**Auth middleware.** Bearer-token check against the `CLAUDE_API_KEY` Edge Function secret. Returns 401 on missing or wrong; passes through on valid.

### Schema changes

Canonical target is `assistant.tasks`-extended. Additive migration in TJOS Supabase:

- Add `user_id UUID NOT NULL REFERENCES auth.users(id)` (backfilled to the single existing user during the data copy).
- Add `source_skill TEXT` (e.g. `'task-queue'`, `'gmail-triage'`).
- Add `source_ref TEXT` (e.g. Gmail `thread_id` for triage rows; null for voice/manual).
- Build `tags` and `task_tags` adjacent to `assistant.tasks`, scoped to `user_id`.

TJOS's locally-staged `20260425000000_initial_schema.sql` creates a talktask-shape `public.tasks` that conflicts with the canonical shape. Per Q4, this migration is rewritten to drop the `public.tasks` / `public.tags` / `public.task_tags` tables before they land, leaving only the `users` table from that file. The 5-state assistant.tasks status (`pending`, `active`, `done`, `cancelled`, `blocked`) wins over the 3-state talktask status (`active`, `completed`, `archived`).

`_project/data-model.md` defines a `Task` entity (TODO/IN_PROGRESS/DONE/CANCELLED + `priority` + `project_id`) that diverges from both live schemas. This PRD lands with a same-PR update to `data-model.md` flagging the live shape as canonical, mirroring the existing migration-todos.md note style.

### Migration sequence

**Phase 0: repo absorb.** Move life-admin-agent contents into TJOS in one PR: `db/migrations/0001-0010`, `supabase/functions/gmail-proxy/`, `architecture/security-rls-posture.md`, `.claude/skills/{gmail-triage,conversation-profile}/`. Merge top-level docs (`CLAUDE.md`, `PROJECT.md`, `VISION.md`, `README.md`) into TJOS's existing equivalents. Archive `TylerJamesNz/life-admin-agent` on GitHub after the PR merges.

**Phase 1: service v1 against life-admin-agent Supabase.** Unpause TJOS Supabase. Build `task-service` Edge Function (six routes, fat-response shape, bearer auth). Service initially talks to life-admin-agent Supabase via service-role bearer (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env in TJOS Vercel point at life-admin-agent). Cross-project federation as a deliberate transient state. Speed win lands here.

**Phase 2: skill switchover.** Update `~/Projects/claude-guardrails/skills/task-queue/SKILL.md` to call the new Edge Function via `fetch` instead of issuing raw SQL via MCP. Commit + push guardrails (autonomous per guardrails rule). Re-UPSERT into `public.skills.task-queue` so mobile claude.ai picks up the new skill at next session start. Dogfood on desktop and mobile.

**Phase 3: schema reconciliation + data copy.** Apply life-admin-agent's migrations 0001-0010 in TJOS Supabase (after TJOS's own remaining migrations land). Apply the new additive migration adding `user_id`, `source_skill`, `source_ref`, and the tags pivot. Drop the talktask-shape `public.tasks` migration. Copy rows from life-admin-agent Supabase to TJOS via `pg_dump`/`pg_restore` or per-table `execute_sql`. Redeploy `gmail-proxy` Edge Function in TJOS with the existing Google OAuth secrets. Repoint TJOS service env vars from life-admin-agent Supabase to TJOS Supabase.

**Phase 4: decommission.** Grep the TJOS repo for `yjyckwrftrswfhviqdqc` (life-admin-agent project UUID). Confirm zero references. Verify row-count match across every migrated table. Delete the life-admin-agent Supabase project via two-gate `AskUserQuestion`.

### API contract

Request shape (every endpoint):

```ts
{
  user_id: string;         // explicit, since RLS is bypassed in EF
  folder_context?: string; // for Project Resolver
  // route-specific payload follows
}
```

Response shape (every endpoint):

```ts
{
  mutation_result: { /* per-route */ } | null;
  rendered: {
    chart_markdown: string;
    active_plans: Plan[];
    counts: { pending: number; active: number; done: number; cancelled: number; blocked: number };
  };
}
```

### Auth

Claude to service: `Authorization: Bearer ${CLAUDE_API_KEY}` header. Single secret in TJOS Vercel env, rotated in one place.

Service to Supabase: service-role key via `SUPABASE_SERVICE_ROLE_KEY` env. RLS bypassed inside the EF. user_id passed explicitly in every request body so the discriminator stays correct.

Multi-user OAuth deferred until a second user exists.

## Testing Decisions

### Test philosophy

Test external behaviour, not implementation details. Renderer tests assert markdown output, not internal data structures. Resolver tests assert returned `project_id`, not which Supabase queries fired. No mocking of internal helpers.

### Scope (V1)

**Chart Renderer (vitest unit).** Cases: empty state; single-task day; multi-day chart; mixed status; `sort_order` respected; `time_prefix` rendered correctly; active-plans filter pulls only `status = 'active'` plans.

**Project Resolver (vitest unit).** Cases: folder match found; no folder_context falls back to default-personal; ambiguous match resolves to last-created; unknown folder returns null sentinel (no insert).

**Auth middleware (vitest unit).** Cases: missing `Authorization` header returns 401; wrong token returns 401; valid token passes through.

### Skipped for V1

Integration tests against a local Supabase instance. Cost to set up is high; dogfooding on a real device against the real Supabase for a few days catches the same regressions cheaper for a single-user system. Revisit if dogfooding misses a real bug.

### Prior art

TJOS's `app/` runs vitest already (`npm test` + `npm run test:watch` in `app/package.json`). New tests live next to the EF code in `supabase/functions/task-service/` for Deno-runtime modules; pure modules (Chart Renderer, Project Resolver) export from a location that vitest in `app/` can also import for unit tests.

## Out of Scope

- Multi-user OAuth on the task service. Service-role bearer is sufficient until a second user exists.
- Server-side LLM calls. The service is pure TypeScript and SQL. Claude does NL parsing client-side under its existing plan. No new AI cost surface.
- TJOS SPA integration with the task service. The `/todos` UI continues using direct Supabase JS for now; the service is for Claude. SPA migration is a future PRD.
- Akahu, Plaid, or any banking API integration.
- Recurring tasks, subtasks in the human-todos sense, comments, attachments. Those belong in `app-todos.md` if they ship at all.
- Markdown-cache layer on desktop. Deferred; the EF + collocation speed gain is expected to be sufficient.
- TalkTask `public.tasks` continued existence. Dropped before it lands in TJOS Supabase.

## Further Notes

- Next Pocock step: `/to-issues` breaks Phases 0 to 4 into PR-sized issues with `Blocked by #N` references. Phase 0 (repo absorb) and Phase 1 (service v1) should be sequenced first; Phase 2 (skill switchover) is gated on Phase 1; Phases 3 and 4 are gated on Phase 2 dogfooding.
- The smallest open thread that should ship before Phase 2 is the re-UPSERT of `public.skills.task-queue` so mobile picks up the broader trigger set added in guardrails commit `0d26691`. Two minutes, one destructive-ops gate.
- Decision-log lineage: `~/.claude/plans/buzzing-hugging-orbit.md` (Q1 to Q9 plus Phase 0 to 4 plan), `~/Projects/life-admin-agent/architecture/security-rls-posture.md` (RLS posture this service inherits), `_project/architecture.md` (TJOS app shape this service slots into), `_project/migration-todos.md` (the prior TalkTask migration sets the precedent for the schema-drift-from-data-model.md note pattern).
- `gmail-proxy` Edge Function relocates without behaviour change. Existing env-var contract (Google OAuth client ID and secret) carries over to TJOS Supabase secrets.
- Speed math: today's chart render is approximately 5 MCP SQL round-trips, 2 to 4 seconds perceived. Post-Phase-1 is 1 HTTPS call to Vercel plus 3 collocated Supabase queries, target 300 to 600 ms. Roughly 5 to 10 times faster.
