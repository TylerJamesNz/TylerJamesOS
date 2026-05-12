# Architecture principles

Cross-cutting infra principles inherited from life-admin-agent's absorb (issue #39). These are the precedent-setters that all of TJOS inherits, distinct from the project-specific layout in `../architecture.md`.

- [`hard-rules.md`](./hard-rules.md), non-negotiables (auth, schemas, secrets boundaries).
- [`mobile-and-desktop.md`](./mobile-and-desktop.md), the mobile-via-claude.ai parity model and what the Supabase connector exposes.
- [`security-rls-posture.md`](./security-rls-posture.md), RLS posture for `assistant.*` and service-role boundary rules.

The rest of LAA's `architecture/` (approvals, email-triage, roadmap, state, tasks, README) was design history for that repo and is intentionally not carried over.
