# Architecture

## Status: Draft

---

## Domain & subdomain

Tyler James OS runs on an existing subdomain. Placeholder: `os.tylerjames.nz` (update with actual subdomain).

All routes require authentication except:
- `/login` — Google SSO entry point
- `/brand` — optional, may be public for reference

---

## URL structure

```
os.tylerjames.nz/
├── /                    → Home / Dashboard
├── /login               → Google SSO (redirects to / on success)
├── /finance             → Financial overview
│   ├── /finance/transactions   → All transactions, search + filter
│   ├── /finance/accounts       → Connected accounts
│   └── /finance/insights       → Charts, summaries, trends
├── /todos               → Task list
│   ├── /todos/inbox     → Uncategorised tasks
│   └── /todos/[project] → Project view
├── /brand               → Brand kit reference page
└── /settings            → App settings, integrations, account
```

---

## Application layers

```
┌─────────────────────────────────────────────┐
│             Browser (Next.js)               │
│   React components + Tailwind + shadcn/ui   │
└──────────────────┬──────────────────────────┘
                   │ HTTP / Server Actions
┌──────────────────▼──────────────────────────┐
│          Next.js API Layer                  │
│   Route handlers + server actions + auth    │
└──────────┬───────────────────┬──────────────┘
           │                   │
┌──────────▼──────┐   ┌────────▼──────────────┐
│   PostgreSQL    │   │   External Services    │
│   (Supabase /   │   │   - ANZ / bank API     │
│    Neon / VPS)  │   │   - Anthropic API      │
│                 │   │   - Google Auth        │
└─────────────────┘   └────────────────────────┘
```

---

## Auth flow

1. User visits any protected route
2. Middleware checks for valid session cookie
3. If no session → redirect to `/login`
4. `/login` initiates Google OAuth via NextAuth.js
5. On success, session created in database, user redirected to original destination
6. Session cookie persists across all app sections (single sign-on)

---

## Next.js project structure (planned)

```
/
├── app/                        ← Next.js App Router
│   ├── layout.tsx              ← Root layout (auth check, nav shell)
│   ├── page.tsx                ← Home / Dashboard
│   ├── login/page.tsx
│   ├── finance/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── transactions/page.tsx
│   │   └── insights/page.tsx
│   ├── todos/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── brand/page.tsx
│   └── api/                    ← API route handlers
│       ├── auth/[...nextauth]/
│       ├── finance/
│       └── todos/
├── components/                 ← Shared UI components
│   ├── ui/                     ← shadcn/ui components (copied in)
│   └── [feature]/              ← Feature-specific components
├── lib/                        ← Shared logic
│   ├── db.ts                   ← Prisma client instance
│   ├── auth.ts                 ← NextAuth config
│   └── utils.ts
├── prisma/
│   └── schema.prisma           ← Database schema
└── _project/                   ← This documentation folder
```

---

## Deployment

**V1 (simple):** Deploy to Vercel. Connect Supabase for database. Point subdomain DNS to Vercel.

**Steps:**
1. Create Next.js project, push to GitHub
2. Connect repo to Vercel
3. Set environment variables (DB connection, Google OAuth credentials, Anthropic API key)
4. Add subdomain CNAME in DNS pointing to `cname.vercel-dns.com`
5. Done

---

## Progressive Web App (PWA)

Tyler James OS is a PWA — installable to the iPhone home screen and capable of working offline for supported sections.

### What PWA gives us
- **Add to Home Screen** on iPhone (Safari) and Android
- Launches in standalone mode (no browser chrome — feels like a native app)
- App icon, splash screen, theme colour — all configured via the web manifest
- Offline support for designated sections via a Service Worker

### iPhone-specific notes
iOS Safari has its own PWA quirks to design around:
- Install prompt is not automatic on iOS — users must use Share → "Add to Home Screen". Consider showing a first-time nudge with instructions.
- Push notifications on iOS PWA require iOS 16.4+ and the app must be added to the home screen first. Don't rely on push for V1.
- Web Speech API works in Safari on iOS — voice capture for todos should function correctly.
- Standalone mode on iOS does not share cookies/session with Safari. The user will need to log in once inside the installed PWA.

### Required files
```
/public/
├── manifest.json           ← App name, icons, display mode, theme colour
├── sw.js                   ← Service worker (handles caching + offline)
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── apple-touch-icon.png  ← Required for iOS home screen icon
```

**manifest.json (skeleton):**
```json
{
  "name": "Tyler James OS",
  "short_name": "TJOS",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#TBD",
  "theme_color": "#TBD",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Offline strategy by section

Not everything needs to work offline. Be deliberate:

| Section | Offline support | Strategy |
|---|---|---|
| Todos | ✅ Yes | Cache task list locally, queue mutations, sync on reconnect |
| Finance | ⚠️ Read-only | Cache last-fetched transactions for viewing; no import offline |
| Dashboard | ⚠️ Stale data | Show cached data with "last synced" indicator |
| Brand kit | ❌ No | Not useful offline |
| Settings | ❌ No | Always requires connection |

### Service worker approach

**Use Workbox** (Google's SW library — built into Next.js via `next-pwa` plugin). It handles cache strategy configuration without writing raw service worker code.

Recommended cache strategies:
- **App shell** (HTML, JS, CSS) → Cache First — load instantly, update in background
- **API responses** (tasks, transactions) → Network First with offline fallback
- **Static assets** (images, icons, fonts) → Cache First with long TTL

### Offline sync for Todos

When offline, task mutations (create, complete, edit) are queued locally in **IndexedDB** and applied to a local copy of the task list. When the connection returns, the queue is replayed against the server API.

Conflict resolution rule (simple for V1): server wins. If a task was modified on the server while offline, the server version overwrites the local version on sync. More nuanced conflict handling can be added later if needed.

```
Offline flow:
User creates task → stored in IndexedDB queue + shown in UI
Connection restored → queue drained → POST /api/todos for each queued item
UI refreshes from server response
```

**Library to handle this:** Consider `idb` (tiny IndexedDB wrapper) or Dexie.js for the offline queue.

### Updated application layers (with PWA)

```
┌──────────────────────────────────────────────────────┐
│              iPhone / Browser (PWA)                  │
│   React + Tailwind + shadcn/ui                       │
│   ┌──────────────────────────────────────────────┐   │
│   │  Service Worker (Workbox)                    │   │
│   │  - App shell cache                           │   │
│   │  - Offline API fallback                      │   │
│   └──────────────────────────────────────────────┘   │
│   ┌──────────────────────────────────────────────┐   │
│   │  IndexedDB (Dexie.js)                        │   │
│   │  - Offline task queue                        │   │
│   │  - Cached task/transaction data              │   │
│   └──────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP (when online)
┌──────────────────────▼───────────────────────────────┐
│              Next.js API Layer                       │
└──────────┬────────────────────────┬──────────────────┘
           │                        │
┌──────────▼──────┐      ┌──────────▼────────────────┐
│   PostgreSQL    │      │   External Services        │
│   (Supabase)    │      │   - ANZ/Akahu, Claude,     │
│                 │      │     Google Auth             │
└─────────────────┘      └───────────────────────────┘
```

---

## Open questions

- [ ] What is the actual subdomain?
- [ ] Vercel or self-hosted?
- [ ] Should `/brand` be publicly accessible?
- [ ] Confirm Web Speech API behaviour in Safari iOS PWA standalone mode (test early)
- [ ] Dexie.js vs raw `idb` for offline queue — decide during todos implementation
- [ ] Show "Install to home screen" nudge on first visit from Safari mobile?
