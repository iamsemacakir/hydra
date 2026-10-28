# Topology and comparison foundations

The topology keeps the Version 1 graph, live runtime updates, and reverse impact analysis. Version 2 adds component type, health, and dependency source filters; existing name search remains available. An empty graph explains when a project has no components or filters hide them. Graph colours come from the Hydra design tokens, in Light and Dark ([design-system.md](design-system.md)).

The Components and Environments pages let project members build a real topology through the UI. A keyboard-operable component selector can open the same detail view as selecting a graph node.

Dependencies keep their `Declared`, `Discovered`, or `Observed` source. The `DependencyProvenance` migration changes the unique key to `(SourceComponentId, TargetComponentId, Type, Source)`, so a declared edge and an observed edge can coexist. The API records `LastObservedAt` when an `Observed` edge is explicitly submitted. The caller is responsible for supplying a real observation; the application does not invent one.

`GET /api/projects/{projectId}/environments/{environmentId}/architecture-drift` groups edges by source, target, and type into `matching`, `declaredOnly`, `observedOnly`, and `discovered`. This is a **project-wide** comparison: dependencies are not scoped to environments in the current model. A declared-only edge means no observation has been recorded, not that the architecture is wrong. The topology page shows it under “Dependency provenance”, marked “Whole project”.

`GET /api/projects/{projectId}/environment-comparison?leftEnvironmentId=...&rightEnvironmentId=...` returns each project component's latest successful deployed version, current recorded health, and whether any deployment or runtime record exists in each environment. A missing record does not prove the component is absent. Declared dependencies are shared project-wide and reported as such. `/projects/{projectId}/comparison` renders a table (a list of small cards on a phone) and a differences-only filter. The Environments page shows each environment's recorded health from its topology: a sentence, the health bar, the counts per state and the components that need attention.

These endpoints were verified against both the in-memory integration suite and additive migrations on fresh and Version 1-upgraded PostgreSQL databases.

## Layout

The graph is laid out in layers (`layoutTopology` in `frontend/web/src/lib/graph.ts`, pure and testable without React). An edge `A → B` means A depends on B, so A is placed above B and every arrow points down; a failure travels upwards, against the arrows.

1. Edges that close a cycle are left out of the layering (they are still drawn), so the layout always ends.
2. Each component goes one row below its lowest dependent (longest path).
3. A component that nothing depends on moves down to sit right above what it depends on.
4. In each row, a component is placed under the average position of its dependents, then neighbours are pushed apart so they never overlap.

Edges are curved and end in an arrowhead. The line shows the dependency source: solid for Declared, dashed for Discovered, dotted for Observed; a non-declared source is also named in the edge label. After an impact analysis the path a failure could travel is red and dashed, and unrelated components are dimmed. The overview's map preview (`miniMap`) uses the same layout.
