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
│   └── apps/                  # Per-app planning docs
│       ├── finance.md
│       └── todos.md
│
├── app/                       # Deployable code
│   └── brand-kit.html         # Living brand kit and design system
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

The brand kit (`app/brand-kit.html`) is the single source of truth for all visual decisions — colours, typography, spacing, and components. Open it in a browser to see the full system.

**Stack:** Poppins · Teal/Navy palette · 4px grid · Light mode first

## Development

All deployable code lives under `./app`. GitHub Actions workflows target this directory for CI/CD.

```bash
# View the brand kit
open app/brand-kit.html
```
