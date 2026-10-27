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
| `src/components/landing/HeroStory.tsx` | The hero animation, its controls (pause, play from a step) and the clickable map. |
| `src/components/landing/story.ts` | Everything the animation shows: the `compose.yaml`, six services, their dependencies, the timeline, and which services are potentially affected when any one of them fails. Pure data and functions, shared by the story and by visitors' clicks. |
| `src/components/landing/Story.module.css`, `Landing.module.css` | Styles (CSS modules). |
| `src/components/landing/theme.css`, `theme.ts`, `ThemeSwitch.tsx` | Light and dark tokens, the pre-paint theme script and the switch. |
| `src/components/landing/fonts.ts`, `fonts/` | Self-hosted fonts and their licences. |

## How the animation behaves

The story loops in about 22 seconds, one idea at a time:

1. **Write.** `compose.yaml` is typed line by line; the current line is softly highlighted.
2. **Save.** One reading pass goes over the file and picks out each service name.
3. **Map.** Each picked name lifts out of the file and flies to its point on the map (Web Animations API). Every dependency is drawn once both of its services have landed, and its `depends_on` line lights up in the file at the same moment.
4. **Health.** The points fill in and every badge turns OK; the tick is drawn.
5. **Fail.** `payments` becomes Unhealthy: two thin rings leave it once, a soft red glow sits behind it, the map leans in slightly towards it, and the services it cannot affect (`catalog`, `db`) fall out of focus. The failure travels along the dependencies, one hop at a time, and marks `orders`, `api` and `web` as Potentially affected.
6. **Recover.** The recovery travels back the same way in ink, clearing one hop at a time. Then it loops.

Visitors can also break any service themselves: tap or click a point on the map (or Tab to it and press Enter) to see what depends on it, press it again to restore it, or press another one to move the failure. "Play story" goes back to the story. Screen readers hear the result ("db is unhealthy. 4 services potentially affected: orders, catalog, api, web.").

While a failure is on screen, the full stop of the headline "One live map." turns red.

- The server renders a still frame: the failure and what it potentially affects. That is what visitors see without JavaScript and with reduced motion. Without JavaScript the controls are hidden and the services cannot be pressed.
- With motion allowed, the story starts from the still frame and plays while it is on screen. It pauses when scrolled away or when the tab is hidden.
- A Pause button and six step buttons sit under the animation. Pause stops the clock, the flights and the CSS animations; short transitions finish.
- With reduced motion the story stays still until the visitor presses Play. Nothing flies, scales, blurs or ripples; changes fade. Breaking a service shows its full result at once.
- The stage tilts slightly as it scrolls into view (CSS scroll timeline, where supported) and follows a mouse or trackpad by a few degrees. Touch devices and reduced motion get neither.
- Every status has text and an icon, never colour alone. The wording is always "potentially affected".
- Layout comes from the stage's own width: file and map side by side from 1080px, one after the other below that (the file dissolves into the map), and a top-to-bottom map below 600px.
- The flight timing (`FLY_LEAD_MS`, `FLY_STAGGER_MS`, `FLY_MS`) and the recovery step (`HEAL_STEP_MS`) live in `story.ts` and reach the CSS as custom properties, so the script and the styles cannot drift apart.

## Theme

Visitors can choose Auto, Light or Dark. Auto follows the daylight outside: light between an approximate sunrise and sunset for mid-latitudes, dark otherwise, re-checked every minute. The choice is stored in `localStorage` under `hydra-theme`. A small script in `app/layout.tsx` applies it before the first paint. Without JavaScript the page follows the system setting. For now only the landing page uses these tokens.

## Links

"Open workspace" goes to `/projects`. "Explore the demo" goes to the seeded Commerce demo topology, `/projects/10000000-0000-0000-0000-000000000001/topology` (the ID from `DemoSeed.cs`); change `DEMO_HREF` in `page.tsx` if the demo moves.

## Fonts

`HydraSans-Variable.woff` is a Latin subset of Mona Sans, renamed because "Mona" is a Reserved Font Name. `JetBrainsMono-Variable.woff` is a Latin subset of JetBrains Mono and is used only for code and file names. Both are SIL Open Font License 1.1; see `fonts/OFL.txt`.
