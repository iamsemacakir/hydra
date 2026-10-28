# Hydra

Version 3 is being implemented in vertical slices from `AGENTS_V3.md`. The first slice adds persisted read-only repository scans, Docker Compose discovery, preview and apply, reconciliation, dependency evidence, and edge inspection. Open `/projects/import` to try the bundled Commerce System source; see [docs/discovery.md](docs/discovery.md), [docs/security.md](docs/security.md), and [docs/demo.md](docs/demo.md). Remote Git and Azure DevOps connections are not enabled yet. Board tickets can be dragged between state columns, with the Move menu retained for keyboard use.

Version 2 implementation follows [AGENTS_V2.md](AGENTS_V2.md). The incremental slices cover the visual palette, persisted projects, OIDC authentication and ownership, work items, the board, operational links, topology comparisons, and project administration. The light visual tokens are documented in [docs/design-system.md](docs/design-system.md). The public landing page and its Auto/Light/Dark theme are described in [docs/landing.md](docs/landing.md). Existing Version 1 operational features remain available.

Projects can now be created at `/projects/new`. They persist in PostgreSQL, start empty, and can be updated or archived through the API. The additive `ProjectPersistence` migration backfills unique slugs for existing Version 1 projects and keeps the Commerce Demo ID and slug stable. See [docs/api.md](docs/api.md) for the project endpoints.

OIDC sign-in and project ownership are now required for `/api/*` and `/projects/*`. See [docs/authentication.md](docs/authentication.md) for Keycloak setup, account creation, local process variables, and role rules.

Work-item CRUD, filtering, assignment, state history, and iteration APIs are documented in [docs/work-items.md](docs/work-items.md).
The board is available from each project at `/projects/{projectId}/boards`; see [docs/boards.md](docs/boards.md) for card actions, backlog filters, and tags.
Work items can now link to project components. Topology component details show active linked work, and the project overview merges work activity with operational events. See [docs/operational-integration.md](docs/operational-integration.md).
Topology filters, dependency provenance comparison, and an environment comparison table are described in [docs/topology-v2.md](docs/topology-v2.md).
Project Components, Environments, and Settings pages and the expanded Commerce Demo are described in [docs/hardening.md](docs/hardening.md).
The solo Version 2 delivery record is in [docs/iteration-plan-v2.md](docs/iteration-plan-v2.md).

Hydra is a diploma MVP for viewing a distributed system as one operational topology. It joins project and environment metadata, components and declared dependencies, deployment history, current runtime state, and operational events. Reverse dependency traversal shows which components may be affected by a failure.

The repository is a monorepo. The API is an ASP.NET Core 10 modular monolith with Domain, Application, Infrastructure, Persistence, and API projects. PostgreSQL stores the model; an in-memory SSE bus pushes live updates to a Next.js/React Flow UI. The bus is suitable for one API instance.

## Prerequisites

- .NET 10 SDK and Node.js 22 with npm for separate processes
- PostgreSQL 17, or Docker with Compose for the full stack

## Docker Compose

1. Copy `.env.example` to `.env`, set a random `AUTH_SECRET` of at least 32 bytes, and change local admin credentials for shared environments.
2. Run `docker compose up --build`.
3. Create a user in the imported `devops` realm at <http://keycloak.localhost:8080/admin/>. Open <http://localhost:3000/signin>. API: <http://localhost:5000>. Development OpenAPI document: <http://localhost:5000/openapi/v1.json>.

The Development API applies the checked-in EF migrations and seeds Commerce Demo on first start. PostgreSQL data persists in the `postgres_data` volume. Run `docker compose down` to stop; adding `-v` also removes demo data.

## Separate processes

Start PostgreSQL with a database named `devops_platform` and a user with access to it. Then:

Start Keycloak with the imported `devops` realm as described in [docs/authentication.md](docs/authentication.md), and create a local user.

```powershell
$env:ConnectionStrings__Postgres = 'Host=localhost;Port=5432;Database=devops_platform;Username=devops;Password=devops_local'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:Oidc__Issuer = 'http://keycloak.localhost:8080/realms/devops'
$env:Oidc__Audience = 'devops-api'
dotnet run --project backend/src/DevOpsPlatform.Api --urls http://localhost:5000
```

In another terminal:

```powershell
cd frontend/web
npm ci
npm run setup:local
npm run dev
```

`npm run setup:local` creates `frontend/web/.env.local` from `.env.local.example`: the local Keycloak client, the API address and a random `AUTH_SECRET`. Next.js reads that file on every `npm run dev`, so nothing has to be set per terminal. The file is ignored by Git and by Docker builds; running the command again only fills in what is missing.

### Web app only, everything else in Docker

The quickest way to work on the web app: start PostgreSQL, Keycloak and the API in Docker (this needs the root `.env` from the Docker Compose steps), then run Next.js on your machine.

```powershell
docker compose up -d postgres keycloak backend
cd frontend/web
npm run setup:local
npm run dev
```

Open <http://localhost:3000/signin>. If sign-in cannot start, the sign-in page says why: in development it names any missing setting and checks that Keycloak can be reached at `http://keycloak.localhost:8080`. If your computer does not resolve `keycloak.localhost`, add `127.0.0.1 keycloak.localhost` to its hosts file.

To apply migrations explicitly (required outside Development), set `ConnectionStrings__Postgres` and run:

```powershell
dotnet ef database update --project backend/src/DevOpsPlatform.Persistence --startup-project backend/src/DevOpsPlatform.Api
```

No production migration runs automatically. Configure `FrontendOrigin` for the web origin. Secrets belong in environment variables or a development secret store, not Git.

## Demo workflow

1. Sign in, then open Commerce Demo → Production → Topology.
2. Select Payment Service. Its seeded health is Degraded; inspect metrics, version, dependencies, events, and deployments.
3. Click **Analyze potential impact**. Order Service is direct; API Gateway and Web Frontend are indirect.
4. With `NEXT_PUBLIC_ENABLE_DEMO=true` and the API in Development, click **Restore health**, then **Simulate degradation**. The node and recent events update through SSE without a page reload.

For the Version 2 planning-to-operations flow, open Commerce Demo → Boards, create a Bug, assign it, move it to Active, and link Payment Service. Then open Topology, select Payment Service, inspect the linked work, trigger degradation, run impact analysis, recover, and close the Bug. See [docs/hardening.md](docs/hardening.md) for the complete path.

The buttons call development-only API endpoints. Alternatively, update any component through `PUT /api/projects/{projectId}/environments/{environmentId}/components/{componentId}/runtime`.

## Checks

```powershell
dotnet restore backend/DevOpsPlatform.slnx
dotnet build backend/DevOpsPlatform.slnx
dotnet test backend/DevOpsPlatform.slnx
cd frontend/web
npm ci
npm run lint
npm run typecheck
npm run build
```

`docker compose config` checks the Compose file. Automated backend tests cover graph traversal, seeded EF queries, and authenticated HTTP endpoint flows using the in-memory provider. The additive migrations were also applied to isolated fresh and Version 1 PostgreSQL databases, including a real identity-generated work-item number. The full Compose stack was smoke tested in a browser for OIDC sign-in, project creation, a persisted board state change, seeded component links, real component/dependency creation, and environment comparison. See [docs/hardening.md](docs/hardening.md) for the verified path. A repeatable PostgreSQL integration test suite remains to be added.

## Scope

This is an architectural baseline, not a CI runner, Kubernetes control plane, general telemetry store, or root-cause engine. Dependencies come from manual entries, seed data, or the currently supported Compose discovery source; current runtime state is submitted through the ingestion endpoint. Impact results express potential effect, not guaranteed failure or causation.
