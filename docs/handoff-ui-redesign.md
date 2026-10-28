# Handoff: redesign of the signed-in app and the Keycloak login

A working note for whoever continues this task (another Claude session or a teammate). Delete it when the redesign is finished.

## The request

Sema asked for three things, all in the Hydra design language of the landing page (`docs/design-system.md`, section "Design language"). The work is **frontend only**: no backend changes.

1. The Keycloak login page (`http://keycloak.localhost:8080/realms/devops/protocol/openid-connect/auth?...`). Today it is the stock keycloak.v2 theme with the header "DEVOPS".
2. `/projects`.
3. The project workspace `/projects/{id}` and every tab under it: boards, components, environments, topology, compare, events, deployments, integrations, settings.

## Status

| Part | Status |
| --- | --- |
| Tokens, fonts, app shell (header with theme switch, avatar, sign out) | Done |
| Project frame: breadcrumb and tab bar in `app/projects/[projectId]/layout.tsx` (stays put between tabs) | Done |
| `/projects`, `/projects/new`, `/projects/import` | Done |
| Overview (health summary, live map, stats, feeds) | Done |
| Topology (new layout, curved edges with arrows, legend, detail panel, impact view) | Done |
| Boards (board, backlog, drawer), components, environments, compare, events, deployments, settings, integrations | Done |
| Keycloak login theme | Done: `infra/keycloak/themes/hydra`, see `docs/authentication.md` ("Login theme") |
| Check of every page in Light, Dark and at phone width, with fixes | Done (commit "polish the signed-in pages") |
| Environments page: each environment's recorded health | Done |
| Docs: design-system.md, landing.md, topology-v2.md, README | Done |
| `npm run typecheck`, `npm run lint`, `npm run build` | All three passed on Sema's machine on 28 October 2026, before the live map was redone as design В; run them again |

## What changed and where

- `src/app/globals.css`: one set of `--lp-*` tokens for every page. New tokens: `--lp-warn` and `--lp-warn-soft` (degraded health, warnings), `--lp-bad-ink` (red text on the soft red tint), `--lp-violet`, `--lp-tag-blue` (+ soft variants, tag colors), `--lp-shadow-card`, `--lp-shadow-pop`. The Version 2 `--color-*` names remain as aliases of the new tokens so old code keeps working. The global `button`/`input` styles were removed from globals.css; the landing and sign-in pages were checked and render pixel-identical.
- `src/app/layout.tsx`: the Geist font variables are on `<html>` now.
- `src/app/projects/app.css` (new): all styles of the signed-in pages. It keeps the old global class names (`.panel`, `.list-row`, `.button.primary`, ...) and adds new building blocks (`.page-head`, `.status-pill`, `.tile`, `.stat`, `.feed`, `.chip`, `.seg`, `.search-field`, `.notice`, `.project-card`, `.ov-status`, `.map-preview`, `.graph-node`, `.work-card`, `.env-card`, ...). Dark mode comes from the tokens.
- `src/app/projects/layout.tsx`: new header (Brand linking to /projects, ThemeToggle, avatar with initials, Sign out).
- `src/app/projects/[projectId]/layout.tsx` (new, client): breadcrumb + `ProjectNav`. Pages no longer render the nav themselves.
- `src/components/app/` (new): `PageHead`, `Status` (StatusGlyph, StatusPill, HealthPill, SeverityPill, DeploymentPill), `Notice`, `Stat`, `MapPreview`.
- `src/components/ProjectNav.tsx`: pill tab bar with icons, grouped (Project, Plan, Model, Operate, Connect, Admin). The `active` prop is now a tab key from `lib/projectNav.ts`.
- `src/lib/status.ts` (new): how a status looks (tone + glyph + word) for health, severity, deployments, work states. In the app, **Degraded is amber** (`--lp-warn`), Unhealthy red, Unknown a hollow circle; "potentially affected" stays red with a dashed outline, as on the landing page.
- `src/lib/format.ts` (new): dates, initials, metrics. `src/lib/projectNav.ts` (new): the tabs and which one is active.
- `src/lib/graph.ts`: new `layoutTopology` (every arrow points down, cycles are safe, children sit under their parents), `mapTopology` now draws curved edges with arrowheads, encodes the dependency source as solid / dashed / dotted lines, highlights the impact path, and gives nodes an initial size so the minimap works (it was always empty before). `liveMap` makes the overview's live map.
- `src/components/TopologyWorkspace.tsx`: rebuilt UI; same data flow and SSE handling. New: clicking the empty canvas clears the selection, a close button on the detail panel, related components are clickable, and `?componentId=` preselects a component (used by the overview's attention list).
- `src/components/landing/Icon.tsx`: more Lucide icons. `Brand.tsx`: optional `href`.
- Later: `src/components/app/HealthBar.tsx` (`HealthBar`, `HealthLegend`, shared by the overview and the environment cards); environment cards with recorded health; `.stack-table` (tables become cards on a phone, cells carry `data-label`); `ProjectNav` scrolls the current tab into view; `infra/keycloak/themes/hydra` (Keycloak login theme); the overview's live map, design В of three options Sema chose from (`MapPreview`, `liveMap` and `failureHops` in `lib/graph.ts`, `lib/componentTypes.ts`).

## How it was checked

- On Sema's machine with the repository's own toolchain: `npm run typecheck`, `npm run lint` and `npm run build` passed before the live map was redone as design В. The new map passed the strict TypeScript check here.
- A browser harness (esbuild + Playwright, React Flow 12.11.6 and zustand 4.5.7 built from their GitHub sources) rendered every page with sample data shaped like `DemoSeed.cs`, in Light and Dark at 1440 and 390 px, plus 768 and 375 px for the main pages, and the empty, viewer and unhealthy variants. No console errors and no horizontal scroll. The overview's live map was also checked frame by frame, with its animations stopped at set times through the Web Animations API, and with reduced motion.
- Strict TypeScript (TypeScript 6.0, the closest version available offline; the repository uses 5.9) over all of `frontend/web/src` with the real React types from DefinitelyTyped and stand-ins for Next.js and Auth.js: no errors and no unused code in Hydra files.
- The Keycloak theme ran on a real Keycloak 26.6.3 with the realm imported from the same folder layout as `compose.yaml`: sign-in, wrong password, password update, authenticator setup, forgot password, sign-out and error pages, Light, Dark and Auto, 1440 and 390 px.
- The harness lived in the sandbox and is not in the repository.

## Next steps, in order

1. Run `npm run typecheck`, `npm run lint` and `npm run build` again (the live map changed).
2. Look at the pages once against the real API (Docker) in both themes.
3. Switch the existing local realm to the login theme: Keycloak admin console, realm `devops`, Realm settings, Themes, Login theme = `hydra`, Save.
4. When all of that is done, delete this note.

## Working with Sema

Windows, PowerShell 5.1 (no `&&`, give one command per line), VS Code, Docker Desktop. She runs Postgres, Keycloak and the API in Docker and `npm run dev` locally. Push to `feature/ui-redesign` when a part is finished, so she can see it; never rewrite history. Send screenshots and keep explanations short.
