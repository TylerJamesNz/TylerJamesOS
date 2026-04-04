# Brand Kit

## Status: To be defined

This file will evolve into the single source of truth for all visual decisions. The brand kit also exists as a **live web page** within the app itself — a rendered reference that shows colours, typography, spacing, and components in context.

---

## Theme palettes (colour source of truth)

- **File:** `app/src/themes/palettes.ts` — named presets: **Custom**, `origin_teal`, `hue_shift_30`, four `wildcard_*` themes, then eight `product_*` vibe ramps (unofficial, not affiliated with named products). Each preset is a flat map of CSS custom property names → values (including `--accent-rgb`, shadows, and demo tag accent).
- **Runtime:** `applyPalette()` in `app/src/lib/applyPalette.ts` writes those keys to `document.documentElement`. New apps should import the same module (or a shared package later) so styling stays aligned.
- **UI:** The React brand kit includes a floating **theme helper** to switch presets without a backend; the choice is cached in `localStorage` under `tjos-theme-palette-id`.
- **Custom:** The **Custom** row opens a slide-out from that panel. Two seeds (primary + secondary) are stored in `localStorage` under `tjos-custom-palette-seeds`; `deriveCustomPalette()` in `app/src/lib/deriveCustomPalette.ts` builds the rest of the token map and **nudges colours for contrast** (body text on page bg, sidebar labels on sidebar bg, white on accent buttons) so loud primaries stay legible without changing the fixed presets. Re-saving overwrites the same slot (no duplicate presets). At runtime, `mergeSidebarPresentation()` in `applyPalette.ts` adds `--color-sidebar-bg-gradient` by ramping the solid sidebar base (primary family) toward slate — not the accent; custom themes also emit `--color-sidebar-label` for sidebar section subheads (harmony hue). **Dark mode** (Custom slide-out switch only) applies when the active theme is **Custom**: inverted seeds drive the sidebar shell and accent family; `deriveCustomPalette(..., { appearance: 'dark', pageTintHueFrom: light primary })` tints **page/surface/borders** with the user’s original primary hue so the content area does not jump to the RGB-complement hue. **`--color-accent`** stays the dark CTA fill (white label contrast); **`--color-accent-on-surface`** is a lighter same-hue accent for links and display type on `--color-bg` (`applyPalette` defaults it to `--color-accent` for presets). **`tjos-dark-mode`** in `localStorage`. **Preset themes always use their light ramp** — the stored dark flag has no effect until the user picks Custom again.

## Purpose of the brand kit page

The brand kit lives at `/brand` (or similar) within Tyler James OS. It serves as:
- A visual reference when building new components
- A test bed — if a new component looks right on this page, it belongs in the system
- Documentation for "why does this look like this"

---

## Colour palette

> To be defined. Some questions to answer:
> - Light mode, dark mode, or both?
> - What's the primary accent colour?
> - What's the vibe — minimal/clean, rich/dark, warm/neutral?

| Token | Value | Usage |
|---|---|---|
| `--color-background` | TBD | Page background |
| `--color-surface` | TBD | Cards, panels |
| `--color-primary` | TBD | CTAs, links, accents |
| `--color-text` | TBD | Body text |
| `--color-text-muted` | TBD | Secondary text, labels |
| `--color-border` | TBD | Dividers, outlines |
| `--color-destructive` | TBD | Errors, delete actions |

---

## Typography

> To be defined.

| Role | Font | Size | Weight |
|---|---|---|---|
| Display / H1 | TBD | TBD | TBD |
| H2 | TBD | TBD | TBD |
| H3 | TBD | TBD | TBD |
| Body | TBD | TBD | TBD |
| Caption / Label | TBD | TBD | TBD |
| Monospace (code) | TBD | TBD | TBD |

**Lists — accent carets:** Reference specimen on the live brand kit (**Typography → Lists**, `#typography-lists`) under that group label — “Before you ship”. Section title, one short muted line, then supporting lines with accent **›** markers and muted body copy. For prose checklists and “what’s included” blocks, not dense data tables.

**Font loading strategy:** Google Fonts or self-hosted via `next/font` (preferred — no external requests, no layout shift).

---

## Spacing scale

Based on a 4px base unit. All spacing should be multiples of 4.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

---

## Border radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | TBD | Inputs, small elements |
| `--radius-md` | TBD | Cards, panels |
| `--radius-lg` | TBD | Modals, large containers |
| `--radius-full` | 9999px | Pills, avatars |

---

## Component style rules

> To be defined once colours and typography are settled.

- **Buttons:** Primary, secondary, ghost, destructive variants
- **Cards:** Consistent padding, border, shadow treatment
- **Forms:** Label position, input height, focus ring style
- **Navigation:** Sidebar vs. top nav — TBD
- **Pop-out dock:** Floating control opens a horizontal dock — slide sheet (left) + anchor panel (right), shared seam, `max-width` / opacity transition on the sheet. Inline notices for confirmation live inside the sheet (`role="status"`, `aria-live="polite"`), not `window.alert`. Documented on the live brand kit under **Pop-out dock**; implementation reference `ThemeHelperFab` + `theme-helper.css`.
- **Icons:** Library TBD (Lucide is a strong candidate — lightweight, consistent)

---

## Motion & animation

- Prefer subtle, **functional** animation — feedback and hierarchy, not distraction.
- **Global utilities** live in `app/src/styles/brand-kit.css` (imported from `main.tsx`). Add classes to any markup; tune defaults on `:root` with `--tj-motion-*` variables.
- **Live reference:** brand kit page **Reference → Motion** (`#motion`) shows examples.
- **`prefers-reduced-motion: reduce`:** enter / stagger / hover motion utilities and glyph typing are disabled or reduced; content stays visible.

### CSS classes (drop-in)

| Class | Purpose |
| --- | --- |
| `.tj-motion-enter` | After load: fade + rise. Optional `style="--tj-motion-delay: 120ms"` to sequence. |
| `.tj-motion-enter-left` | Same, from the left. |
| `.tj-motion-reveal-cover` | “Curtain” reveal using `clip-path` + fade. |
| `.tj-motion-stagger-children` | Wrapper: staggers **direct children** (up to 10) with `--tj-motion-stagger-step` between starts. |
| `.tj-motion-hover-surface` | Hover: border mix + `--shadow-sm` (element should already have a border). |
| `.tj-motion-hover-lift` | Hover: lift (`translateY`) + stronger shadow (respects reduced motion). |
| `.tj-motion-hover-pop` | Hover: light `scale` (e.g. icon tiles). |
| `.tj-motion-hover-macro-tile` | Large link tiles (hub homepage): border + `--shadow-sm` + subtle `scale` using `--tj-motion-hover-pop` easing; keeps `text-decoration: none` on hover (overrides global link underline). |

**App hub tiles:** Reference specimen under brand kit **Cards → App hub tiles** — same pattern as other card groups (label + demo row), matching the hub route `/`.

### `:root` tokens (optional overrides)

| Variable | Role |
| --- | --- |
| `--tj-motion-enter-dur` | Enter / stagger animation length (default ~0.48s). |
| `--tj-motion-enter-ease` | Easing curve for enter animations. |
| `--tj-motion-stagger-step` | Delay between staggered siblings (default ~55ms). |
| `--tj-motion-hover-dur` | Hover transition duration (~155ms). |
| `--tj-motion-hover-ease-out` / `--tj-motion-hover-pop` | Hover easing. |

### Typing-style glyph stagger (H1 & display only)

- Add **`class="tj-motion-type"`** to a single **`<h1>`** or **display-sized** line (not body copy).
- After fonts load, **`initTjMotionTypeHeadings()`** in `app/src/lib/tjMotion.ts` splits text into **`.tj-motion-type__char`** spans with a short stagger (see `STAGGER_MS` in that file). Already invoked from **`App.tsx`** (any route) and **`BrandKitShell.tsx`** after HTML injection so client-navigated brand kit still runs.
- Preserve accent colour with nested `<span>` inside the heading; `CODE` / `PRE` subtrees are not split.
- Use **`aria-label`** on the heading when the visible text is split for motion, so the accessible name stays a single phrase.

---

## Open questions

- [ ] Light mode only, or dark mode from the start?
- [ ] What typeface(s) represent Tyler James OS?
- [ ] What is the primary accent colour?
- [ ] Icon library choice
- [ ] Should the brand kit page be public or authenticated?
