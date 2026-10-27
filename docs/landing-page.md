# Landing page

The public page at `/` introduces Hydra and sends visitors to the workspace. It is frontend only: no API calls, no backend changes and no new npm packages. Signed-in pages are unchanged; their header moved from `app/layout.tsx` to `app/projects/layout.tsx` so it no longer appears on the landing page.

## Run it

With Docker, rebuild the web image and open <http://localhost:3000>:

```powershell
docker compose up --build frontend
```

For quick changes, run only the web app (the landing page needs no backend):

```powershell
cd frontend/web
npm ci
npm run dev
```

Before a pull request, run `npm run lint`, `npm run typecheck` and `npm run build`.

## Files

| File | Purpose |
| --- | --- |
| `src/app/page.tsx` | The page: navigation, hero, how it works, what you get, final call to action, footer. |
| `src/components/landing/LiveMap.tsx` | The hero: the live map of the demo system, its demo cursor, the status line and the controls (Reset, Pause). |
| `src/components/landing/mapModel.ts` | What the map shows: the eight services and seven dependencies of the Commerce demo, where each sits, and which services are potentially affected when any of them fails. Pure data and functions. |
| `src/components/landing/mapEngine.ts` | What moves: a small spring simulation (dragging, the pointer, a slow breath), the requests flowing along each dependency and the pulses a failure or a recovery sends along them. Writes straight to the DOM in one frame loop. |
| `src/components/landing/LiveMap.module.css`, `Landing.module.css` | Styles (CSS modules). |
| `src/components/landing/theme.css`, `theme.ts`, `ThemeSwitch.tsx` | Light and dark tokens, the pre-paint theme script and the switch. |
| `src/components/landing/fonts.ts`, `fonts/` | Self-hosted fonts and their licences. |

## How the hero behaves

The hero is a live map of the Commerce demo that ships with Hydra (`DemoSeed.cs`): `web`, `gateway`, `orders`, `payments`, `stripe`, `orders-db`, `rabbitmq` and `notifier`. It is meant to catch the eye within two seconds and then hand itself over to the visitor.

1. **First paint.** A `compose.yaml` chip appears and the eight services burst out of it to their places. This is plain CSS, so it moves before any JavaScript has loaded.
2. **About 0.9 s.** Requests start to flow along every dependency and a demo cursor sets off. Its timing is read from the burst itself, so it follows however late the page painted.
3. **About 1.7 s.** The cursor breaks `payments`: it turns red, two rings leave it, and the failure travels back along the dependencies, one hop at a time, marking `orders`, `gateway` and `web` as Potentially affected. Services the failure cannot reach step back. The status line counts along, and the full stop of "One live map." turns red.
4. The cursor fixes it again (the recovery travels back in ink), then breaks something deeper (`stripe`, four hops) and something that branches (`rabbitmq`). It keeps going until a visitor takes over.

Visitors take over the moment they move the mouse over the map, touch it or Tab into it:

- **Point at a service** (or focus it with the keyboard) to preview what it would affect: dashed rings and dashed dependencies, and "If orders-db fails, 3 services would be potentially affected".
- **Press a service** to break it, press it again to fix it. Several services can be broken at once. Reset makes everything healthy again. Screen readers hear each result ("rabbitmq is unhealthy. 4 services potentially affected: orders, notifier, gateway, web.").
- **Drag a service** and let go: its neighbours follow and everything springs back.
- The map also leans slightly towards a mouse pointer, nearer services a little more.

Details:

- **Pause** stops everything that moves by itself: the flow, the slow breath, the live dot and the demo cursor. Visitors' own actions still work.
- **Reduced motion:** nothing moves by itself. The map shows one failure as a still frame (`payments` and what it potentially affects), pressing a service shows its full result at once, and dragging is off.
- **Without JavaScript** the map is a still picture of the healthy system; the services cannot be pressed and the controls are hidden.
- The frame loop runs only while the map is on screen and the tab is visible, and stops by itself once everything has settled.
- Every status has a word and an icon, never colour alone. The wording is always "potentially affected". On small maps the labels next to services become icons and a legend under the map spells them out.
- Layout: from 1080px the words sit on the left and the map on the right; below that the map comes straight after the headline. Either way the map is on the first screen. The map keeps an 11:10 aspect ratio and is never taller than the screen allows.
- The failure timing (`HOP_MS`) lives in `mapModel.ts`; failures are stored as timestamps, so how far one has travelled is always derived from the clock.

## Theme

Visitors can choose Auto, Light or Dark. Auto follows the daylight outside: light between an approximate sunrise and sunset for mid-latitudes, dark otherwise, re-checked every minute. The choice is stored in `localStorage` under `hydra-theme`. A small script in `app/layout.tsx` applies it before the first paint. Without JavaScript the page follows the system setting. For now only the landing page uses these tokens.

## Links

"Open workspace" goes to `/projects`. "Explore the demo" goes to the seeded Commerce demo topology, `/projects/10000000-0000-0000-0000-000000000001/topology` (the ID from `DemoSeed.cs`); change `DEMO_HREF` in `page.tsx` if the demo moves.

## Fonts

`HydraSans-Variable.woff` is a Latin subset of Mona Sans, renamed because "Mona" is a Reserved Font Name. `JetBrainsMono-Variable.woff` is a Latin subset of JetBrains Mono and is used only for code and file names. Both are SIL Open Font License 1.1; see `fonts/OFL.txt`.
