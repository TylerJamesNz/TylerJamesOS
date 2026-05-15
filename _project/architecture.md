# Architecture

## Status: V1

Canonical glossary: `/CONTEXT.md`. Decisions captured as ADRs in `docs/adr/`.

---

## Domain & subdomain

Tyler James OS runs on an existing subdomain. Placeholder: `os.tylerjames.nz` (update with actual subdomain).

All routes require authentication except:
- `/signin`, Google SSO entry point (Supabase Auth)
- `/brand-kit`, optional, may be public for reference

---

## URL structure

```
os.tylerjames.nz/
├── /                    → Home / Hub (app tiles)
├── /signin              → Google SSO (redirects to / on success)
├── /finance             → Single-page dashboard (Net Worth, Liquid, Investments, monthly snapshot, category pie)
│   ├── /finance/transactions   → All transactions, search + filter, Net Cost default
│   └── /finance/accounts       → Per-account detail and statement upload
├── /todos               → Task list
│   ├── /todos/inbox     → Uncategorised tasks
│   └── /todos/[project] → Project view
├── /brand-kit           → Brand kit reference page (live)
└── /settings            → App settings, integrations, account
```

`/finance/insights` does not exist, its content is on the `/finance` home dashboard.

---

## Application layers

```
┌──────────────────────────────────────────────┐
│             Browser (Vite + React 19 SPA)    │
│   CSS variable theme, ECharts, pdfjs-dist,   │
│   tesseract.js (lazy-loaded)                 │
└──────────────────┬───────────────────────────┘
                   │ HTTPS (Supabase JS client)
┌──────────────────▼───────────────────────────┐
│              Supabase                        │
│   ├── Auth (Google OAuth)                    │
│   ├── Postgres (RLS on auth.uid())           │
│   ├── Storage (bank-statements bucket)       │
│   └── Edge Functions (voice-parse, fx-daily) │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│   External (called only by Edge Functions)   │
│   ├── OpenAI (todos voice transcript)        │
│   └── frankfurter.app (free FX, no key)      │
└──────────────────────────────────────────────┘
```

Bank API integrations (Akahu, Plaid, Basiq) are explicitly **not** part of the architecture. Finance imports are file-only (PDF), parsed client-side. See `docs/adr/0002-free-only-import-pipeline.md`.

---

## Auth flow

Supabase Auth with the Google provider.

1. User visits any protected route.
2. `RequireAuth` (`app/src/components/RequireAuth.tsx`) checks the Supabase session.
3. If no session → redirect to `/signin`.
4. `/signin` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
5. On success, Supabase persists session in browser storage; `SessionContext` exposes it via `useSession()`.
6. Session cookie persists across all app sections (single sign-on within the origin).

---

## Project structure (`app/`)

```
app/
├── public/
│   ├── finance/
│   │   ├── manifest.webmanifest    ← Finance PWA manifest
│   │   └── icons/
│   └── todos/
│       ├── manifest.webmanifest    ← Todos PWA manifest
│       └── icons/
├── src/
│   ├── App.tsx                     ← Routes, RequireAuth wrapper
│   ├── main.tsx                    ← Entry, providers
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── SignInPage.tsx
│   │   ├── BrandKitPage.tsx
│   │   ├── finance/                ← Finance pages
│   │   └── todos/                  ← Todos pages
│   ├── components/
│   │   ├── Drawer.tsx, Chart.tsx, …
│   │   └── finance/                ← Finance-specific
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── applyPalette.ts, echartsTheme.ts
│   │   └── finance/                ← Import, FX, categorisation
│   ├── store/                      ← Zustand stores
│   ├── themes/palettes.ts          ← All palette presets + chart slot ramp
│   ├── content/brand-kit-body.html ← Live brand kit HTML
│   └── types/db.ts                 ← Generated Supabase types
├── vite.config.ts
└── package.json

supabase/
├── config.toml
├── migrations/                     ← SQL migrations
└── functions/
    ├── voice-parse/                ← OpenAI proxy for /todos
    └── fx-daily/                   ← Daily FX seed
```

---

## Deployment

Vercel (static build of the Vite SPA), Supabase for data/auth/storage/functions, GitHub Actions in `.github/workflows/deploy.yml` triggers on push to `main`. See project `CLAUDE.md` for the dev/main branch model.

---

## Progressive Web App (PWA)

Tyler James OS uses **per-app PWA manifests** (`docs/adr/0001-per-app-pwa-manifests.md`). Each top-level app installs as its own iOS home-screen icon with a distinct name, theme colour, and start URL. The TJOS hub at `/` is not installable on its own.

### How it works

- `app/public/finance/manifest.webmanifest` declares `scope: "/finance/"`, `start_url: "/finance/"`, `name: "Finance"`.
- `app/public/todos/manifest.webmanifest` declares `scope: "/todos/"`, `start_url: "/todos/"`, `name: "Todos"`.
- The HTML head's `<link rel="manifest">` href is swapped on route change so iOS reads the manifest matching the user's current scope when they tap "Add to Home Screen".
- A single service worker (`vite-plugin-pwa`, configured with `manifest: false`) handles caching for both scopes. It sits at the origin root.
- Both installed PWAs share the same Supabase session because they share the origin, but iOS standalone mode does not share cookies with mobile Safari, so the first launch of each installed PWA prompts a one-off sign-in inside that scope.

### iPhone notes

- Install prompt is not automatic on iOS. UI nudges hint at Share → Add to Home Screen on first visit from mobile Safari.
- Push notifications require iOS 16.4+ and the app being added to the home screen. Not used in V1.
- Web Speech API works in Safari standalone mode (used by `/todos`).

### Offline strategy by section

| Section | Offline | Strategy |
|---|---|---|
| Todos | ✅ Yes | Cache task list locally, queue mutations, sync on reconnect |
| Finance | ⚠️ Read-only | Cache last-fetched transactions for viewing; no import offline |
| Brand kit | ❌ No | Not useful offline |
| Settings | ❌ No | Always requires connection |

Service worker uses `vite-plugin-pwa`'s default Workbox runtime caching. Strategies:
- App shell (HTML, JS, CSS) → Cache First
- API responses → Network First with offline fallback
- Static assets (images, icons, fonts) → Cache First with long TTL

### Offline sync for Todos

When offline, task mutations (create, complete, edit) are queued locally in IndexedDB (Dexie.js) and applied to a local copy of the task list. When connectivity returns, the queue is drained against the Supabase API.

Conflict rule (V1): server wins. Single-user system, acceptable.

```
Offline flow:
User creates task → stored in IndexedDB queue + shown in UI
Connection restored → queue drained → upserted to Supabase
UI refreshes from server response
```

---

## Open questions

- [ ] What is the actual production subdomain?
- [ ] Should `/brand-kit` be publicly accessible?
- [ ] Confirm Web Speech API behaviour in Safari iOS PWA standalone mode (test on /todos install).
- [ ] First-visit nudge for "Add to Home Screen" on mobile Safari, worth the chrome?
