# Migration: TalkTask → Tyler James OS `/todos`

## Status

Strategy approved 2026-04-25. Phase 1 ready to begin.

## Decisions

1. **TJO stays on Vite + React 19.** No Next.js migration. Pure SPA, deployed to Vercel as static files. Keeps the snappy interactive feel (drag/drop, instant theme switching) and removes any serverless cost surface.
2. **One Vercel deployment.** TalkTask becomes the `/todos` route inside TJO, not a separate app. Theme system, fonts, layout shell, and auth shared by construction.
3. **Auth:** Supabase Auth with Google provider. Drop NextAuth (it required a Next.js server). RLS already keys off `auth.uid()`, so Supabase JWTs are a one-source-of-truth simplification.
4. **Schema:** keep talktask's live Supabase schema (`tasks`, `tags`, `task_tags` with RLS on `auth.uid()`). `_project/data-model.md` is aspirational — live shape diverges (no `priority`, no `project_id`; status is `active|completed|archived`).
5. **Styling:** strip Tailwind from talktask components. Rewrite using TJO's CSS-variable system (CSS Modules + tokens like `var(--color-surface)`, `var(--color-accent)`). The theme helper FAB then recolours the Todos UI by construction.
6. **AI / voice:** OpenAI lives in a **Supabase Edge Function** (`voice-parse`). Browser never sees the key. No Vercel serverless functions needed.
7. **Banking (future):** file import only — no Plaid/Akahu, no server endpoints. Pure client-side parsing.

## Why not Next.js

The case for migrating TJO to Next.js was server endpoints (bank APIs, OpenAI proxy, SSR). Once banking is file-import and OpenAI runs on a Supabase Edge Function, none of those triggers apply. The migration would be pure churn — routing rewrite, `'use client'` audit everywhere, theme-flicker workarounds — for no functional gain. Vite stays.

## Phases

### Phase 1 — Foundations (Vite + Supabase + Auth)

- Add deps to `app/`: `@supabase/supabase-js`, `zustand`, `react-speech-recognition` (+ types), `framer-motion`, `react-day-picker`, `date-fns`, `emoji-picker-react`, `chroma-js` (+ types).
- Add `@/*` path alias to `vite.config.ts` and `tsconfig.json`.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env.local` and `.env.example`. Reuse the existing talktask Supabase project's keys.
- New: `app/src/lib/supabase.ts` — anon client.
- New: `app/src/context/SessionContext.tsx` — wraps `supabase.auth.onAuthStateChange`, exposes `useSession()`.
- New: `/signin` route — minimal "Continue with Google" via `supabase.auth.signInWithOAuth`.
- Route guard: protect `/todos`; on `SIGNED_IN`, ensure a `public.users` row exists.
- **Manual step:** enable Google provider in the Supabase dashboard (exact callback URL provided when we get here).
- Commit: `feat: supabase auth foundation`.

### Phase 2 — Domain layer port

- Copy `talktask/src/types/index.ts` → `app/src/types/index.ts`. Strip NextAuth types.
- Copy `talktask/src/store/useTaskStore.ts` → `app/src/store/`. Zustand + persist works in Vite identically.
- Copy `talktask/src/lib/supabase-sync.ts`. Replace any `useSession` import with `supabase.auth.getUser()`.
- Copy `talktask/src/components/SupabaseSync.tsx`.
- Commit: `feat: port talktask domain layer`.

### Phase 3 — UI port to TJO tokens (the big one)

Discipline: one component at a time, one commit per component, visual compare against the talktask original.

For each: strip Tailwind, build `Component.module.css` using TJO tokens (`var(--color-surface)`, `var(--color-accent)`, `var(--color-text)`, `var(--color-border)`, …), replace `@heroicons/react` with `lucide-react`.

Order (least → most complex):

- `TaskItem`, `TaskList`, `Sidebar`, `MobileNavigation`, `FloatingMicButton`, `FloatingActionButtons`
- Build a shared `Drawer` primitive once (replaces Headless UI `Dialog`) using TJO tokens + Framer Motion. Reuse for every drawer below.
- `VoiceDrawer`, `TaskDrawer`, `ManualTaskDrawer`, `EmojiPickerDrawer`, `DatePickerDrawer`, `TagSelectionDrawer`, `TagManagementDrawer`
- `CalendarView`, `DatePicker`, `TagsView`, `ArchiveView`
- Drop the indigo→purple mic gradient — replace with `var(--color-accent)` so the theme helper paints it.

### Phase 4 — Voice + AI via Supabase Edge Function

- New Supabase Edge Function: `voice-parse`. Takes a transcript, calls OpenAI, returns parsed task fields. System prompt lifted from talktask's existing `VoiceDrawer` logic.
- Front-end `VoiceDrawer` calls the function via `supabase.functions.invoke('voice-parse', …)`.
- **Manual step:** add `OPENAI_API_KEY` to the Supabase project's edge function secrets.
- Commit: `feat: voice parsing via supabase edge function`.

### Phase 5 — Mount Todos + update home

- Replace TJO's `/todos` placeholder with `<TodosApp />` mounted inside TJO's existing `BrowserRouter` + `PaletteProvider` so theme tokens cascade in.
- Update HomePage's Todos card copy from placeholder to live description.
- Verify `ThemeHelperFab` recolours the Todos UI when palette switches.
- Commit: `feat: mount todos at /todos`.

### Phase 6 — PWA + cleanup

- Add `vite-plugin-pwa`. Manifest, icons, `theme-color` from current palette.
- Scope PWA install to `/todos` (brand kit doesn't need to be installable).
- Update `app/README.md`, `_project/app-todos.md`, project `CLAUDE.md`. Add a note in `_project/data-model.md`: "live schema diverges — see migration-todos.md".
- Archive `~/Projects/talktask/` locally (keep the GitHub repo for history).
- Commit: `chore: pwa + sunset standalone talktask`.

## Manual steps you'll do (flagged in advance)

1. **Phase 1:** enable Google OAuth in Supabase dashboard.
2. **Phase 4:** add `OPENAI_API_KEY` to Supabase Edge Function secrets.
3. **Pushes:** none until you explicitly ask. Local commits at every phase boundary.

## What we're explicitly not doing

- **Not migrating TJO to Next.js.** Vite stays.
- **Not adopting Tailwind in TJO.** Theme coherence requires components to read TJO tokens directly.
- **Not preserving NextAuth.** Supabase Auth replaces it.
- **Not building bank API integrations.** File import only.
