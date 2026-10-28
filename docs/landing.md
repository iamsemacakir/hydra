# Landing page

`/` is a public, static page that explains the platform and sends visitors to the three places they can act: **Open workspace** (`/projects`), **Sign in** (`/signin`) and **Import a repository** (`/projects/import`). It calls no API and reads no session. The root layout no longer calls `auth()`, so the page can be prerendered; the signed-in header moved to `src/app/projects/layout.tsx`.

All code is in `frontend/web/src/components/landing/`. No npm dependency was added: icons are inlined Lucide paths (ISC), the graph is plain SVG, and animation is CSS. The only new network dependency is the two typefaces, see [Typography](#typography).

## Structure

| Section | File | What moves |
| --- | --- | --- |
| Hero | `motion/Hero.tsx`, `motion/HeroScene.tsx` | Headline words rise in; three plates in light 3D (the compose file, Hydra, the service map) lift apart, the file is read, the map is drawn, one service fails and recovers, on a 12-second loop. A status line under the plates says in words what is happening. The stack leans a little towards the mouse. |
| Ribbon | `motion/Marquee.tsx` | Two slow rows of what a project brings together, drifting in opposite directions; they stop on hover. |
| How it works | `motion/Story.tsx`, `motion/scenes.tsx` | Four steps. A window next to them stays in view and plays the step being read: the compose file types itself; the scan results are applied and each row flips from "found" to "saved"; the map is drawn point by point with an "OK" box over each service; one service fails and the red travels back along the lines, hop by hop, before it recovers. On narrow screens each step shows its own window. |
| Capabilities | `motion/Bento.tsx` | Seven tiles, each with its own small loop: data flowing along dependencies, a ripple with the services it reaches, a heartbeat and a status card that flips, an event feed, an environment comparison, a lock closing over a scanned file, a work item moving across a board. Tiles lean towards the mouse. |
| Impact explorer | `ImpactSection.tsx`, `ImpactExplorer.tsx` | Click a service in the sample graph and see what it could reach. |
| Get started | `motion/Steps.tsx` | Three linked steps; the line between them draws itself when it comes into view. |
| Closing | `motion/Closing.tsx` | The two actions, next to services orbiting Hydra on a tilted ring. |

Routes and section ids are constants in `content.ts`. Everything is server-rendered; client components are limited to `HeroScene` (mouse lean), `Story` (which step is active), `InView` and `Tilt` (small helpers), `MotionToggle`, `ImpactExplorer`, `ThemeToggle` and `Reveal`.

All animation is HTML, SVG and CSS (`motion/motion.module.css`); there is no canvas and no animation library, so everything stays sharp at any size. Graph positions and paths for the small maps are pure data in `motion/geometry.ts`.

## Sample data

Every graph on the page is the same **sample system**, labelled as such. It mirrors `backend/examples/commerce-system/compose.yaml`: 8 services and 7 dependencies (`graph.ts`). An arrow `A -> B` means A depends on B, the same convention as the topology page.

`analyzeImpact` in `graph.ts` walks the dependencies in reverse (breadth first, safe on cycles) and returns direct dependents, indirect dependents and the longest chain. For `payment-service` that is `order-service` (direct) and `api-gateway`, `web-frontend` (indirect). Results are worded as "potentially affected", never as a prediction. The function is pure and has no React dependency.

## Theme

Three choices: **Auto**, **Light**, **Dark**.

- Auto shows Light from 07:00 (inclusive) to 19:00 (exclusive) in the visitor's local time and Dark otherwise. The hours are `LIGHT_FROM_HOUR` and `LIGHT_UNTIL_HOUR` in `theme.ts`. The page re-checks on load, every 60 seconds and when the tab becomes visible again, so a page left open flips at the boundary.
- Light and Dark are stored in `localStorage` under `dp-landing-theme`. Auto is the absence of the key. Storage errors (private mode, blocked storage) are caught; the choice then lasts for the visit.
- A small inline script in `<head>` (generated from `theme.ts`, so its rule cannot drift from `resolveTheme`) sets `data-landing-pref` and `data-landing-theme` on `<html>` before the first paint. There is no flash of the wrong theme, and the selected toggle segment is styled from the same attribute, so it is correct before hydration. `<html>` carries `suppressHydrationWarning` because those attributes exist only on the client's copy.
- A visible theme change crossfades with the View Transitions API where it exists, and is instant for visitors who prefer reduced motion.
- The theme applies to every page, not only the landing page: the same script and `ThemeToggle` serve `/signin` and the signed-in app (the switch sits in the app header), so a choice made on one page holds on the others. The Keycloak login theme follows the same rule with its own copy of the script; Keycloak runs on another origin, so it keeps its own stored choice. The tokens are described in [design-system.md](design-system.md).

## Motion

- Loops pause while their section is off screen, and the **Pause animations** button in the hero freezes every animation on the page (it sets `data-motion="paused"` on the page root).
- The resting style of every animated element is a meaningful final state; keyframes only describe how it gets there. With `prefers-reduced-motion: reduce` all animation is removed and the page shows each story frozen at its most telling moment: the plates apart with the incident on the map, the typed file, the saved list, the drawn map and the incident with its potentially affected services. The pause button and the mouse lean are off in that mode.
- Hover effects apply only on devices with a fine pointer that can hover.

## Accessibility

- Status is never colour alone. Points carry a shape (check, filled triangle, hollow triangle) and a word in the box above them ("OK", "degraded", "potentially affected"), and every scene has a caption in plain text.
- The decorative scenes are hidden from assistive technology; the hero picture has a text alternative and the story steps carry the same content as text.
- The explorer graph is a group of buttons (`aria-pressed`, label "service, state") that work with Tab, Enter and Space. A polite live region announces the result of each selection.
- There is a skip link, one `h1` with heading levels that never skip, landmarks, and visible `:focus-visible` outlines.

## Typography

Geist and Geist Mono load through `next/font/google`, so they are downloaded **at build time** and served from the app's own origin. The build machine therefore needs internet access. If that is a problem, download the font files into the repository and switch `fonts.ts` to `next/font/local`; nothing else changes. System font stacks are the fallback while the fonts load. The Keycloak login theme cannot use `next/font`, so it bundles the two fonts as woff2 files (`infra/keycloak/themes/hydra/login/resources/fonts/`). Tokens and sizes are in `docs/design-system.md`.

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
- Sample system: `SERVICE_IDS`, `DEPENDENCIES` and `COMPOSE_EXCERPT` in `graph.ts`. A new service also needs a position in both layouts in `motion/geometry.ts` and in `LAYOUTS` for the explorer.
- Timings: the keyframes in `motion/motion.module.css`. The hero loop length is `--loop` on `.heroVisual`; the incident scene runs on an 8-second loop.
- Auto hours: `theme.ts`.
- Colours, radii and easing: the `--lp-*` tokens at the end of `globals.css` (including the accent and status colours).
