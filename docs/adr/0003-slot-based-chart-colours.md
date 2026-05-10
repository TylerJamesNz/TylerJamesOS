# 0003. Slot-based chart colours, not fixed hex

**Status:** Accepted, 2026-05-10.

## Context

Every chart in the Finance app has categorical series that need colour assignment: a Net Worth pie (per Account), a Category pie (per Category), an Investments line (per fund), a Liquid line (per Deposit Account), a transactions table (per Category badge). The data model already had `Category.colour: string?` and `Tag.colour: string?` from the pre-V1 draft, intended to hold a hex value chosen at creation.

TJOS already runs a runtime palette switcher (`app/src/themes/palettes.ts`, `applyPalette.ts`). Switching presets retints the whole UI by writing CSS custom properties to `document.documentElement`. Components read tokens like `var(--color-accent)` and inherit the change for free. Charts, however, were going to break that pattern: an arbitrary user-picked hex on each Category would clash with whichever palette is active.

Two real options. Either categories carry fixed hex (stable colour memory across themes, but charts no longer harmonise with the active palette), or categories carry an indirect reference into a palette-derived ramp (charts harmonise by construction, but "Groceries was green yesterday, teal today" if the user switches themes).

## Decision

Every palette in `app/src/themes/palettes.ts` exposes a 10-colour categorical ramp via CSS custom properties `--chart-cat-0` through `--chart-cat-9`. The ramp is defined per palette, harmonised with that palette's accent and primary, and derived using `chroma-js` (already a dep).

Categories, Accounts, Tags hold a `colour_slot: int` (0..9), not a hex string. Charts read the slot's current value from CSS variables at render time. Switching palettes triggers `usePalette()`, which fans out to a `setOption({ color: [...] })` on every mounted ECharts instance, retinting in place without remount.

A future per-category hex override is technically open (add a nullable `colour_override` column), but is not part of V1. Slot-based is the only path until a concrete need for fixed-hex appears.

## Consequences

- Charts always harmonise with whichever palette is active. New palettes "just work" for charts because the ramp is part of the palette definition itself.
- The user has one fewer thing to pick when creating a category (no hex picker), and one more thing to pick (slot index 0..9). Net negligible.
- The data model becomes an integer ref instead of a string hex. Migration cost: one type change on Category, Account, Tag (and any seeded rows). Done in the Finance schema migration.
- `usePalette()` becomes the single place charts subscribe to retint. If that hook is bypassed (a chart instantiated outside the React tree), it will stay stale on palette switch. Document on the `Chart` component.
- Reversing this decision later requires re-introducing a hex column and migrating any user-set slot indices to derived hexes. Real cost, but not catastrophic.
- The trade against slot-based was "Groceries was green yesterday, teal today." Accepted: theme switches are explicit user actions, infrequent, and the alternative (chart palette drifting from UI palette) is the worse aesthetic.
