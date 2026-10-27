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
| `src/components/landing/HeroStory.tsx` | The hero animation and its controls (pause, play from a step). |
| `src/components/landing/story.ts` | Everything the animation shows: the `compose.yaml`, six services, their dependencies, the timeline, and which services are potentially affected. |
| `src/components/landing/Story.module.css`, `Landing.module.css` | Styles (CSS modules). |
| `src/components/landing/theme.css`, `theme.ts`, `ThemeSwitch.tsx` | Light and dark tokens, the pre-paint theme script and the switch. |
| `src/components/landing/fonts.ts`, `fonts/` | Self-hosted fonts and their licences. |

## How the animation behaves

The story loops in about 21 seconds: the file is typed, read and saved, six points appear marked Saved, then OK. `payments` becomes Unhealthy, and the services that depend on it (`orders`, `api`, `web`) are marked Potentially affected one hop at a time; `catalog` and `db` stay OK. Then it recovers.

- The server renders a still frame: the failure and what it potentially affects. That is what visitors see without JavaScript and with reduced motion.
- With motion allowed, the story starts from the still frame and plays while it is on screen. It pauses when scrolled away or when the tab is hidden.
- A Pause button and six step buttons sit under the animation. With reduced motion the animation stays still until the visitor presses Play.
- The stage tilts slightly as it scrolls into view (CSS scroll timeline, where supported) and follows a mouse or trackpad by a few degrees. Touch devices and reduced motion get neither.
- Every status has text and an icon, never colour alone. The wording is always "potentially affected".
- Layout comes from the stage's own width: file and map side by side from 1080px, one after the other below that, and a top-to-bottom map below 600px.

## Theme

Visitors can choose Auto, Light or Dark. Auto follows the daylight outside: light between an approximate sunrise and sunset for mid-latitudes, dark otherwise, re-checked every minute. The choice is stored in `localStorage` under `hydra-theme`. A small script in `app/layout.tsx` applies it before the first paint. Without JavaScript the page follows the system setting. For now only the landing page uses these tokens.

## Links

"Open workspace" goes to `/projects`. "Explore the demo" goes to the seeded Commerce demo topology, `/projects/10000000-0000-0000-0000-000000000001/topology` (the ID from `DemoSeed.cs`); change `DEMO_HREF` in `page.tsx` if the demo moves.

## Fonts

`HydraSans-Variable.woff` is a Latin subset of Mona Sans, renamed because "Mona" is a Reserved Font Name. `JetBrainsMono-Variable.woff` is a Latin subset of JetBrains Mono and is used only for code and file names. Both are SIL Open Font License 1.1; see `fonts/OFL.txt`.
