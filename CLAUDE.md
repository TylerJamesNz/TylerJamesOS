# Tyler James OS — project rules

## Project structure

- `_project/` — planning and documentation only (markdown). Never deployed.
- `app/` — all deployable code. GitHub Actions targets this directory. The living brand kit runs as a Vite + React app (`app/package.json`, `npm run dev`); colour presets live in `app/src/themes/palettes.ts`. A static HTML snapshot remains at `app/brand-kit.html` (no theme helper). Production build outputs to `app/dist/`.
- `supabase/` — local Supabase config and migrations. Source of truth for schema and edge functions; deploy.yml applies migrations to the cloud project on push to `main`.
- `bin/` — local dev orchestration scripts (`start-local.sh`, `stop-local.sh`).

## Branch model

This project deploys on push to `main` via `.github/workflows/deploy.yml`. To keep deploys intentional and granular work-in-progress safe on the remote, day-to-day work happens on `dev`. `main` only moves when something is shipped.

## Day-to-day

You'll usually be on `dev`. Commit freely (granular or squashed, your call), push whenever, `git push` of the current branch is safe and does not trigger a deploy.

After a coherent commit lands on `dev` or any working branch off `dev` (`feature/*`, `fix/*`, `wip/*`), Claude pushes it to `origin` autonomously per the global guardrail; the operator does not need to say "push" each time.

Force-with-lease is allowed on `dev` if you've rebased and need to update the remote. Plain force-push is not.

See the global guardrails [`dev-branch.md`](../../claude-guardrails/dev-branch.md) for the full protocol.

## Shipping

A rolling draft PR from `dev` to `main` is kept open per the global [pr-workflow.md](../../claude-guardrails/pr-workflow.md) rule. The PR body is the deployment runbook for this ship: the implementation plan a future operator (or LLM SSH'd into the droplet) follows to recreate the locally-validated deployment on prod. It updates as material commits land on dev (schema migrations, infra changes, behaviour fixes); UI polish flows in implicitly without per-commit sections.

When ready to deploy:

```bash
gh pr ready <pr>                    # flip draft → ready
gh pr merge --squash <pr>           # body becomes the main commit; deploy.yml fires
```

After the merge, run `~/Projects/claude-guardrails/tools/post-ship-rebaseline-dev.sh` to rebase dev onto main. Force-push to `main` remains never-allowed.

## After a push or merge to `main`

Use `gh` to watch the active deploy workflow and report progress. Workflow is `.github/workflows/deploy.yml` (name: `Deploy`). `gh run list --branch main --limit 1` to find the run, then `gh run watch <run-id>` (foreground) so the live output streams inline.

## Code standards

Before writing or updating any code (components, functions, or CSS rules) read the relevant project docs:

- `_project/coding-principles.md` — always. Apply these standards to every code change.
- `_project/brand-kit.md` and `app/brand-kit.html` — for any UI, CSS, or visual work. Use the existing tokens, colour variables, type scale, spacing scale, component patterns. Never hardcode values that have a token.
- `_project/data-model.md` — for any new data structures, schemas, or functions that read/write data. Align with existing entities and relationships.

If a change would require deviating from these docs, flag it to the user before proceeding.

## Docs

When AI instructions change, update both `CLAUDE.md` and the relevant section of `README.md` in the same commit.

## Migration history

Migrated from single-branch (`main` doubled as working + production) to dev/main split on 2026-05-10. Pre-migration unshipped history was preserved on `dev` at first push.
