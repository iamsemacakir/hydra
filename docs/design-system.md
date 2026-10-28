# Design system

The Version 2 interface uses a light, restrained operational palette. CSS tokens live in `frontend/web/src/app/globals.css`; new components should use these tokens rather than hard-coded colors. The existing overview, topology, deployment, and event layouts retain their behavior while adopting this palette.

| Role | Token | Value |
| --- | --- | --- |
| Page background | `--color-bg` | `#F8FAFC` |
| Surface | `--color-surface` | `#FFFFFF` |
| Subtle surface | `--color-surface-subtle` | `#F1F5F9` |
| Border / strong border | `--color-border` / `--color-border-strong` | `#E2E8F0` / `#CBD5E1` |
| Text / secondary / muted | `--color-text` / `--color-text-secondary` / `--color-text-muted` | `#0F172A` / `#475569` / `#64748B` |
| Primary / hover | `--color-primary` / `--color-primary-hover` | `#2563EB` / `#1D4ED8` |
| Success | `--color-success` | `#15803D` |
| Warning | `--color-warning` | `#B45309` |
| Danger | `--color-danger` | `#B91C1C` |
| Info / unknown | `--color-info` / `--color-unknown` | `#1D4ED8` / `#64748B` |

The semantic colors have pale background companions. Statuses must also have readable text labels, as in the topology nodes and event severity badges. Focus outlines use primary blue and must stay visible on white surfaces. Cards use `--radius-lg` and `--shadow-card`; graph nodes use `--shadow-node`. Typography is a compact system sans stack with clear heading hierarchy. The board and forms introduced in later slices should reuse these primitives.

The palette was the first Version 2 slice and did not change the database model.

The board reuses these neutrals and semantic colors. Tag colors are selected from named tokens; priority always has a readable text label. The work-item panel uses the same surface, border, focus, and spacing conventions as the project forms.

## Design language (landing page, to be rolled out to the other pages)

The public landing page (`/`, see [landing.md](landing.md)) introduced the visual language the rest of the interface should move to. This section is the reference for building any new page or section in that language. The code it describes lives in `frontend/web/src/components/landing/` (shared parts) and `frontend/web/src/components/landing/motion/` (the animated sections).

### Principles

1. **One idea per section.** A section has an eyebrow, a title, at most one sentence of lede, and one visual. If a visual needs a paragraph to be understood, simplify the visual.
2. **Motion explains, it does not decorate.** Every animation shows something the product does (a file being read, a list being saved, a failure travelling back along dependencies). Nothing moves only to move.
3. **Calm by default.** Few elements on screen, generous space, slow loops (5 to 12 seconds), one moving thing per area.
4. **Sharp at any size.** HTML, SVG and CSS only. No canvas, no images of UI, no animation library.
5. **Status is shape plus word.** Colour reinforces, never carries meaning alone.
6. **Honest copy.** Only what the product does today; impact is "potentially affected"; sample data is labelled as sample.

### Tokens

All tokens are CSS custom properties on `:root` in `frontend/web/src/app/globals.css`, with a Dark set under `:root[data-landing-theme="dark"]`. The theme script in the root layout sets that attribute on every page, so any page that uses these tokens gets Light, Dark and Auto (by local time) for free.

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| Page background | `--lp-bg` | `#F6F8FA` | `#0C0E12` |
| Surface / subtle surface | `--lp-surface` / `--lp-surface-2` | `#FDFEFF` / `#EDEFF4` | `#15171C` / `#1F2227` |
| Border / strong border | `--lp-line` / `--lp-line-strong` | `#DDE0E4` / `#BABEC4` | `#2B2E34` / `#464B52` |
| Graph line | `--lp-edge` | `#82868F` | `#63676F` |
| Text / secondary / muted | `--lp-ink` / `--lp-ink-2` / `--lp-ink-3` | `#10141A` / `#484D56` / `#616670` | `#F0F2F4` / `#A7ABB3` / `#888C94` |
| Inverse panel / text on it | `--lp-inverse` / `--lp-on-inverse` | `#10141A` / `#F8F9FC` | `#F0F2F4` / `#0D0F13` |
| Accent / soft accent | `--lp-accent` / `--lp-accent-soft` | `#4F46E5` / `#E8E7FF` | `#9394FF` / `#24244D` |
| Second accent (gradients only) | `--lp-accent-2` | `#0891B2` | `#22D3EE` |
| OK / soft OK | `--lp-ok` / `--lp-ok-soft` | `#0B7A4B` / `#DCF3E7` | `#3DDC97` / `#0F2E22` |
| Problem / soft problem | `--lp-bad` / `--lp-bad-soft` | `#D42A38` / `#FFE3E5` | `#FF6B72` / `#3A1519` |
| Same as problem (older name) | `--lp-signal` / `--lp-signal-soft` | as `--lp-bad` | as `--lp-bad` |
| Frosted surface | `--lp-glass` | white at 74% | `#1A1C22` at 72% |

Use the accent for interactive emphasis (selection, active step, links in motion, the eyebrow). Use OK and problem colours only for status. Text on an accent background uses `--lp-on-inverse`, which is light in Light and dark in Dark, so it keeps its contrast in both.

Other tokens: radii `--lp-radius-sm/md/lg/xl` (8, 12, 16, 24 px), easing `--lp-ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) and `--lp-ease-in-out`, durations `--lp-dur-press` (160 ms), `--lp-dur-ui` (240 ms), `--lp-dur-reveal` (500 ms).

### Type

Geist for text and Geist Mono for code, numbers in tables and small labels (`fonts.ts`, loaded with `next/font/google`).

| Use | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Page title (`h1`) | `clamp(44px, 6vw, 80px)` / 1 | 650 | -0.045em |
| Section title (`h2`) | `clamp(34px, 4vw, 52px)` / 1.06 | 650 | -0.035em |
| Step or card title (`h3`) | 18 to 34 px / 1.15 to 1.45 | 650 | -0.015 to -0.03em |
| Lede | 18 / 30 px | 400 | normal |
| Body | 15 to 17 / 24 to 28 px | 400 | normal |
| Eyebrow | 12 / 16 px, Geist Mono, uppercase, `--lp-accent` | 500 | 0.08em |
| Labels, badges | 10 to 13 px | 550 to 650 | normal |

Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`. One `h1` per page; heading levels never skip.

### Layout

- Content width: `.wrap` (max 1240 px, 32 px side padding, 16 px under 640 px).
- Section rhythm: `.section` (96 px top and bottom, 64 px under 720 px). Section header = `SectionHeader` (eyebrow, title, optional lede), max 720 px wide, 48 px above the content.
- Grids collapse from three columns to two under 1040 px and to one under 700 px. Width-dependent figures use container queries, not the viewport.
- Radii: pills and buttons 999 px; small controls 10 to 12 px; cards and tiles 24 px; windows 22 px; the closing panel 32 px.

### Building blocks

| Block | Where | Use it for |
| --- | --- | --- |
| Pill | `.pill` in `motion.module.css` | A short claim above a page title, with a pulsing status dot. |
| Button | `ButtonLink` | Primary (inverse colours) and secondary (outlined). Routes use `next/link`, anchors a plain `<a>`. |
| Section header | `SectionHeader` | Every section. |
| Tile | `Tile` in `motion/Bento.tsx` | A capability or a summary card: a figure on a dotted canvas on top, title and one sentence below. Leans towards the mouse (`Tilt`). |
| Window | `.window`, `.windowBar` | Anything that shows "the product at work": three dots, tabs, a body. |
| Status point | `Graph` in `motion/scenes.tsx` | A service on a small map: a point with its name under it and a status box above it. |
| Status pill | `.heroStatus p` | A one-line narration of what an animation is doing. |
| State glyph | `StateGlyph` | Inline status in text and lists. |
| Inverse panel | `.closingPanel` | A closing call to action; buttons swap to the light variant on it. |
| Graph geometry | `motion/geometry.ts` | Positions and edge paths for the small maps (wide and tall layouts). Pure data. |

### Status language

| State | Shape | Word | Colour |
| --- | --- | --- | --- |
| OK / healthy | check, or filled circle | "OK", "Healthy" | `--lp-ok` |
| Degraded (the failing service) | filled triangle | "degraded" | `--lp-bad` (filled box) |
| Potentially affected | hollow triangle, dashed outline | "potentially affected" | `--lp-bad` on `--lp-bad-soft` |
| Unknown / not yet saved | hollow circle | "unknown" | `--lp-ink-3` |
| Unhealthy | cross | "Unhealthy" | `--lp-bad` |

An arrow from A to B always means A depends on B; a failure travels against the arrows.

### Motion rules

- **Resting style is the final state.** Write the meaningful end state as the normal CSS and describe only how it gets there in `@keyframes` (usually just a `from`). With reduced motion the animations are removed and the page still shows the full story, frozen on its most telling frame.
- **Start when seen, pause when not.** Wrap animated areas in `InView` (sets `data-inview`), and add the area's class to the "pause when off screen" rule at the top of `motion.module.css`. Entrances use `once`.
- **Visitors can stop everything.** The `MotionToggle` button sets `data-motion="paused"` on the page root; one rule in `landing.module.css` pauses every animation (WCAG 2.2.2).
- **Prefer `transform` and `opacity`.** SVG stroke and fill animations are fine for small graphics.
- **Timing.** Hover and press 160 to 240 ms; entrances 500 to 900 ms with `--lp-ease-out`; pops use the spring `cubic-bezier(0.34, 1.56, 0.64, 1)`; loops 5 to 12 s. Stagger with `--i` (index) and `calc(var(--i) * 80ms)`. Inside a loop, keep the stagger in the keyframe percentages, not in delays, when several elements must change together.
- **Light 3D only.** CSS `perspective` with small tilts (up to about 8 degrees on hover) or a fixed isometric stack. Keep text facing the viewer when it must be read.
- **Hover only where it exists.** Hover styles go inside `@media (hover: hover) and (pointer: fine)`; the button `:active` scale is 0.97.

### Copy rules

- Short sentences, second person, a verb first where possible ("Import a repository", "Pick a service").
- One idea per sentence; no jargon the visual already explains.
- Say "potentially affected", never "will fail". Label sample data as "sample system".
- Describe only features that exist, and keep the claims table in [landing.md](landing.md) up to date.
- The product is called **Hydra** in everything people read: the brand, page titles, headings, the sign-in screen and copy ([ADR 0020](decisions/0020-product-name-hydra.md)). `DevOpsPlatform` stays only as the working name of the code (solution, projects, namespaces).

### Checklist for a new page or section

1. Use the `--lp-*` tokens only; no hard-coded colours.
2. Start from `.wrap`, `.section` and `SectionHeader`.
3. Pick one building block for the visual; reuse `geometry.ts` for any small map.
4. If it moves: resting style is the final state, wrap it in `InView`, add it to the off-screen pause rule, and check it with reduced motion.
5. Status: shape plus word, using the table above.
6. Check Light and Dark, 375, 768 and 1440 px, keyboard focus, and that there is no horizontal scroll.
7. Run `npm run typecheck` and `npm run lint`.

### Rolling it out to the signed-in pages

The signed-in pages (`/projects` and below) still use the Version 2 `--color-*` tokens above and the system font. To move a page over: wrap it in the Geist font variables (as `LandingPage` does), replace its `--color-*` references with the matching `--lp-*` tokens (surface, line, ink, accent for primary, ok, bad), give its cards the tile radius and border, and add the `ThemeToggle` to the app header so Dark works there too. Do it one page at a time; React Flow on the topology page needs its own colour overrides.
