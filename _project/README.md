# Tyler James OS — Project Documentation

This folder contains all living documentation for the Tyler James OS project. It is not a wiki that gets written once — it should be updated as decisions are made, ideas evolve, and features get built.

## What is Tyler James OS?

A personal operating system — a private, self-hosted web platform running on an existing subdomain, built to replace the patchwork of third-party apps with a single, cohesive, well-designed system built entirely to Tyler's preferences.

## How to navigate this folder

| File | What it covers |
|---|---|
| [vision.md](./vision.md) | Goals, philosophy, and the "why" behind the project |
| [stack.md](./stack.md) | Tech decisions: frontend, backend, infra, hosting, cost |
| [brand-kit.md](./brand-kit.md) | Design system: colours, fonts, spacing, component style |
| [data-model.md](./data-model.md) | Core data entities, relationships, auth |
| [architecture.md](./architecture.md) | Subdomain layout, app routing, deployment structure |
| [coding-principles.md](./coding-principles.md) | Engineering rules — SOLID, reuse, anti-vibe-code guidelines |
| [apps/finance.md](./apps/finance.md) | ANZ integration, expense triage, financial insights |
| [apps/todos.md](./apps/todos.md) | Voice-to-task, Todoist replacement spec |

## Build order (suggested)

1. Settle brand kit and design system
2. Finalise stack and infrastructure
3. Build auth shell (Google SSO, home screen)
4. Build data model and API layer
5. Finance app (ANZ import + triage)
6. Todos app (voice input + task management)
7. Iterate and expand

## Status

> 🟡 **Planning phase** — No code written yet. All files in this folder are working documents.
