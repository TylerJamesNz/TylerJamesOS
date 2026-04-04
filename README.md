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
│   ├── dist/                  # Production build output (gitignored)
│   └── brand-kit.html         # Static snapshot (no React theme switcher)
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

```bash
cd app
npm install
npm run dev
# http://localhost:5173 — hub home; routes: /brand-kit, /finance, /todos (placeholders)
# Theme helper (FAB) switches palettes (stored in localStorage)

# Static HTML snapshot (no React)
open brand-kit.html
```

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
