# AGENTS.md — DevOps Platform MVP Bootstrap

## 1. Mission

You are bootstrapping the MVP of a diploma project:

**DevOps Platform for Centralized Lifecycle Management, Monitoring, and Dependency Analysis of Distributed Software Systems**

The project is being developed by a 5-person team over approximately 3 months using Rational Unified Process (RUP).

The MVP must NOT attempt to replace Azure DevOps, GitHub Actions, Grafana, Datadog, Kubernetes, or a full APM suite.

The product's core value is to unify:

- software/project metadata;
- environments;
- distributed-system components;
- declared component dependencies;
- deployment history;
- runtime health;
- basic telemetry;
- operational events;
- an interactive live topology graph;
- graph-based dependency impact analysis.

The key idea is a **unified operational model** of a distributed software system.

The MVP should let a user answer:

1. What components exist in this system?
2. How are they connected?
3. Which version is deployed where?
4. Which components are healthy, degraded, unhealthy, or unknown?
5. What changed recently?
6. If one component fails, what other components may be affected?

Keep the implementation deliberately small, clear, testable, and extensible.

---

## 2. Repository Strategy

Use a **single Git monorepo**.

Reason:
- one 5-person diploma team;
- shared release cadence;
- easier local development;
- easier integration testing;
- easier CI/CD;
- shared documentation;
- frontend and backend evolve together.

Target structure:

```text
/
├─ AGENTS.md
├─ README.md
├─ .gitignore
├─ .editorconfig
├─ compose.yaml
├─ docs/
│  ├─ vision.md
│  ├─ architecture.md
│  ├─ domain-model.md
│  ├─ api.md
│  └─ decisions/
├─ backend/
│  ├─ DevOpsPlatform.sln
│  ├─ src/
│  │  ├─ DevOpsPlatform.Api/
│  │  ├─ DevOpsPlatform.Application/
│  │  ├─ DevOpsPlatform.Domain/
│  │  ├─ DevOpsPlatform.Infrastructure/
│  │  └─ DevOpsPlatform.Persistence/
│  └─ tests/
│     ├─ DevOpsPlatform.UnitTests/
│     └─ DevOpsPlatform.IntegrationTests/
├─ frontend/
│  └─ web/
│     ├─ src/
│     ├─ public/
│     └─ ...
└─ scripts/
   ├─ dev-up.*
   └─ dev-down.*
```

Do not create multiple Git repositories.

Initialize Git at repository root if one does not already exist.

---

## 3. Technology Choices

### Backend

Use:

- ASP.NET Core Web API
- current installed .NET LTS SDK, preferably .NET 10 if available
- C#
- EF Core
- PostgreSQL
- Npgsql
- FluentValidation if validation complexity warrants it
- OpenAPI / Swagger
- ASP.NET Core Health Checks
- Server-Sent Events (SSE) for one-way live UI updates

Use a **modular monolith / Clean Architecture-inspired structure**.

Do NOT split the platform itself into microservices for the MVP.

### Frontend

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui when useful
- React Flow (`@xyflow/react`) for the topology graph
- TanStack Query for server state if useful
- native EventSource for SSE

Keep frontend architecture simple.

### Infrastructure

Use Docker Compose for local development.

Required local infrastructure:

- PostgreSQL

Optional, only if easy and justified during bootstrap:

- Prometheus

Do not require Kubernetes for the initial MVP.

---

## 4. Architectural Principles

Follow these rules:

1. Domain must not depend on EF Core, ASP.NET Core, frontend code, Docker, or infrastructure implementations.
2. Application contains use-case orchestration and interfaces/ports.
3. Infrastructure implements external integrations.
4. Persistence contains EF Core configuration, DbContext, migrations, repositories/query implementations where appropriate.
5. API is the composition root.
6. Prefer explicit code over unnecessary abstractions.
7. Avoid generic repository patterns unless they provide real value.
8. Avoid MediatR unless there is a demonstrated reason to add it.
9. Avoid event buses and distributed messaging inside the platform MVP unless required by a concrete use case.
10. No premature microservices.
11. No CQRS framework for the sake of architecture diagrams.
12. Keep every important feature runnable end-to-end.

---

## 5. MVP Domain Model

Implement the following core entities.

Use `Guid` identifiers unless there is a strong reason not to.

Use `DateTimeOffset` in UTC for timestamps.

### Project

Represents a managed software project/system.

Fields:

```text
Id
Name
Description
CreatedAt
UpdatedAt
```

Rules:
- Name is required.
- Name should be reasonably bounded, e.g. 2–120 characters.

### Environment

Represents an execution environment.

Fields:

```text
Id
ProjectId
Name
Type
CreatedAt
UpdatedAt
```

Environment type enum:

```text
Development
Testing
Staging
Production
Custom
```

A Project has many Environments.

### SystemComponent

Represents something visible in the operational topology.

Fields:

```text
Id
ProjectId
Name
Description
Type
RepositoryUrl nullable
Owner nullable
CreatedAt
UpdatedAt
```

Component type enum:

```text
Frontend
Service
Database
MessageBroker
Cache
ExternalService
Gateway
Worker
Other
```

Do not create separate entity tables for every component subtype in the MVP.

### Dependency

Directed relationship between two components.

Fields:

```text
Id
ProjectId
SourceComponentId
TargetComponentId
Type
Source
LastObservedAt nullable
CreatedAt
```

Dependency type enum:

```text
Http
Database
Messaging
Cache
Infrastructure
External
Other
```

Dependency source enum:

```text
Declared
Discovered
Observed
```

Rules:
- source and target must differ;
- both components must belong to the same project for MVP;
- duplicate identical directed relationships should be prevented;
- deleting a component should remove or otherwise safely handle related dependencies.

### Deployment

Represents a deployment of a component into an environment.

Fields:

```text
Id
ProjectId
EnvironmentId
ComponentId
Version
CommitSha nullable
ArtifactReference nullable
Status
StartedAt
CompletedAt nullable
CreatedAt
```

Deployment status enum:

```text
Pending
Running
Succeeded
Failed
RolledBack
```

### RuntimeState

Represents the most recently known operational state of one component in one environment.

Fields:

```text
Id
ProjectId
EnvironmentId
ComponentId
HealthStatus
CpuPercent nullable
MemoryPercent nullable
RequestRate nullable
ErrorRatePercent nullable
LatencyP95Ms nullable
LastHeartbeatAt nullable
UpdatedAt
```

Health status enum:

```text
Healthy
Degraded
Unhealthy
Unknown
```

Maintain at most one current RuntimeState per `(EnvironmentId, ComponentId)`.

### OperationalEvent

Represents lifecycle or operational events.

Fields:

```text
Id
ProjectId
EnvironmentId nullable
ComponentId nullable
Type
Severity
Title
Description nullable
OccurredAt
CreatedAt
```

Event type enum:

```text
DeploymentStarted
DeploymentCompleted
DeploymentFailed
HealthChanged
MetricThresholdExceeded
ComponentRegistered
DependencyCreated
DependencyObserved
ConfigurationChanged
Other
```

Severity enum:

```text
Info
Warning
Error
Critical
```

---

## 6. Database Constraints and Indexes

At minimum configure:

- unique Project.Name if practical;
- unique `(ProjectId, Environment.Name)`;
- unique `(ProjectId, SystemComponent.Name)`;
- unique dependency on `(SourceComponentId, TargetComponentId, Type)`;
- unique RuntimeState on `(EnvironmentId, ComponentId)`;
- indexes on foreign keys;
- index OperationalEvent.OccurredAt;
- indexes useful for recent deployments and events.

Use EF Core Fluent API configurations rather than filling entities with persistence-specific attributes.

Create the first migration.

Do not auto-run destructive migrations in production-like environments.

For local development it is acceptable to run migrations through a documented command.

---

## 7. Seed Data

Add deterministic development seed data.

Create:

Project:
```text
Commerce Demo
```

Environments:
```text
Development
Production
```

Components:

```text
Web Frontend       Frontend
API Gateway        Gateway
Order Service      Service
Payment Service    Service
Notification Worker Worker
Orders DB          Database
RabbitMQ           MessageBroker
Stripe             ExternalService
```

Declared dependencies:

```text
Web Frontend -> API Gateway
API Gateway -> Order Service
Order Service -> Payment Service
Order Service -> Orders DB
Order Service -> RabbitMQ
Notification Worker -> RabbitMQ
Payment Service -> Stripe
```

Seed realistic runtime states for Production.

At least one component should be `Degraded` so the graph is visually meaningful.

Seed several deployments and operational events around the degraded service.

Example:

```text
10:00 Payment Service v1.4.0 deployment completed
10:04 Payment Service error rate exceeded threshold
10:05 Payment Service health changed to Degraded
```

Do not imply causation; this is correlation/timeline data only.

---

## 8. Backend MVP Use Cases

Implement APIs for the following.

### Projects

```text
GET    /api/projects
GET    /api/projects/{projectId}
POST   /api/projects
```

Optional:
```text
PUT    /api/projects/{projectId}
DELETE /api/projects/{projectId}
```

Do not prioritize edit/delete over topology functionality.

### Environments

```text
GET  /api/projects/{projectId}/environments
POST /api/projects/{projectId}/environments
```

### Components

```text
GET  /api/projects/{projectId}/components
GET  /api/components/{componentId}
POST /api/projects/{projectId}/components
```

### Dependencies

```text
GET  /api/projects/{projectId}/dependencies
POST /api/projects/{projectId}/dependencies
```

### Topology

Provide a UI-friendly endpoint:

```text
GET /api/projects/{projectId}/environments/{environmentId}/topology
```

Return a DTO shaped roughly like:

```json
{
  "projectId": "...",
  "environmentId": "...",
  "generatedAt": "...",
  "nodes": [
    {
      "id": "...",
      "name": "Order Service",
      "type": "Service",
      "health": "Degraded",
      "version": "2.1.0",
      "metrics": {
        "cpuPercent": 43.2,
        "memoryPercent": 61.0,
        "requestRate": 153.2,
        "errorRatePercent": 7.4,
        "latencyP95Ms": 410
      }
    }
  ],
  "edges": [
    {
      "id": "...",
      "source": "...",
      "target": "...",
      "type": "Http",
      "sourceKind": "Declared"
    }
  ]
}
```

DTOs must not leak EF entities.

### Deployments

```text
GET  /api/projects/{projectId}/environments/{environmentId}/deployments
GET  /api/components/{componentId}/deployments
POST /api/projects/{projectId}/deployments
```

For MVP, registering a deployment record is sufficient.

Do not build a complete CI runner.

### Runtime State

```text
GET /api/projects/{projectId}/environments/{environmentId}/runtime
PUT /api/projects/{projectId}/environments/{environmentId}/components/{componentId}/runtime
```

The PUT endpoint acts as a simple telemetry/agent ingestion simulation for MVP.

When health changes:
- persist the new runtime state;
- create a `HealthChanged` operational event;
- publish an SSE update.

### Operational Events

```text
GET /api/projects/{projectId}/environments/{environmentId}/events
```

Support a reasonable query parameter such as:

```text
?limit=50
```

### SSE Stream

Provide:

```text
GET /api/projects/{projectId}/environments/{environmentId}/events/stream
```

Use event names such as:

```text
runtime-state-updated
operational-event-created
deployment-updated
```

Keep the SSE mechanism simple and in-memory for MVP.

Design its abstraction so a future distributed event mechanism could replace it.

---

## 9. Impact Analysis

This is a flagship MVP capability.

Implement:

```text
GET /api/projects/{projectId}/components/{componentId}/impact
```

Given component `X`, determine which components may depend on it.

Edges are directed:

```text
A -> B
```

means:

```text
A depends on B
```

Therefore if `B` fails, `A` is a direct dependent.

Perform reverse graph traversal using BFS or DFS.

Return:

```json
{
  "componentId": "...",
  "directDependents": [],
  "indirectDependents": [],
  "affectedPaths": []
}
```

Example:

```text
Web Frontend -> API Gateway -> Order Service -> Payment Service
```

Impact analysis of `Payment Service` should identify:

Direct:
```text
Order Service
```

Indirect:
```text
API Gateway
Web Frontend
```

Avoid presenting impact as guaranteed failure.

Use language such as:

```text
potentially affected
```

Include unit tests for graph traversal.

Test:
- simple chain;
- branching graph;
- disconnected graph;
- cycle;
- duplicate route prevention.

Traversal must not recurse infinitely when cycles exist.

---

## 10. Health Model

Health is not just "process running".

For MVP:

```text
Healthy
Degraded
Unhealthy
Unknown
```

RuntimeState can be explicitly submitted by the mock telemetry endpoint.

Provide helper/domain logic so later it can be derived from metrics.

Suggested future rules, but do not overbuild:

```text
Unknown:
  no heartbeat

Unhealthy:
  health probe failed

Degraded:
  probe passes but thresholds are exceeded

Healthy:
  probe passes and thresholds are normal
```

Do not implement a complex alert-rule engine in the first bootstrap.

---

## 11. Frontend Pages

Create a usable but simple UI.

### `/`

Redirect to projects or show a small project selector.

### `/projects`

Show projects as cards/table.

### `/projects/[projectId]`

Project overview with:

- environment selector;
- component count;
- unhealthy/degraded component count;
- recent deployments;
- recent operational events;
- link to topology.

### `/projects/[projectId]/topology`

This is the flagship screen.

Layout:

```text
┌───────────────────────────────────────────────────────┐
│ Project     Environment        Search     Refresh     │
├───────────────────────────────────────────────────────┤
│                                                       │
│                  TOPOLOGY GRAPH                       │
│                                                       │
│                                                       │
├──────────────────────────────────────┬────────────────┤
│ Optional timeline / status           │ Detail panel   │
└──────────────────────────────────────┴────────────────┘
```

Use React Flow.

Node should display at minimum:

```text
Component name
Component type
Health status
Deployed version if known
```

Clicking a node opens a details panel.

Details panel:

```text
Name
Type
Health
Version
Repository
Owner
Current metrics
Dependencies
Dependents
Recent deployments
Recent events
```

Provide controls:

- environment selector;
- component search;
- fit view;
- refresh;
- optional health/type filters.

Do not over-invest in fancy animation.

### `/projects/[projectId]/events`

Simple event timeline/table.

### `/projects/[projectId]/deployments`

Deployment table/history.

A separate monitoring page is optional because topology + component details should already expose the most important monitoring data.

---

## 12. Graph Presentation Rules

Keep graph semantics obvious.

Nodes must be visually distinguishable by:
- health;
- component type.

Do not rely on color alone; include labels/icons/text indicators for accessibility.

Suggested textual markers:

```text
Healthy
Degraded
Unhealthy
Unknown
```

Edges should expose dependency source:

```text
Declared
Discovered
Observed
```

For the initial seeded data all relationships may be `Declared`.

The data model and UI must nevertheless support all three.

When impact analysis is requested:
- keep selected failing/changed component visually clear;
- highlight direct dependents;
- highlight indirect dependents;
- dim unrelated nodes when useful;
- show a textual impact list beside the graph.

---

## 13. Live Updates

Frontend topology page should connect to the backend SSE stream.

When `runtime-state-updated` arrives:
- update affected node state;
- do not reload the full browser page.

When an operational event arrives:
- update the visible recent-events area where practical.

Implement reconnect-safe behavior using native EventSource defaults.

If SSE is temporarily disconnected, the rest of the UI must remain functional.

---

## 14. Local Demo / Telemetry Simulation

Create an easy way to demonstrate live monitoring without requiring Kubernetes.

One of these is acceptable:

### Preferred

A small backend development-only endpoint:

```text
POST /api/dev/simulate/degradation/{componentId}
POST /api/dev/simulate/recovery/{componentId}
```

or a small script that sends RuntimeState updates to the normal ingestion endpoint.

Never enable development simulation endpoints in production configuration.

The demo should allow this scenario:

1. Open Production topology.
2. All or most nodes are healthy.
3. Trigger degradation of Payment Service.
4. Payment Service updates live to Degraded.
5. Event appears in timeline.
6. Run impact analysis.
7. Order Service is direct dependent.
8. API Gateway and Web Frontend are indirect dependents.
9. Trigger recovery.
10. Node returns to Healthy.

---

## 15. Docker Compose

Create `compose.yaml`.

Minimum:

```text
postgres
backend
frontend
```

Use environment variables.

Do not commit real secrets.

Provide `.env.example`.

Suggested local ports:

```text
frontend: 3000
backend: 5000 or 5001
postgres: 5432
```

Choose ports consistently and document them.

Health checks should be present where reasonable.

Frontend must call backend using configuration, not hard-coded production URLs.

---

## 16. Backend Health Endpoints

Expose application health endpoints such as:

```text
/health
/health/ready
/health/live
```

At minimum:
- liveness;
- readiness including PostgreSQL connectivity.

Do not confuse platform health endpoints with monitored component runtime states.

---

## 17. Error Handling

Use centralized ASP.NET Core exception handling.

Return Problem Details (`application/problem+json`) for API errors.

Handle at least:

- validation failures -> 400;
- missing resource -> 404;
- conflicts/duplicates -> 409 where appropriate;
- unexpected exception -> 500 without exposing stack traces in production.

Do not wrap every response in a custom `{ success, data }` envelope.

---

## 18. Validation

Validate input DTOs.

Examples:

- names required;
- valid enum values;
- source != target for dependency;
- referenced project/component/environment must exist;
- components in dependency must belong to correct project;
- deployment's component/environment must belong to its project;
- percentages should be sensible;
- version string length must be bounded.

Avoid excessive domain ceremony for simple validation.

---

## 19. API Documentation

Enable OpenAPI.

Document:
- endpoint purpose;
- important response codes;
- DTO examples where easy.

Update `docs/api.md` with a short overview of the important endpoints.

---

## 20. Testing

Testing is part of MVP, not cleanup.

### Unit tests

At minimum:

- dependency validation;
- impact-analysis traversal;
- cycle handling;
- any non-trivial health/event logic.

### Integration tests

At minimum:

- create/list project;
- create component;
- create dependency;
- retrieve topology;
- update RuntimeState;
- verify OperationalEvent is created;
- impact-analysis endpoint.

Prefer a real PostgreSQL integration environment if practical, e.g. Testcontainers.

If Testcontainers introduces excessive setup problems in the bootstrap environment, document the limitation and create tests that are easy to enable later.

### Frontend tests

Do not spend the bootstrap phase building a huge frontend test suite.

At minimum ensure:
- TypeScript compiles;
- lint passes;
- key topology DTO mapping logic is testable.

If Playwright can be introduced cleanly, add a smoke test later rather than blocking initial scaffolding.

---

## 21. Coding Conventions

### C#

- nullable reference types enabled;
- file-scoped namespaces;
- async APIs use `Async` suffix;
- pass `CancellationToken` through async application/infrastructure boundaries;
- avoid `.Result` and `.Wait()`;
- avoid static service locators;
- dependency injection through constructors;
- use records for immutable request/response DTOs when appropriate;
- domain entities do not need to be records;
- avoid public setters where domain invariants benefit from methods;
- do not over-engineer simple CRUD entities.

### TypeScript

- strict TypeScript;
- avoid `any`;
- use typed API DTOs;
- keep server state separate from local UI state;
- extract graph mapping logic from React rendering code;
- keep large pages decomposed into focused components.

---

## 22. Naming

Use the root product name:

```text
DevOpsPlatform
```

until a final product name is chosen.

> Decided: the product name is **Hydra** ([ADR 0020](docs/decisions/0020-product-name-hydra.md)). Use Hydra in everything users read; keep `DevOpsPlatform` for the solution, projects and namespaces below.

Backend namespaces:

```text
DevOpsPlatform.Domain
DevOpsPlatform.Application
DevOpsPlatform.Infrastructure
DevOpsPlatform.Persistence
DevOpsPlatform.Api
```

Do not invent a flashy product name during bootstrap.

---

## 23. Documentation Required During Bootstrap

Create:

### `README.md`

Must contain:
- project summary;
- architectural idea;
- prerequisites;
- local setup;
- how to run with Docker Compose;
- how to run backend/frontend separately;
- migration commands;
- test commands;
- demo workflow.

### `docs/vision.md`

Briefly describe:
- problem;
- stakeholders;
- product positioning;
- MVP;
- non-goals.

### `docs/architecture.md`

Describe:
- monorepo;
- frontend/backend;
- layered backend;
- PostgreSQL;
- SSE;
- topology/impact engine;
- telemetry boundary;
- why platform is a modular monolith.

Include a Mermaid context/container diagram.

### `docs/domain-model.md`

Describe all entities and relationships.

Include Mermaid ER/class-style diagram.

### `docs/decisions/`

Create initial ADRs:

```text
0001-use-monorepo.md
0002-use-modular-monolith.md
0003-use-postgresql.md
0004-use-sse-for-live-updates.md
0005-use-react-flow-for-topology.md
```

Keep ADRs short:
- context;
- decision;
- consequences.

---

## 24. RUP Awareness

The project follows RUP, but implementation should not become document-driven bureaucracy.

Artifacts should support engineering decisions.

Treat this repository bootstrap as part of **Elaboration**:
- validate architecture;
- address technical risks;
- create executable architectural baseline.

The implementation should support later RUP artifacts such as:
- Vision;
- Use-Case Model;
- Supplementary Specification;
- Software Architecture Document;
- Design Model;
- Test Plan;
- Iteration Plans;
- Deployment Model.

Do not fabricate formal requirements that have not been agreed.

When assumptions are needed, document them.

---

## 25. MVP Non-Goals

Do NOT build these during initial bootstrap:

- Git server;
- pull-request system;
- full CI/CD execution engine;
- Kubernetes operator;
- Kubernetes dashboard clone;
- general-purpose log storage/search engine;
- custom time-series database;
- secrets vault;
- Terraform replacement;
- cloud provisioning engine;
- advanced authentication provider;
- full RBAC matrix;
- billing;
- AI incident assistant;
- automatic root-cause claims;
- automatic rollback;
- production-grade distributed tracing backend;
- service mesh;
- custom graph database.

The system should be structured so integrations can be added later.

---

## 26. Future Integration Boundaries

Define interfaces/ports where they genuinely help future work.

Potential future adapters:

```text
ITelemetryProvider
IDeploymentProvider
ISourceControlProvider
IRuntimeDiscoveryProvider
```

Do not implement all providers now.

For MVP:
- RuntimeState update API acts as telemetry source;
- Deployment records are registered directly through API;
- dependencies are declared through API/seed data.

Future implementations may integrate:
- OpenTelemetry;
- Prometheus;
- Docker Engine;
- Kubernetes;
- Azure DevOps;
- GitHub.

Do not add dependencies on these systems merely to say they are supported.

---

## 27. Security for Bootstrap

Use safe defaults.

At minimum:
- secrets only through environment variables / development secret mechanisms;
- no secrets committed;
- validate external URLs;
- restrict CORS to configured frontend origin;
- never expose stack traces in production;
- development simulation endpoints only in development environment.

Authentication may be deferred if adding it risks delaying the architectural baseline.

If auth is included, use a simple standard ASP.NET Core approach and do not build a custom identity provider.

---

## 28. Git

If no repository exists:

```text
git init
```

Create a sensible `.gitignore`.

The initial work should be grouped into coherent commits if the execution environment permits commits.

Suggested logical commit progression:

```text
chore: initialize monorepo structure
feat: add backend domain and persistence baseline
feat: add topology and impact analysis API
feat: add frontend topology dashboard
feat: add live runtime updates
test: add backend unit and integration coverage
docs: add MVP architecture documentation
```

Do not rewrite existing Git history.

If a repository already exists, preserve its existing configuration.

---

## 29. Bootstrap Execution Order

When starting from an empty directory, follow this order.

### Phase 1 — Inspect

1. Inspect current directory.
2. Determine whether Git/project files already exist.
3. Do not overwrite existing user work.
4. Check installed `dotnet`, Node, package manager, Docker availability.

### Phase 2 — Root

Create:
- Git repo if missing;
- `.gitignore`;
- `.editorconfig`;
- root README;
- docs directories;
- compose file;
- environment example.

### Phase 3 — Backend

1. Create solution.
2. Create Domain, Application, Infrastructure, Persistence, Api projects.
3. Configure project references correctly.
4. Add test projects.
5. Add entities/enums.
6. Add DbContext/configurations.
7. Add PostgreSQL.
8. Add migration.
9. Add development seed.
10. Add core APIs.
11. Add topology query.
12. Add impact analysis.
13. Add runtime update.
14. Add operational events.
15. Add SSE.
16. Add tests.
17. Ensure build/tests pass.

### Phase 4 — Frontend

1. Initialize Next.js app.
2. Configure TypeScript/Tailwind.
3. Add UI primitives.
4. Add typed API layer.
5. Add project dashboard.
6. Add topology page.
7. Add React Flow.
8. Add component details panel.
9. Add impact-analysis interaction.
10. Add EventSource live updates.
11. Ensure lint/type checks pass.

### Phase 5 — Compose

Wire:
- PostgreSQL;
- backend;
- frontend.

Verify the whole stack starts.

### Phase 6 — Documentation

Update all documentation to match actual implementation.

Never document features that do not exist.

---

## 30. Definition of Done for Bootstrap

The bootstrap is complete when a developer can:

1. clone/open the repository;
2. configure `.env`;
3. start PostgreSQL/backend/frontend;
4. apply or run EF migrations;
5. open the web UI;
6. select the seeded Commerce Demo project;
7. choose Production;
8. see an interactive dependency graph;
9. click Order Service or Payment Service;
10. see health/version/metrics/dependencies;
11. view deployment history;
12. view recent operational events;
13. trigger or submit a Payment Service degradation;
14. observe the topology update without a full page refresh;
15. run impact analysis;
16. see Order Service as directly potentially affected;
17. see API Gateway and Web Frontend as indirectly potentially affected;
18. restore Payment Service health;
19. run backend tests successfully;
20. run frontend lint/type validation successfully.

---

## 31. Quality Gate Before Finishing

Before claiming completion:

Backend:

```text
dotnet restore
dotnet build
dotnet test
```

Frontend, use commands matching the generated package manager:

```text
npm install
npm run lint
npm run build
```

or equivalent.

Docker:

```text
docker compose config
docker compose up --build
```

If Docker cannot run in the execution environment, still validate configuration syntax where possible and clearly document what could not be executed.

Check:
- migrations exist;
- API starts;
- seed works;
- topology endpoint returns nodes/edges;
- impact traversal is tested;
- no obvious secrets are committed;
- documentation reflects reality.

Fix issues instead of merely documenting failing checks when they are reasonably fixable.

---

## 32. Expected Initial UX

Prioritize clarity over visual complexity.

The topology page should feel like an operations workspace:

```text
+---------------------------------------------------------------+
| Commerce Demo | Production | Search... | Healthy 6 / Degraded 1|
+---------------------------------------------------------------+
|                                                               |
|                         Web Frontend                          |
|                              |                                |
|                         API Gateway                           |
|                              |                                |
|                         Order Service                         |
|                         /     |      \                        |
|                 Payment     DB      RabbitMQ                  |
|                    |                    |                     |
|                  Stripe        Notification Worker            |
|                                                               |
+---------------------------------------------+-----------------+
| Recent operational events                   | Component       |
|                                             | details         |
+---------------------------------------------+-----------------+
```

This is not required to be pixel-perfect.

It must be understandable in a diploma demonstration.

---

## 33. Design for Later Architecture Drift

Do not fully implement architecture drift during the first bootstrap, but preserve the data needed for it.

A Dependency already contains:

```text
Source = Declared | Discovered | Observed
LastObservedAt
```

This should allow later comparisons such as:

```text
Declared but never observed
Observed but undeclared
Discovered from infrastructure
```

Do not add speculative "AI confidence scores".

If a future confidence field is introduced, it must have a defined meaning.

---

## 34. Design for Historical Topology Later

The MVP stores current topology plus lifecycle events.

Do not implement full topology snapshot history yet.

Ensure OperationalEvent + Deployment history make it possible to evolve toward historical reconstruction later.

Avoid deleting important lifecycle history merely because a current state changes.

---

## 35. General Agent Working Rules

While implementing:

- inspect before editing;
- preserve existing work;
- do not silently change the intended architecture;
- make the smallest coherent implementation that satisfies the MVP;
- avoid placeholder TODO-heavy architecture;
- prefer runnable vertical slices;
- keep compile errors at zero;
- do not leave migrations broken;
- do not fake tests;
- do not claim commands passed unless they were run;
- document unavoidable environment limitations;
- prefer understandable code for a student team over enterprise ceremony;
- do not add packages without clear value;
- keep backend and frontend independently runnable;
- keep Docker optional for developers who prefer local processes;
- use comments only where intent is not obvious from code.

If a requirement is ambiguous, choose the simplest implementation consistent with this document and document the assumption in the relevant README/ADR.

---

## 36. First Deliverable

For the first bootstrap pass, implement the working vertical slice:

```text
Project
  -> Environment
  -> Components
  -> Dependencies
  -> Runtime State
  -> Topology API
  -> React Flow visualization
  -> SSE health update
  -> Impact analysis
```

Only after that works should secondary CRUD and polish be expanded.

The purpose of this first iteration is to prove the project's architectural thesis:

**lifecycle metadata, dependency information, and live runtime state can be represented together as one operational topology and used for practical dependency-impact analysis.**
