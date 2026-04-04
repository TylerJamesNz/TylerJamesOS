# Tech Stack

## Status: To be decided

This file captures options, trade-offs, and the final decisions once made. Nothing here is locked until marked **[DECIDED]**.

---

## Frontend

### Options under consideration

**Next.js (React)**
- Industry standard, great ecosystem, SSR/SSG built in
- Easy Google Auth integration via NextAuth.js
- Deploys easily to Vercel (generous free tier) or self-hosted
- TypeScript support first-class
- ✅ Recommended starting point

**SvelteKit**
- Leaner, faster, less boilerplate than React
- Smaller ecosystem but growing
- Good if Tyler prefers writing less framework ceremony

**Decision criteria:** Familiarity, long-term maintainability, ecosystem for auth/data fetching/UI components.

### UI Component library

- **shadcn/ui** — unstyled components, fully customisable, pairs perfectly with a custom brand kit. Not a dependency, copied into the codebase. ✅ Recommended
- **Tailwind CSS** — utility-first, pairs well with shadcn, keeps styling co-located with components

---

## Backend

### Options under consideration

**Next.js API Routes / Server Actions**
- Keep everything in one repo, reduce complexity
- Fine for personal-scale workloads
- ✅ Recommended for V1

**Separate Node.js / Express API**
- More flexible if the backend grows complex
- Useful if you want a standalone API for future mobile clients
- Adds operational complexity

**Python (FastAPI)**
- Strong if ML/data processing features grow (expense categorisation, insights)
- Could be a separate microservice for the AI/finance pipeline specifically

### Decision note
Start with Next.js full-stack for speed. Break out a Python service later if the finance/AI processing warrants it.

---

## Database

**PostgreSQL**
- Relational, battle-tested, perfect for financial data and structured entities
- ✅ Recommended

**Hosted options:**
- **Supabase** — managed Postgres, includes auth, storage, real-time. Generous free tier. ✅ Strong recommendation for V1
- **Neon** — serverless Postgres, very cheap, great DX
- Self-hosted on a VPS — lowest cost long-term, more ops work

**ORM:** Prisma (type-safe, great with Next.js + TypeScript)

---

## Auth

**NextAuth.js / Auth.js**
- Google SSO out of the box
- Sessions stored in the database (Postgres adapter)
- ✅ Decided direction

Single sign-on across the entire system. No separate logins per app section.

---

## Infrastructure & Hosting

### Philosophy: Start cheap, scale only if needed

| Service | Option | Cost |
|---|---|---|
| Frontend + API | Vercel (hobby) | Free |
| Database | Supabase free tier | Free |
| Domain/subdomain | Existing (owned) | $0 extra |
| File storage | Supabase Storage or Cloudflare R2 | Free / ~$0.015/GB |
| AI (Claude) | Anthropic API | Pay per use |

**Estimated monthly cost at V1: ~$0–5/month**

### When to move off free tiers
- Supabase free tier pauses after 1 week of inactivity — upgrade to Pro ($25/mo) once actively using
- Vercel Pro needed only if bandwidth/build minutes become a concern

### Alternative: Single VPS
- A $6/month Hetzner or DigitalOcean VPS running Docker containers
- Full control, lower long-term cost, more ops responsibility
- Worth revisiting once the project stabilises

---

## PWA & Offline

### Service worker
**next-pwa** — a Next.js plugin that wraps Workbox. Minimal config, handles cache strategies, works with the App Router with some setup. ✅ Recommended.

Alternative: configure Workbox directly for more control. More work, more flexibility. Probably not needed for V1.

### Offline storage
**Dexie.js** — clean wrapper around IndexedDB. Used for:
- Local task cache (for offline reads)
- Offline mutation queue (create/complete/edit tasks while offline)

Dexie is well-maintained, has TypeScript support, and makes IndexedDB actually pleasant to work with. ✅ Recommended.

### Implications for Next.js + Vercel
- Service workers work fine with Vercel — static assets are served from CDN
- `next-pwa` outputs the service worker to `/public/sw.js` automatically
- The web app manifest (`/public/manifest.json`) must be referenced in the root `<head>`

### Updated dependency list (additions)
| Package | Purpose |
|---|---|
| `next-pwa` | Service worker + Workbox config for Next.js |
| `dexie` | IndexedDB wrapper for offline storage |

---

## Open questions

- [ ] What subdomain is this running on?
- [ ] Vercel or VPS for hosting?
- [ ] Supabase vs Neon vs self-hosted Postgres?
- [ ] Separate Python service for finance pipeline, or keep it in Next.js?
- [ ] Confirm `next-pwa` compatibility with Next.js App Router (check latest version — there were historical issues)
