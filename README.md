# Tyler James OS

A personal operating system — a suite of interconnected apps for managing money, tasks, and daily life. Built for one user, designed like a product.

## What is this?

Tyler James OS is a self-hosted, bespoke personal productivity and finance platform. Rather than stitching together third-party tools, this project builds purpose-made apps that share a single data model, design system, and codebase — all owned and controlled end-to-end.

## Project Structure

```
TylerJamesOS/
├── _project/                  # Planning and documentation
│   ├── README.md              # Project overview (internal)
│   ├── vision.md              # Goals, philosophy, north star
│   ├── architecture.md        # System architecture decisions
│   ├── stack.md               # Tech stack and tooling choices
│   ├── data-model.md          # Core data entities and relationships
│   ├── coding-principles.md   # Engineering standards
│   ├── brand-kit.md           # Design system documentation
│   ├── app-finance.md         # Finance app planning
│   └── app-todos.md           # Todos app planning
│
├── app/                       # Deployable code (Vite + React)
│   ├── package.json           # npm scripts: dev, build, preview
│   ├── index.html             # Brand kit entry
│   ├── src/
│   │   ├── themes/palettes.ts # Canonical colour palettes (import from future apps)
│   │   ├── styles/            # brand-kit.css + theme helper
│   │   └── …                  # Brand kit UI + theme FAB
│   ├── .env.example           # Template for VITE_SUPABASE_URL / ANON_KEY
│   ├── dist/                  # Production build output (gitignored)
│   └── brand-kit.html         # Static snapshot (no React theme switcher)
│
├── supabase/                  # Backend source of truth (local + cloud)
│   ├── config.toml            # Local Supabase CLI config
│   ├── migrations/            # SQL migrations applied on every deploy
│   ├── functions/             # Edge functions (voice-parse lands in phase 4)
│   └── .env.example           # Template for local Google OAuth secrets
│
├── .github/
│   └── workflows/             # CI/CD — deploy targets ./app
│
└── README.md                  # This file
```

## Apps Planned

| App | Description | Status |
|-----|-------------|--------|
| Finance | Budgeting, transactions, net worth tracking | Planning |
| Todos | Task management with priorities and due dates | Planning |

## Design System

The **interactive brand kit** (Vite + React) is the primary reference: colours, typography, spacing, components, and a **theme helper** (floating control, bottom-right) to switch palettes. Canonical colour values live in `app/src/themes/palettes.ts` so future apps can import the same map and call `applyPalette()` (or mirror variables in CSS).

A static export without the theme helper remains at `app/brand-kit.html`.

**Stack:** Inter · Bricolage Grotesque · Geist Mono · Teal/navy palettes (preset-driven) · 4px grid · Light mode first

## Development

All deployable code lives under `./app`. For static hosting, build first and publish `app/dist/`. GitHub Actions workflows should run `npm ci && npm run build` inside `app/` when deploy is wired up.

### Frontend only (no backend)

```bash
cd app
npm install
npm run dev
# http://localhost:5173 — hub home; routes: /brand-kit, /finance, /todos
# Theme helper (FAB) switches palettes (stored in localStorage)

# Static HTML snapshot (no React)
open brand-kit.html
```

The brand kit and homepage render without a backend. Sign-in and `/todos` need Supabase running (see below).

### Full local stack (Vite + local Supabase)

Standard daily-dev setup. Vite hot-reloads on your machine; Supabase runs in Docker on your machine. The cloud Supabase project is untouched.

**One-time setup:**

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started).
2. From the repo root, start the local stack:

   ```bash
   supabase start
   ```

   First run pulls about ten Docker images and applies every file in `supabase/migrations/` automatically.

3. Confirm `app/.env.local` points at the local stack (the LOCAL block uncommented). It is preconfigured this way out of the box.

**Daily loop:**

```bash
supabase start          # if not already running
cd app && npm run dev   # http://localhost:5173
```

| Service | URL |
|---|---|
| API | `http://127.0.0.1:54321` |
| **Studio (DB browser)** | `http://127.0.0.1:54323` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Inbucket (catches outbound mail) | `http://127.0.0.1:54324` |

Stop the local stack with `supabase stop`. Add `--no-backup` to drop local data.

### Google sign-in locally (optional)

Local Supabase Auth needs the Google OAuth client to know about its callback. One-time setup:

1. Add `http://127.0.0.1:54321/auth/v1/callback` to the **Authorised Redirect URIs** of the existing `Tyler James OS` OAuth client in Google Cloud Console.
2. Copy `supabase/.env.example` to `supabase/.env` and fill in the Client ID and Client Secret from that same OAuth client.
3. Restart so GoTrue picks up the new env vars:

   ```bash
   supabase stop && supabase start
   ```

### Toggling between local and cloud Supabase

`app/.env.local` ships with two blocks; comment one, uncomment the other, restart `npm run dev`. CI and Vercel deploys are unaffected because they read GitHub Actions secrets, not this file.

### Deploy pipeline

Push to `main` triggers `.github/workflows/deploy.yml`, which runs in this order:

1. **Apply DB migrations** to the cloud Supabase project (`supabase db push`).
2. **Deploy edge functions** (skipped while `supabase/functions/` is empty).
3. **Build the Vite app** with the cloud `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from GitHub secrets.
4. **Deploy to Vercel** via the official CLI (`vercel build` + `vercel deploy --prebuilt`).

If a backend step fails, the frontend never ships against a stale schema.

## Git Workflow

Rules for working with this repo (enforced via `.cursor/rules/`):

**Commits**
- Commit after each coherent set of changes (feature, fix, or restore) with a clear message.
- Split unrelated changes into separate commits — don't bundle everything into one.

**Pushing**
- Never push unless explicitly asked to push, publish, or deploy.
- Local commits are enough until a push is requested.
- No force-pushing unless explicitly asked.

**Branching**
- Work on the branch specified. Don't open PRs or push new branches unless asked.

**After pushing to `main`**
- Use `gh` (GitHub CLI) to watch the deploy workflow and report progress.
- Report success or failure with a summary and next steps.

Full rules live in [`CLAUDE.md`](CLAUDE.md) (project-level) and `~/.claude/CLAUDE.md` (global — applies to all projects).
