# Large example project: Northstar Marketplace

Commerce Demo is small on purpose: 8 components, 7 dependencies. To see how Hydra looks and behaves with a
larger system, the web app can create a second, much larger example project, **Northstar Marketplace**.

## How to create it

1. Run the web app with `NEXT_PUBLIC_ENABLE_DEMO=true` (the default in `.env.example`, `.env.local.example`
   and `compose.yaml`).
2. Sign in and open **Projects**. Under the project cards, **Try Hydra with a large example** offers
   **Create the example**.
3. The panel shows each step as it runs (project, environments, components, dependencies, deployments,
   health, board). When it finishes, **Open Northstar Marketplace** opens the new project.

The example is created through the public API (`src/lib/demo/createExampleProject.ts`), as the person who
is signed in, exactly like a project made by hand. Nothing is seeded in the database and the backend is not
changed. The person who creates it becomes its owner. The panel disappears once a project with that name
exists. To remove the example, archive it in its Settings. Project names are unique, archived ones included,
so the example cannot be created a second time while an archived Northstar Marketplace exists.

If a request fails, the panel shows the API's message and stops. What was created until then stays.

## What it contains

All data is fictional and lives in `src/lib/demo/northstar.ts`.

| Part | Contents |
| --- | --- |
| Components | 42: 4 front ends (web, mobile, seller portal, admin console), 2 gateways, 16 services, 4 workers, 7 data stores, 2 caches, 2 message brokers, 5 outside providers. Each has an owner team and a description; components built from code have a repository URL under `git.example.com`. |
| Dependencies | 70: HTTP, database, messaging, cache and external. Two are *observed only* (seen in traffic, never declared) and two are *discovered*, so the dependency provenance on the Topology page has something to show. |
| Environments | Development, Testing, Staging, Production. |
| Deployments | 106, with versions, commit hashes and artifact references. Production has two releases per component; Staging runs a patch ahead for most components; Testing and Development have newer minor versions for some. A failed release (Checkout Service 3.8.0, fixed by 3.8.1), a rolled-back one (Recommendation Service 1.9.0) and one still running (Payment Service in Development). |
| Health | Reported per environment with metrics (CPU, memory, request rate, error rate, p95 latency). Production: Search Service is degraded since search 4.2.0 went out, and SMS Worker is unhealthy, so 6 components are potentially affected. Staging: Inventory DB is degraded. Testing: outside providers are not monitored (Unknown). Development: only 12 components report. Every change of health becomes an event, as the API records it. |
| Board | 3 iterations (Sprint 14 completed, Sprint 15 current, Sprint 16 planned), 6 tags, 27 work items: stories with child tasks, tasks and bugs, with priorities, story points, estimates, areas, states from New to Closed, links to components, and some assigned to the person who created the example. |

## How the pages handle a large system

- **Overview, live map.** A system whose map would need more than three columns of cards is told layer by
  layer as rows of chips, with the same story: layers appear, health shows, problems light up, and the red
  arrows climb to what is potentially affected.
- **Topology.** The layered map zooms out to fit (down to 30%); zoom in or use the minimap. In the dependency
  provenance, observed and discovered dependencies are listed first, and a long list of declared-only ones
  is folded.
- Lists (components, dependencies, events, deployments, the board) simply grow.
