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
| Overview (health summary, map preview, stats, feeds) | Done |
| Topology (new layout, curved edges with arrows, legend, detail panel, impact view) | Done |
| Boards (board, backlog, drawer), components, environments, compare, events, deployments, settings, integrations | Done |
| Keycloak login theme | **Not started.** Plan below |
| Docs: design-system.md, landing.md | **Not updated yet.** List below |
| `npm run lint`, `npm run typecheck`, `npm run build` | **Not run** (the sandbox could not install npm packages) |

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
- `src/lib/graph.ts`: new `layoutTopology` (every arrow points down, cycles are safe, children sit under their parents), `mapTopology` now draws curved edges with arrowheads, encodes the dependency source as solid / dashed / dotted lines, highlights the impact path, and gives nodes an initial size so the minimap works (it was always empty before). `miniMap` makes the overview's map preview.
- `src/components/TopologyWorkspace.tsx`: rebuilt UI; same data flow and SSE handling. New: clicking the empty canvas clears the selection, a close button on the detail panel, related components are clickable, and `?componentId=` preselects a component (used by the overview's attention list).
- `src/components/landing/Icon.tsx`: more Lucide icons. `Brand.tsx`: optional `href`.

## How it was checked

- A browser harness (esbuild + Playwright, React Flow built from its GitHub source at `@xyflow/react@12.11.6`) rendered every page with sample data shaped like `DemoSeed.cs`: Light at 1440 px for all pages, Dark at 1440 and 375 px for overview, topology and boards. No console errors (only React Flow's own dev warning about the hidden attribution, which was there before) and no horizontal scroll.
- Strict TypeScript over `src/app`, `src/components` and `src/lib` with stubs for Next and Auth.js: no errors in Hydra files.
- The harness lived in the sandbox and is not in the repository.

## Next steps, in order

1. On a machine with npm: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build` in `frontend/web`, then look at every tab in Light and Dark and on a phone width. Fix what looks off.
2. Keycloak login theme (the plan that was ready):
   - `infra/keycloak/themes/hydra/login/theme.properties` with `parent=keycloak.v2`, `import=common/keycloak`, `styles=css/styles.css css/hydra.css`.
   - Override `template.ftl` (copy it from the keycloak.v2 theme of Keycloak **26.6.3**, `lib/lib/main/org.keycloak.keycloak-themes-26.6.3.jar`, path `theme/keycloak.v2/login/template.ftl`) for a split layout like `/signin`: Hydra brand and a theme switch on top, the form card on the left, an inverse panel with the orbit of services on the right. Do not print the realm name; use the Hydra brand.
   - `messages/messages_en.properties`: `loginAccountTitle=Sign in to Hydra`, `loginTitle=Sign in · Hydra`, `doLogIn=Sign in`.
   - Theme: the same Auto/Light/Dark rule as `src/components/landing/theme.ts` (Keycloak runs on another origin, so it keeps its own stored choice), and also toggle the `pf-v5-theme-dark` class so PatternFly inputs follow.
   - Fonts: bundle Geist woff2 files (OFL, github.com/vercel/geist-font) in the theme resources.
   - `compose.yaml`: mount `./infra/keycloak/themes/hydra:/opt/keycloak/themes/hydra:ro` into the keycloak service (start-dev does not cache themes).
   - `infra/keycloak/devops-realm.json`: `"loginTheme": "hydra"` (only applies to a fresh import).
   - Existing local realms: Keycloak admin console, realm `devops`, Realm settings, Themes, Login theme = `hydra`, Save.
3. Environments page: show each environment's recorded health (fetch its topology; reuse the health bar and `healthHeadline`).
4. Docs: in `docs/design-system.md` add the new tokens, the app building blocks, the app's status table (Degraded amber) and update the roll-out section; in `docs/landing.md` the sentence "The theme applies to the landing page only" is no longer true; mention `docs/topology-v2.md` if the layout description there needs the new layered layout.

## Working with Sema

Windows, PowerShell 5.1 (no `&&`, give one command per line), VS Code, Docker Desktop. She runs Postgres, Keycloak and the API in Docker and `npm run dev` locally. Commit and push only when she asks, to `feature/ui-redesign`, never rewrite history. Send screenshots and keep explanations short.
