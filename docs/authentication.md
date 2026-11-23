# Authentication and project access

Version 2 uses Keycloak as an external OpenID Connect provider. Auth.js handles authorization code with PKCE for the Next.js web app. It stores the provider access and refresh tokens inside an encrypted HttpOnly session cookie; browser code sees only the user session. A Next.js route handler forwards `/api/*` requests to the ASP.NET API with the access token, including the event stream. Its server-only Auth.js callback refreshes expired access tokens and never exposes them through the public session endpoint. The API validates JWT signature, issuer, audience (`devops-api`), and expiration using Keycloak discovery keys.

If Keycloak rejects a refresh token, protected pages redirect to sign-in and browser API calls do the same on 401. The session callback never publishes the access token to the public session endpoint.

The local `UserProfile` key is `(Issuer, ExternalSubject)`. Email and display name can change without changing ownership. Project membership is stored as `ProjectMember` with Owner, Contributor, or Viewer roles. A creator receives Owner membership. Viewers can read, Contributors can also change project operational data, and Owners can update/archive a project and add members. Every project-scoped API route, including component-only and development simulation routes, checks membership. A user's project list contains only their projects. Health endpoints and the development OpenAPI document remain public.

The deterministic Commerce Demo has no hard-coded user identity. The first authenticated user to list projects claims it as Owner if it has no members. For non-demo projects imported from V1, an administrator must assign members through a controlled migration or the database; they are never silently given to an unrelated new identity. The `Private` and `Internal` values are stored now; both require explicit membership in this slice.

An Owner can add someone who has already signed in using the Settings page and their email address. The API resolves the email only within the Owner's issuer and rejects ambiguous matches. Contributors and Viewers can read the member list, but only Owners can add members. The deterministic demo work actor has no project membership or sign-in capability.

## Local setup

1. Copy `.env.example` to `.env` and replace `AUTH_SECRET` with a random secret of at least 32 bytes. Change local Keycloak admin credentials for shared environments.
2. Run `docker compose up --build`. Open `http://keycloak.localhost:8080/admin/`, log into the master realm with the `.env` admin credentials, and create a user in the imported `devops` realm. Set a password in the user's Credentials tab.
3. Open `http://localhost:3000/signin` and sign in. The imported `devops-web` client has the callback `http://localhost:3000/api/auth/callback/keycloak` and an audience mapper for `devops-api`.

`keycloak.localhost` resolves to loopback in browsers and to the Keycloak service through a Compose network alias. If the local resolver does not map it to loopback, add a local hosts entry for `127.0.0.1 keycloak.localhost`. The Keycloak realm import is development-only and includes a throwaway local client secret; use separately managed clients and HTTPS issuer URLs outside local development.

For separate processes, set `Oidc__Issuer=http://keycloak.localhost:8080/realms/devops` and `Oidc__Audience=devops-api` on the API. Set `AUTH_URL=http://localhost:3000`, `AUTH_SECRET`, `AUTH_KEYCLOAK_ID=devops-web`, `AUTH_KEYCLOAK_SECRET=devops-local-only`, `AUTH_KEYCLOAK_ISSUER=http://keycloak.localhost:8080/realms/devops`, and `API_INTERNAL_URL=http://localhost:5000` on Next.js. The API and web app must use the same issuer identity, and the web client must receive an access token with the `devops-api` audience.

For `npm run dev`, `npm run setup:local` (in `frontend/web`) writes these Next.js settings to `.env.local` with a freshly generated `AUTH_SECRET`; see `.env.local.example`. Without `AUTH_SECRET` Auth.js stops with `MissingSecret` and sign-in returns a server error.

## Login theme

Keycloak shows its own pages (sign in, password update, authenticator setup, sign-out, errors) in the **hydra** login theme in `infra/keycloak/themes/hydra`. It is Keycloak's keycloak.v2 theme from Keycloak 26.6.3 with the page frame of `/signin`: the Hydra brand and an Auto, Light and Dark switch on top, the form on the left and the services orbiting Hydra on the right. The realm name is not shown.

- `login/template.ftl` is keycloak.v2's template with that frame. Keycloak's forms, fields, ids and scripts are unchanged.
- `login/resources/css/hydra.css` copies the `--lp-*` tokens from `globals.css` and points PatternFly's variables at them, so Keycloak's own components follow both themes. Change it together with `globals.css` and `signin.module.css`.
- `login/resources/js/hydra-theme.js` uses the same rule as the web app: Auto is light from 07:00 to 19:00 local time. Keycloak runs on another origin, so it keeps its own stored choice. When the realm's **Dark mode** switch (Realm settings, Themes) is off, the page stays light and hides the switch.
- `login/messages/messages_en.properties` sets the Hydra texts ("Sign in to Hydra", "Sign in", sentence case) and the texts of the frame.
- Geist and Geist Mono are bundled as woff2 files under the SIL Open Font License (`login/resources/fonts/OFL.txt`), so the page makes no requests to other sites.

`compose.yaml` mounts the folder into the Keycloak container. `start-dev` does not cache themes, so a change shows on the next page load. A fresh realm import selects the theme through `"loginTheme": "hydra"` in `devops-realm.json`. A realm that already exists keeps its theme until you switch it: open `http://keycloak.localhost:8080/admin/`, choose the `devops` realm, then **Realm settings**, **Themes**, **Login theme** = `hydra`, **Save**.

## Sign-in page and errors

`/signin` is server-rendered on every request. It starts the Keycloak sign-in with a server action, so the password is only ever entered on Keycloak. Auth.js sends every sign-in error back to `/signin?error=<code>` (`pages.error` in `src/auth.ts`) instead of its generic error page, and the page explains it in plain words (`src/lib/authSettings.ts`):

- If `AUTH_SECRET`, `AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_SECRET` or `AUTH_KEYCLOAK_ISSUER` is missing, the button is disabled. In development the page names the missing settings and the command that creates them; in production it only says that sign-in is unavailable.
- `Configuration` and `OAuthSignInError` usually mean Keycloak could not be reached. In development the page shows the issuer it tried and the hosts-file tip for `keycloak.localhost`.
- `AccessDenied` and `SessionRequired` get their own messages; anything else gets a generic "try again".

Only setting names are ever shown, never values. After sign-in the visitor goes to `/projects`, or to a same-site `callbackUrl` if one was given.

## Checks

The backend integration tests use an isolated test authentication scheme to verify 401 for anonymous requests, cross-project 403, viewer read access, and role-based write denial. A Compose smoke test on 2026-09-23 verified Keycloak discovery, the PKCE redirect, browser sign-in, the authenticated project list, and the existing Commerce Demo overview. The additive `OidcOwnership` migration was applied to both fresh and V1-upgraded PostgreSQL databases.
