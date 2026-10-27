# Landing page

`/` is a public, static page that explains the platform and sends visitors to the three places they can act: **Open workspace** (`/projects`), **Sign in** (`/signin`) and **Import a repository** (`/projects/import`). It calls no API and reads no session. The root layout no longer calls `auth()`, so the page can be prerendered; the signed-in header moved to `src/app/projects/layout.tsx`.

All code is in `frontend/web/src/components/landing/`. No npm dependency was added: icons are inlined Lucide paths (ISC), the graph is plain SVG, and animation is CSS. The only new network dependency is the two typefaces, see [Typography](#typography).

## Structure

| Section | File | Purpose |
| --- | --- | --- |
| Hero | `Hero.tsx`, `HeroStage.tsx` | Headline, two actions, and an animated demo of a failure spreading through a sample system |
| Get started | `GetStarted.tsx` | Three steps, each a link: sign in, import a repository, open the topology |
| Impact explorer | `ImpactSection.tsx`, `ImpactExplorer.tsx` | Click a service in the sample graph and see what it could reach |
| Capabilities | `Capabilities.tsx` | Topology, impact analysis, runtime health, deployments and events, environments, boards |
| Closing call to action | `FinalCta.tsx` | Repeats the two actions |

Routes and section ids are constants in `content.ts`. Server components render everything; client components are limited to `HeroStage`, `ImpactExplorer`, `ThemeToggle` and `Reveal`.

## Sample data

The graph in the hero, the explorer and the capability tiles is **sample data**, labelled as such on screen. It mirrors `backend/examples/commerce-system/compose.yaml`: 8 services and 7 dependencies (`graph.ts`). An arrow `A -> B` means A depends on B, the same convention as the topology page.

`analyzeImpact` in `graph.ts` walks the dependencies in reverse (breadth first, safe on cycles) and returns direct dependents, indirect dependents and the longest chain. For `payment-service` that is `order-service` (direct) and `api-gateway`, `web-frontend` (indirect). Results are worded as "potentially affected", never as a prediction. The function is pure and has no React dependency.

## Hero story

Six phases loop: Scan 2.8 s, Map 2.6 s, Observe 2.0 s, Incident 2.4 s, Impact 3.2 s, Recover 2.4 s (15.4 s per loop). Each phase is a frame of node and edge states defined in `graph.ts`.

The progress bar of the active phase is the clock: when its CSS animation ends, React moves to the next phase. Pausing the animation therefore pauses the story, and no timers need to be kept in sync. The story pauses on pointer hover (mouse only), on keyboard focus inside the stage, when the stage is scrolled out of view, and when the visitor presses the pause button. The six bars are buttons, so a visitor can jump to any phase.

The server HTML shows the Impact frame, the most informative one. It is also what is shown without JavaScript and to visitors who prefer reduced motion.

## Theme

Three choices: **Auto**, **Light**, **Dark**.

- Auto shows Light from 07:00 (inclusive) to 19:00 (exclusive) in the visitor's local time and Dark otherwise. The hours are `LIGHT_FROM_HOUR` and `LIGHT_UNTIL_HOUR` in `theme.ts`. The page re-checks on load, every 60 seconds and when the tab becomes visible again, so a page left open flips at the boundary.
- Light and Dark are stored in `localStorage` under `dp-landing-theme`. Auto is the absence of the key. Storage errors (private mode, blocked storage) are caught; the choice then lasts for the visit.
- A small inline script in `<head>` (generated from `theme.ts`, so its rule cannot drift from `resolveTheme`) sets `data-landing-pref` and `data-landing-theme` on `<html>` before the first paint. There is no flash of the wrong theme, and the selected toggle segment is styled from the same attribute, so it is correct before hydration. `<html>` carries `suppressHydrationWarning` because those attributes exist only on the client's copy.
- A visible theme change crossfades with the View Transitions API where it exists, and is instant for visitors who prefer reduced motion.
- The theme applies to the landing page only. The signed-in application keeps the light palette from `docs/design-system.md`.

## Motion

Animations change only `transform` and `opacity`, never layout; hover and press feedback also fades colours. Motion uses ease-out curves, buttons and graph nodes scale to 0.97 while pressed, and hover effects apply only on devices with a fine pointer that can hover. Elements below the fold fade in once when scrolled to; they are fully visible in the server HTML.

With `prefers-reduced-motion: reduce` every animation and transition is removed, the hero stays on the Impact frame, the pause button is hidden because there is nothing to pause, the steps remain clickable, and smooth scrolling is off.

## Accessibility

- Status is never colour alone. Every state has a shape and a text label: hollow circle unknown, filled circle healthy, filled triangle degraded, cross unhealthy, hollow triangle potentially affected. A legend is always visible next to a graph.
- The explorer graph is a group of buttons (`aria-pressed`, label "service, state") that work with Tab, Enter and Space. A polite live region announces the result of each selection. The decorative graphs are hidden from assistive technology and the hero provides the same dependencies as a visually hidden list.
- There is a skip link, one `h1` with heading levels that never skip, landmarks, visible `:focus-visible` outlines, and a clickable area at least 44 px tall for every graph node at the widths tried (375 to 1440 px).
- Contrast was measured on every distinct text run in both themes: the lowest ratio is 4.85:1 in Light and 4.73:1 in Dark (AA needs 4.5:1). Graph lines are at least 3:1 against their backgrounds. Hairline borders are decoration; identity and state are carried by text and shapes that meet the text and graphics ratios.

## Typography

Geist and Geist Mono load through `next/font/google`, so they are downloaded **at build time** and served from the app's own origin. The build machine therefore needs internet access. If that is a problem, download the font files into the repository and switch `fonts.ts` to `next/font/local`; nothing else changes. System font stacks are the fallback while the fonts load. Tokens and sizes are in `docs/design-system.md`.

## Product claims on the page

The copy describes only what the repository documents or implements:

| Claim | Source |
| --- | --- |
| Read-only analysis, code is never executed | `docs/decisions/0019-do-not-execute-repository-content.md` |
| Scan, review a preview, then apply to a project | `docs/discovery.md` |
| Sign in with an account and see your projects | `docs/authentication.md` |
| Topology filters for type, health and dependency source | `TopologyWorkspace.tsx` |
| Impact analysis, "potentially affected" wording | `AGENTS.md` section 9 |
| Live health updates without a page reload | `docs/decisions/0004-use-sse-for-live-updates.md` |
| Deployments and health changes appear as operational events | `LifecycleEndpoints.cs` |
| Compare two environments: deployed versions and recorded health | `docs/topology-v2.md` |
| Boards with New, Active, Resolved, Closed and component links | `docs/boards.md` |

Repository import currently supports the bundled `backend/examples/commerce-system` repository only (`docs/discovery.md`); the page says "Import a repository" because that is the name of the existing flow, and does not name GitHub, Azure DevOps or any other provider. Revisit the copy when more sources are wired.

## Changing things

- Copy: the `.tsx` file of the section.
- Sample system: `SERVICE_IDS`, `DEPENDENCIES`, `LAYOUTS` and `COMPOSE_EXCERPT` in `graph.ts`. A new service needs a position in both layouts.
- Phase timings and captions: `PHASES` in `graph.ts`.
- Auto hours: `theme.ts`.
- Colours, radii and easing: the `--lp-*` tokens at the end of `globals.css`.
