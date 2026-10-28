# Design system

Hydra has one visual language for every page people see: the public landing page (`/`), the sign-in page (`/signin`), the signed-in app (`/projects` and everything below it) and the Keycloak login pages (the `hydra` login theme). This document is the reference for building or changing any of them.

| Where | Code |
| --- | --- |
| Tokens (Light and Dark) | `frontend/web/src/app/globals.css` |
| Landing page | `frontend/web/src/components/landing/` (shared parts) and `components/landing/motion/` (animated sections), see [landing.md](landing.md) |
| Sign-in page | `frontend/web/src/components/signin/` |
| Signed-in app | `frontend/web/src/app/projects/app.css` (all styles), `frontend/web/src/components/app/` (shared parts), `frontend/web/src/lib/status.ts` (how a status looks) |
| Keycloak login | `infra/keycloak/themes/hydra/login/`, see [authentication.md](authentication.md#login-theme) |

## Design language

### Principles

1. **One idea per section.** A section has an eyebrow, a title, at most one sentence of lede, and one visual. If a visual needs a paragraph to be understood, simplify the visual.
2. **Motion explains, it does not decorate.** Every animation shows something the product does (a file being read, a list being saved, a failure travelling back along dependencies). Nothing moves only to move.
3. **Calm by default.** Few elements on screen, generous space, slow loops (5 to 12 seconds), one moving thing per area.
4. **Sharp at any size.** HTML, SVG and CSS only. No canvas, no images of UI, no animation library.
5. **Status is shape plus word.** Colour reinforces, never carries meaning alone.
6. **Honest copy.** Only what the product does today; impact is "potentially affected"; sample data is labelled as sample.

### Tokens

All tokens are CSS custom properties on `:root` in `frontend/web/src/app/globals.css`, with a Dark set under `:root[data-landing-theme="dark"]`. The theme script in the root layout sets that attribute on every page, so every page that uses these tokens gets Light, Dark and Auto (by local time). The Keycloak login theme runs outside the web app, so it keeps a copy of the tokens in `infra/keycloak/themes/hydra/login/resources/css/hydra.css`; change both together.

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
| Problem text on the soft tint | `--lp-bad-ink` | `#B81F2D` | `#FF6B72` |
| Warning, degraded / soft | `--lp-warn` / `--lp-warn-soft` | `#A15C07` / `#FDF1D8` | `#F5B83D` / `#352710` |
| Tag colours (labels people pick, not status) | `--lp-violet` / `--lp-violet-soft`, `--lp-tag-blue` / `--lp-tag-blue-soft` | `#7C3AED` / `#F1E9FF`, `#1F5FC9` / `#E4EDFC` | `#C4A5FF` / `#2C2147`, `#8AB4FF` / `#172640` |
| Same as problem (older name) | `--lp-signal` / `--lp-signal-soft` | as `--lp-bad` | as `--lp-bad` |
| Frosted surface | `--lp-glass` | white at 74% | `#1A1C22` at 72% |

Use the accent for interactive emphasis (selection, active step, links, the eyebrow). Use OK, warning and problem colours only for status. Text on an accent background uses `--lp-on-inverse`, which is light in Light and dark in Dark, so it keeps its contrast in both.

Shadows: `--lp-shadow-card` (cards, panels, tiles), `--lp-shadow-pop` (a lifted card on hover, a selected graph node, the work-item drawer) and `--lp-shadow-stage` (the landing page's large windows); each has a Dark value. Other tokens: radii `--lp-radius-sm/md/lg/xl` (8, 12, 16, 24 px), easing `--lp-ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) and `--lp-ease-in-out`, durations `--lp-dur-press` (160 ms), `--lp-dur-ui` (240 ms), `--lp-dur-reveal` (500 ms).

### Type

Geist for text and Geist Mono for code, numbers in tables and small labels (`fonts.ts`, loaded with `next/font/google`). The Keycloak login theme bundles the same two fonts as woff2 files (SIL Open Font License).

| Use | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Page title (`h1`) on the landing page | `clamp(44px, 6vw, 80px)` / 1 | 650 | -0.045em |
| Page title (`h1`) on the sign-in pages (`/signin`, Keycloak's sign-in) | `clamp(38px, 4.4vw, 56px)` / 1.02; Keycloak's other pages `clamp(32px, 3.2vw, 42px)` | 650 | -0.04em |
| Page title (`h1`) in the app | `clamp(32px, 3.4vw, 46px)` / 1.05 | 650 | -0.035em |
| Section title (`h2`) | `clamp(34px, 4vw, 52px)` / 1.06 | 650 | -0.035em |
| Step, card or panel title (`h2`, `h3`) | 17 to 34 px / 1.15 to 1.45 | 620 to 650 | -0.015 to -0.03em |
| Lede | 16 to 18 / 26 to 30 px | 400 | normal |
| Body | 15 to 17 / 24 to 28 px (the app uses 15 / 24 px) | 400 | normal |
| Eyebrow | 12 / 16 px, Geist Mono, uppercase, `--lp-accent` | 500 | 0.08em |
| Labels, badges, table headers | 10 to 13 px (headers in Geist Mono, uppercase) | 500 to 650 | normal to 0.08em |

Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`. One `h1` per page; heading levels never skip.

### Layout

- Content width: `.wrap` on the landing page (max 1240 px, 32 px side padding, 16 px under 640 px). The app uses `.page` and `.ws` (max 1440 px, 32 px gutter, 16 px under 720 px).
- Section rhythm on the landing page: `.section` (96 px top and bottom, 64 px under 720 px). Section header = `SectionHeader` (eyebrow, title, optional lede), max 720 px wide, 48 px above the content.
- In the app, panels and tiles are spaced by the gap of `.stack` and `.two-col` alone (16 px), never by margins as well.
- Grids collapse from three columns to two under 1040 px and to one under 700 px. Width-dependent figures use container queries, not the viewport.
- Radii: pills and buttons 999 px (landing) or 12 px (app buttons); small controls 10 to 12 px; panels 20 px; cards and tiles 24 px; windows 22 px; the closing panel and the sign-in picture 32 px.

### Building blocks: landing and sign-in

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
| Orbit | `motion/Orbit.tsx` | Services circling Hydra on an inverse panel (closing section, sign-in page, Keycloak login). |
| Brand and theme switch | `Brand`, `ThemeToggle` | The header of every page. |
| Graph geometry | `motion/geometry.ts` | Positions and edge paths for the small maps (wide and tall layouts). Pure data. |

### Building blocks: the signed-in app

Components are in `src/components/app/`, classes in `src/app/projects/app.css`. Element rules there are wrapped in `:where()`, so any class overrides them, and buttons are styled only through `.button`, never the bare element.

| Block | Where | Use it for |
| --- | --- | --- |
| App header | `app/projects/layout.tsx` | Brand (links to `/projects`), theme switch, avatar with initials, Sign out. Sticky, frosted. |
| Project frame | `app/projects/[projectId]/layout.tsx`, `ProjectNav` | Breadcrumb and the pill tab bar, grouped (Project, Plan, Model, Operate, Connect, Admin). It stays mounted between tabs; on narrow screens it scrolls sideways and keeps the current tab in view. |
| Page head | `PageHead` | Eyebrow, the page's one `h1`, a lede, and the page actions on the right. |
| Panel / tile | `.panel` (20 px radius), `.tile` (24 px) | A titled block of content (`.panel-head` with a `.panel-link`), or a hero block such as the overview's health. |
| Grids | `.stack`, `.two-col` | Vertical rhythm and two columns that become one under 900 px. |
| Status | `StatusGlyph`, `StatusPill`, `StatusText`, `HealthPill`, `SeverityPill`, `DeploymentPill` | Every status, as shape plus word (see the app status table below). |
| Health bar | `HealthBar`, `HealthLegend` | The share of each health state in an environment, with its counts. Overview and environment cards. |
| Number tile | `Stat` (`.stats`) | A number with its label and an icon tinted when it needs attention. Five in a row from 721 px, two per row on a phone. |
| Live map | `MapPreview`; `liveMap` and `failureHops` in `lib/graph.ts`; type icons in `lib/componentTypes.ts` | The environment's topology on the overview: a card per component (type icon, name, one status word) on the layered layout, connectors that branch like a tree, a line under the map that says what it shows, a Replay button, and the whole box opens the topology page. It tells its story once, when it comes into view: the components appear layer by layer as the arrows to them grow, their health shows, degraded and unhealthy components light up, and a red arrow climbs from each to what depends on it, which lights up as potentially affected, one hop at a time. A box narrower than 520 px, and a system whose picture would need more than three columns of cards, show the same story layer by layer as rows of chips. |
| Notice | `Notice` | An error to act on (announced at once), information, or success. |
| Example project | `ExampleProject`; `lib/demo` | Demo mode only, under the project cards: offers the large example project and shows each step while it is created through the API. See [example-project.md](example-project.md). |
| Feed | `.feed`, `.feed-item` | Events, deployments, activity: a pill or version on the left, the text on the right; stacked on a phone. |
| Chip, version | `.chip` (`data-tone` for a tint), `.version` | Short facts (type, visibility, source) and version numbers in Geist Mono. |
| Toolbar, search, segments | `.toolbar`, `.search-field`, `.seg` | Filters above a list or graph; the segmented control switches views (Board, Backlog). |
| Table | `.table-panel` (+ `.stack-table`) | Rows of records. With `.stack-table` and a `data-label` on each cell (and `data-primary` on the title cell), a phone shows each row as a small card instead of a table that scrolls sideways. |
| Forms | `.form-panel`, `.form-row`, `.inline-form`, `.form-actions` | Labelled fields; rows of fields take the full width on a phone. |
| Cards | `.project-card`, `.env-card`, `.work-card` | A project in the list, an environment with its recorded health, a work item on the board. |
| Graph node | `.graph-node` in `TopologyWorkspace` | A component on the topology: type, version, name, health pill, impact pill. |
| Empty state | `.tile.empty-state` | What is missing and the one action that fills it. |

### Status language

On the landing page and the sign-in page:

| State | Shape | Word | Colour |
| --- | --- | --- | --- |
| OK / healthy | check, or filled circle | "OK", "Healthy" | `--lp-ok` |
| Degraded (the failing service) | filled triangle | "degraded" | `--lp-bad` (filled box) |
| Potentially affected | hollow triangle, dashed outline | "potentially affected" | `--lp-bad` on `--lp-bad-soft` |
| Unknown / not yet saved | hollow circle | "unknown" | `--lp-ink-3` |
| Unhealthy | cross | "Unhealthy" | `--lp-bad` |

In the signed-in app (`src/lib/status.ts`), degraded and unhealthy must be told apart in one view, so **Degraded is amber**:

| Kind | State | Shape | Colour |
| --- | --- | --- | --- |
| Health | Healthy | filled circle | `--lp-ok` |
| | Degraded | filled triangle | `--lp-warn` |
| | Unhealthy | cross | `--lp-bad` |
| | Unknown | hollow circle | `--lp-ink-3` (the health bar uses `--lp-line-strong`) |
| Impact | Potentially affected | hollow triangle, dashed outline | `--lp-bad` on `--lp-bad-soft` |
| Event severity | Info / Warning / Error / Critical | dot / triangle / cross / octagon | accent / `--lp-warn` / `--lp-bad` / `--lp-bad` |
| Deployment | Succeeded / Running / Pending / Rolled back / Failed | check / dot / hollow circle / hollow triangle / cross | ok / accent / ink-3 / warn / bad |
| Work item | New / Active / Resolved / Closed / Removed | hollow circle / dot / check / check / cross | ink-3 / accent / ok / ink-3 / ink-3 |

Every status shows its word next to the shape; the colour only reinforces it. An arrow from A to B always means A depends on B; a failure travels against the arrows.

### Motion rules

- **Resting style is the final state.** Write the meaningful end state as the normal CSS and describe only how it gets there in `@keyframes` (usually just a `from`). With reduced motion the animations are removed and the page still shows the full story, frozen on its most telling frame.
- **Start when seen, pause when not.** Wrap animated areas in `InView` (sets `data-inview`), and add the area's class to the "pause when off screen" rule at the top of `motion.module.css`. Entrances use `once`.
- **Visitors can stop everything.** The `MotionToggle` button sets `data-motion="paused"` on the page root; one rule in `landing.module.css` pauses every animation (WCAG 2.2.2).
- **Prefer `transform` and `opacity`.** SVG stroke and fill animations are fine for small graphics.
- **Timing.** Hover and press 160 to 240 ms; entrances 500 to 900 ms with `--lp-ease-out`; pops use the spring `cubic-bezier(0.34, 1.56, 0.64, 1)`; loops 5 to 12 s. Stagger with `--i` (index) and `calc(var(--i) * 80ms)`. Inside a loop, keep the stagger in the keyframe percentages, not in delays, when several elements must change together.
- **Light 3D only.** CSS `perspective` with small tilts (up to about 8 degrees on hover) or a fixed isometric stack. Keep text facing the viewer when it must be read.
- **Hover only where it exists.** Hover styles go inside `@media (hover: hover) and (pointer: fine)`; the button `:active` scale is 0.97.
- **In the app, motion is quieter still.** The page head and cards rise in once (`.rise`, staggered by `--i`), content that loads later fades in (`.fade-in`), the work-item drawer slides in, the "Live" dot pings three times, the impact path on the topology flows slowly while it is shown, and the overview's live map tells its story once when it comes into view (each element waits for its own moment, set by `liveMap` as CSS animation delays; `.map-stage[data-inview="false"]` pauses it off screen, Replay tells it again). Nothing else moves. `prefers-reduced-motion` removes all of it, and the live map then shows its last frame straight away.

### Copy rules

- Short sentences, second person, a verb first where possible ("Import a repository", "Pick a service").
- One idea per sentence; no jargon the visual already explains.
- Say "potentially affected", never "will fail". Label sample data as "sample system".
- Describe only features that exist, and keep the claims table in [landing.md](landing.md) up to date.
- The product is called **Hydra** in everything people read: the brand, page titles, headings, the sign-in screen, the Keycloak login pages and copy ([ADR 0020](decisions/0020-product-name-hydra.md)). `DevOpsPlatform` stays only as the working name of the code (solution, projects, namespaces, realm and client ids).

### Checklist for a new page or section

1. Use the `--lp-*` tokens only; no hard-coded colours.
2. Landing: start from `.wrap`, `.section` and `SectionHeader`. App: start from `PageHead` and put the content in `.stack`; reuse the app building blocks above.
3. Pick one building block for the visual; reuse `geometry.ts` for any small map.
4. If it moves: resting style is the final state, wrap it in `InView`, add it to the off-screen pause rule, and check it with reduced motion.
5. Status: shape plus word, using the tables above.
6. Tables: add `.stack-table` and a `data-label` on each cell, so they read on a phone.
7. Check Light and Dark, 375, 768 and 1440 px, keyboard focus, and that there is no horizontal scroll.
8. Run `npm run typecheck`, `npm run lint` and `npm run build`.

### Where it is used

Every page now uses the design language:

| Page | Notes |
| --- | --- |
| Landing (`/`) | The reference for the language, see [landing.md](landing.md). |
| Sign-in (`/signin`) | Reuses `Brand`, `ThemeToggle`, the pill, the inverse panel and the `Orbit`. |
| Signed-in app (`/projects` and below) | Projects, new project, import, and every project tab (overview, boards, components, environments, topology, compare, events, deployments, integrations, settings). React Flow on the topology page gets its colours from the tokens through its `--xy-*` variables in `app.css`. |
| Keycloak login (`hydra` theme) | Keycloak's keycloak.v2 theme with the `/signin` frame and a copy of the tokens; PatternFly's variables point at them, so Keycloak's own components follow both themes. |

The theme (Auto, Light, Dark) works the same everywhere: the inline script from `theme.ts` sets `data-landing-pref` and `data-landing-theme` on `<html>` before the first paint, and `ThemeToggle` changes it. The Keycloak login pages use the same rule in `hydra-theme.js`; because Keycloak runs on another origin, they keep their own stored choice.

## Version 2 token names

The Version 2 interface used `--color-*` tokens. They remain in `globals.css` as aliases of the `--lp-*` tokens, so older code and open branches keep working and follow both themes. New code uses the `--lp-*` tokens directly.

| Version 2 name | Now points to |
| --- | --- |
| `--color-bg`, `--color-surface`, `--color-surface-subtle` | `--lp-bg`, `--lp-surface`, `--lp-surface-2` |
| `--color-border`, `--color-border-strong` | `--lp-line`, `--lp-line-strong` |
| `--color-text`, `--color-text-secondary`, `--color-text-muted` | `--lp-ink`, `--lp-ink-2`, `--lp-ink-3` |
| `--color-primary`, `--color-primary-hover`, `--color-primary-soft` | `--lp-accent`, `--lp-accent`, `--lp-accent-soft` |
| `--color-success`, `--color-warning`, `--color-danger` (and `-soft`) | `--lp-ok`, `--lp-warn`, `--lp-bad` (and `-soft`) |
| `--color-info` (and `-soft`), `--color-unknown` | `--lp-accent` (and `-soft`), `--lp-ink-3` |
| `--color-tag-purple` (and `-soft`) | `--lp-violet` (and `-soft`) |
