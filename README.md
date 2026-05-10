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

1. Install the prerequisites (all via Homebrew):

   ```bash
   brew install --cask docker
   brew install supabase/tap/supabase
   brew install caddy
   ```

   Open Docker Desktop once so the daemon is running.

2. From the repo root, start everything via the bootstrap script:

   ```bash
   ./bin/start-local.sh
   ```

   First run is interactive: it prompts for sudo to add `127.0.0.1 tylerbatchelor.local` to `/etc/hosts`, prompts for sudo again to trust Caddy's local CA in the System keychain, then pulls ~10 Docker images for Supabase. Subsequent runs are fast and silent on those steps.

3. After Supabase prints its status, copy `app/.env.example` to `app/.env.local` and replace `<publishable key from `supabase status`>` with the publishable key from that output. The LOCAL block at the top is active by default; the CLOUD block stays commented out.

**Daily loop:**

```bash
./bin/start-local.sh    # brings up Supabase + Caddy + Vite, foreground
```

| Service | URL |
|---|---|
| App + API (Caddy fronts both) | `https://tylerbatchelor.local:4443` (API at `/api/*`) |
| Supabase Studio (DB browser) | `http://127.0.0.1:54323` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit (catches outbound mail) | `http://127.0.0.1:54324` |

Stop everything with `./bin/stop-local.sh` (Vite is already gone after Ctrl+C in its own terminal).

### Google sign-in locally (optional)

Local Supabase Auth needs the Google OAuth client to know about its callback:

1. In the existing `Tyler James OS` OAuth client in Google Cloud Console, add `http://localhost:54321/auth/v1/callback` to **Authorised Redirect URIs**. (The `.local` hostname can't go here, Google rejects non-public TLDs, but local Supabase advertises `localhost` as its callback host regardless of the URL the app is served on, so the localhost entry covers every dev machine.)
2. Copy `supabase/.env.example` to `supabase/.env` and fill in the Client ID and Client Secret from that same OAuth client.
3. Restart so GoTrue picks up the new env vars:

   ```bash
   supabase stop && supabase start
   ```

### Toggling between local and cloud Supabase

`app/.env.local` carries two blocks (LOCAL active by default, CLOUD commented out). Comment one, uncomment the other, restart `npm run dev`. CI and Vercel deploys are unaffected because they read GitHub Actions secrets, not this file.

### Deploy pipeline

Push to `main` triggers `.github/workflows/deploy.yml`, which runs in this order:

1. **Apply DB migrations** to the cloud Supabase project (`supabase db push`).
2. **Deploy edge functions** (skipped while `supabase/functions/` is empty).
3. **Build the Vite app** with the cloud `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from GitHub secrets.
4. **Deploy to Vercel** via the official CLI (`vercel build` + `vercel deploy --prebuilt`).

If a backend step fails, the frontend never ships against a stale schema.

## Branch strategy

Day-to-day work lives on `dev`. `main` is the deploy line and only moves when something is shipped.

- Commit and push freely on `dev`. `git push` does not trigger a deploy.
- To ship, open a draft PR from `dev` to `main` (Claude opens one autonomously the first time `dev` is ahead). The PR body is the deployment runbook. When ready, `gh pr ready <pr> && gh pr merge --squash <pr>` and the deploy fires.
- Force-push to `main` is never allowed. Force-with-lease on `dev` is fine if you've rebased.

Full rules live in [`CLAUDE.md`](CLAUDE.md) (project-level) and `~/.claude/CLAUDE.md` (global, applies to all projects).
