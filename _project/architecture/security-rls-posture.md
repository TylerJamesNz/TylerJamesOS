# Security: RLS posture

Single-user project. All writes today come from Claude Code sessions via the Supabase MCP using the service-role key. There is no anon-key caller, no authenticated-user caller, and no Edge Function caller that touches Supabase tables (the live `gmail-proxy` EF talks directly to Gmail, never to the DB).

Posture: **RLS on, zero policies, service-role only.** Service-role bypasses RLS, so the MCP path is structurally unaffected. Anon and authenticated have no path in. This was the architecturally-correct state from day one; today's tightening just made the implementation match.

## Where each table sits

| Schema | Tables | RLS | Policies | Access |
| --- | --- | --- | --- | --- |
| `public` (Email Skill journal) | `gmail_credentials`, `skills`, `sessions`, `decisions`, `commits`, `pending_actions`, `senders`, `email_labels` | on | none | service-role only |
| `assistant` (Task / Plan tracker) | `projects`, `tasks`, `plans`, `plan_bookings`, `decisions`, `task_archive` | on | none | service-role only |

The `assistant.*` schema previously had 6 `authenticated_full_access` policies (`USING (true) WITH CHECK (true)`) added with the schema for a future UI. They protected nothing today (no authenticated caller) and were the wrong shape for tomorrow (any signed-in user would have full access). Dropped 2026-05-11; auth-scoped policies get designed when a UI is actually built.

## Hardening also applied

- `set_updated_at()` and `claim_pending_actions(integer, text)` have `search_path = 'pg_catalog, public'` pinned. Closes schema-shadowing attacks (attacker schema can't shadow built-ins) without rewriting function bodies. Supabase-recommended hardening path.
- `gmail_modify_thread_submit(text, text[], text[])` and `gmail_proxy_await(bigint, integer)` had EXECUTE revoked from PUBLIC. Both are legacy SECURITY DEFINER RPCs from 4 evolved-away April migrations; the live `gmail-proxy` EF replaced them. Service-role retains EXECUTE via its explicit grant.

## Deferred

- **`pg_net` extension in `public` schema.** Linter flags as warning. Moving requires updating call sites that don't fully-qualify (`net.http_post` keeps working, bare `http_post` breaks). Low priority for a single-user internal project.
- **Auth-scoped policies on `assistant.*`.** Designed when the admin UI is being built. Operator preference noted: login OK on phone, prefer silent auto-auth on desktop, Google OAuth piggyback for the TJOS surface. UI design choice decides the policy shape (binding to `auth.uid()`, signups disabled, etc.).

## When this changes

Adding an authenticated caller (UI on phone or desktop hitting Supabase directly via supabase-js with a user JWT) means designing policies before the UI ships. The cost of "RLS on no policies + authenticated client" is that the client sees zero rows; the cost of "no policies + signups enabled" is that any new sign-up sees everything. Either way the door has to be deliberately opened.

## Changelog

- 2026-05-11 — Tightened. RLS enabled on 7 unprotected public tables; 6 `authenticated_full_access` placeholders dropped on `assistant.*`; `search_path` pinned on 2 audit functions; EXECUTE revoked from PUBLIC on 2 legacy Gmail RPCs. Three migrations in `db/migrations/`: 0003, 0004, 0005. Advisor went from 24 findings (10 critical) to 1 deferred (`pg_net` in public) plus 15 INFO-level `rls_enabled_no_policy` notices confirming the posture.
