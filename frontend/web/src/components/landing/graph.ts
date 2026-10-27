/**
 * Sample dependency graph for the landing page.
 *
 * It mirrors the bundled backend/examples/commerce-system/compose.yaml (8 services,
 * 7 depends_on edges). Everything here is pure data and pure functions, so the
 * logic stays testable without React and the components only render it.
 */

export const SERVICE_KIND = {
  "web-frontend": "frontend",
  "api-gateway": "gateway",
  "order-service": "service",
  "payment-service": "service",
  "orders-db": "database",
  rabbitmq: "message broker",
  "notification-worker": "worker",
  "stripe-adapter": "service",
} as const;

export type ServiceId = keyof typeof SERVICE_KIND;
export const SERVICE_IDS = Object.keys(SERVICE_KIND) as ServiceId[];

/** [from, to] reads "from depends on to", the same direction as depends_on in compose.yaml. */
export const DEPENDENCIES: ReadonlyArray<readonly [ServiceId, ServiceId]> = [
  ["web-frontend", "api-gateway"],
  ["api-gateway", "order-service"],
  ["order-service", "payment-service"],
  ["order-service", "orders-db"],
  ["order-service", "rabbitmq"],
  ["payment-service", "stripe-adapter"],
  ["notification-worker", "rabbitmq"],
];

export const edgeKey = (from: ServiceId, to: ServiceId) => `${from}>${to}`;

export const EDGES = DEPENDENCIES.map(([from, to]) => ({ from, to, key: edgeKey(from, to) }));

/** The services that declare dependencies, in compose.yaml order. */
export const COMPOSE_EXCERPT = SERVICE_IDS.map((service) => ({
  service,
  dependsOn: DEPENDENCIES.filter(([from]) => from === service).map(([, to]) => to),
})).filter((row) => row.dependsOn.length > 0);

/* ------------------------------------------------------------------ */
/* Impact analysis                                                     */
/* ------------------------------------------------------------------ */

export type Impact = {
  selected: ServiceId;
  /** Services that depend on the selected one directly. */
  direct: ServiceId[];
  /** Services that depend on it through other services. */
  indirect: ServiceId[];
  /** Distance from the selected service along reversed edges: selected = 0, direct = 1, and so on. */
  depth: Partial<Record<ServiceId, number>>;
  /** The longest dependency chain that ends at the selected service. */
  longestPath: ServiceId[];
};

type Edges = ReadonlyArray<readonly [ServiceId, ServiceId]>;

/** Breadth-first walk over the reversed edges. Safe on cycles because every service is visited once. */
export function analyzeImpact(selected: ServiceId, edges: Edges = DEPENDENCIES): Impact {
  const depth: Partial<Record<ServiceId, number>> = { [selected]: 0 };
  const queue: ServiceId[] = [selected];
  const direct: ServiceId[] = [];
  const indirect: ServiceId[] = [];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const next = (depth[current] ?? 0) + 1;
    for (const [from, to] of edges) {
      if (to !== current || depth[from] !== undefined) continue;
      depth[from] = next;
      queue.push(from);
      (next === 1 ? direct : indirect).push(from);
    }
  }
  return { selected, direct, indirect, depth, longestPath: longestChain(selected, edges, new Set()) };
}

function longestChain(id: ServiceId, edges: Edges, seen: ReadonlySet<ServiceId>): ServiceId[] {
  const visited = new Set(seen).add(id);
  let best: ServiceId[] = [];
  for (const [from, to] of edges) {
    if (to !== id || visited.has(from)) continue;
    const chain = longestChain(from, edges, visited);
    if (chain.length > best.length) best = chain;
  }
  return [...best, id];
}

export function countAffected(impact: Impact): number {
  return impact.direct.length + impact.indirect.length;
}

/** "3 services potentially affected." Never states that anything will fail. */
export function describeImpact(impact: Impact): string {
  const total = countAffected(impact);
  if (total === 0) return "No services potentially affected.";
  return `${total} ${total === 1 ? "service" : "services"} potentially affected.`;
}

/** "3 services potentially affected: 1 direct, 2 indirect." */
export function summarizeImpact(impact: Impact): string {
  if (countAffected(impact) === 0) return describeImpact(impact);
  return `${describeImpact(impact).slice(0, -1)}: ${impact.direct.length} direct, ${impact.indirect.length} indirect.`;
}

/* ------------------------------------------------------------------ */
/* Visual frames                                                       */
/* ------------------------------------------------------------------ */

export type NodeState = "hidden" | "unknown" | "healthy" | "degraded" | "direct" | "indirect" | "dim";
export type EdgeVisual = "hidden" | "idle" | "hot";
export type EdgeFrame = { visual: EdgeVisual; depth: number };
export type Frame = { nodes: Record<ServiceId, NodeState>; edges: Record<string, EdgeFrame> };

function nodesOf(state: NodeState): Record<ServiceId, NodeState> {
  return Object.fromEntries(SERVICE_IDS.map((id) => [id, state])) as Record<ServiceId, NodeState>;
}

function edgesOf(visual: EdgeVisual): Record<string, EdgeFrame> {
  return Object.fromEntries(EDGES.map(({ key }) => [key, { visual, depth: 0 }]));
}

/** What the graph shows when `impact` is the current what-if. With no selection every service is healthy. */
export function impactFrame(impact: Impact | null): Frame {
  if (!impact) return { nodes: nodesOf("healthy"), edges: edgesOf("idle") };
  const nodes = nodesOf("dim");
  nodes[impact.selected] = "degraded";
  for (const id of impact.direct) nodes[id] = "direct";
  for (const id of impact.indirect) nodes[id] = "indirect";
  const edges = edgesOf("idle");
  for (const { to, key } of EDGES) {
    const depth = impact.depth[to];
    if (depth !== undefined) edges[key] = { visual: "hot", depth };
  }
  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/* Hero story                                                          */
/* ------------------------------------------------------------------ */

export const INCIDENT_SERVICE: ServiceId = "payment-service";

export type PhaseId = "scan" | "map" | "observe" | "incident" | "impact" | "recover";
export type Phase = { id: PhaseId; label: string; /** Duration in milliseconds. */ ms: number; caption: string };

const INCIDENT_IMPACT = analyzeImpact(INCIDENT_SERVICE);

export const PHASES: readonly Phase[] = [
  { id: "scan", label: "Scan", ms: 2800, caption: "Reading compose.yaml. Nothing is executed." },
  { id: "map", label: "Map", ms: 2600, caption: `${SERVICE_IDS.length} services and ${DEPENDENCIES.length} dependencies found.` },
  { id: "observe", label: "Observe", ms: 2000, caption: "Runtime health is attached to every service." },
  { id: "incident", label: "Incident", ms: 2400, caption: `${INCIDENT_SERVICE} reports a degraded state.` },
  { id: "impact", label: "Impact", ms: 3200, caption: summarizeImpact(INCIDENT_IMPACT) },
  { id: "recover", label: "Recover", ms: 2400, caption: `${INCIDENT_SERVICE} is healthy again. The map returns to normal.` },
];

const FRAMES: Record<PhaseId, Frame> = {
  scan: { nodes: nodesOf("hidden"), edges: edgesOf("hidden") },
  map: { nodes: nodesOf("unknown"), edges: edgesOf("idle") },
  observe: { nodes: nodesOf("healthy"), edges: edgesOf("idle") },
  incident: { nodes: { ...nodesOf("healthy"), [INCIDENT_SERVICE]: "degraded" }, edges: edgesOf("idle") },
  impact: impactFrame(INCIDENT_IMPACT),
  recover: { nodes: nodesOf("healthy"), edges: edgesOf("idle") },
};

export const frameFor = (id: PhaseId): Frame => FRAMES[id];

/* ------------------------------------------------------------------ */
/* Layouts                                                             */
/* ------------------------------------------------------------------ */

export const NODE_W = 184;
export const NODE_H = 34;

/** "wide" is the layered graph for roomy containers, "tree" the indented list for narrow ones. */
export type Layout = "wide" | "tree";
export type Point = { x: number; y: number };
type LayoutSpec = { width: number; height: number; positions: Record<ServiceId, Point>; order: ServiceId[] };

function fromCenters(centers: Record<ServiceId, readonly [number, number]>): Record<ServiceId, Point> {
  return Object.fromEntries(
    SERVICE_IDS.map((id) => [id, { x: centers[id][0] - NODE_W / 2, y: centers[id][1] - NODE_H / 2 }]),
  ) as Record<ServiceId, Point>;
}

const TREE_INDENT = 24;
const TREE_PITCH = 46;
/** Depth-first order of the sample graph; [service, depth]. */
const TREE_ROWS: ReadonlyArray<readonly [ServiceId, number]> = [
  ["web-frontend", 0],
  ["api-gateway", 1],
  ["order-service", 2],
  ["payment-service", 3],
  ["stripe-adapter", 4],
  ["orders-db", 3],
  ["notification-worker", 3],
  ["rabbitmq", 3],
];

export const LAYOUTS: Record<Layout, LayoutSpec> = {
  wide: {
    width: 660,
    height: 282,
    positions: fromCenters({
      "web-frontend": [330, 21],
      "notification-worker": [550, 21],
      "api-gateway": [330, 81],
      "order-service": [330, 141],
      "payment-service": [110, 201],
      "orders-db": [330, 201],
      rabbitmq: [550, 201],
      "stripe-adapter": [110, 261],
    }),
    order: [
      "web-frontend",
      "notification-worker",
      "api-gateway",
      "order-service",
      "payment-service",
      "orders-db",
      "rabbitmq",
      "stripe-adapter",
    ],
  },
  tree: {
    width: TREE_INDENT * 4 + NODE_W,
    height: (TREE_ROWS.length - 1) * TREE_PITCH + NODE_H,
    positions: Object.fromEntries(
      TREE_ROWS.map(([id, depth], row) => [id, { x: depth * TREE_INDENT, y: row * TREE_PITCH }]),
    ) as Record<ServiceId, Point>,
    order: TREE_ROWS.map(([id]) => id),
  },
};

export type EdgePaths = {
  /** Drawn from `from` to `to`. */
  line: string;
  /** The same route from `to` back to `from`, used for the impact highlight so it grows away from the failing service. */
  reverse: string;
  /** Chevron at the `to` end. */
  arrow: string;
};

const round = (value: number) => Math.round(value * 100) / 100;

export function edgePaths(layout: Layout, from: ServiceId, to: ServiceId): EdgePaths {
  const a = LAYOUTS[layout].positions[from];
  const b = LAYOUTS[layout].positions[to];

  if (layout === "wide" || a.x === b.x) {
    // Bottom centre of `from` to top centre of `to`: straight when aligned, an S-curve otherwise.
    const x1 = a.x + NODE_W / 2;
    const y1 = a.y + NODE_H;
    const x2 = b.x + NODE_W / 2;
    const y2 = b.y - 1;
    const my = (y1 + y2) / 2;
    return {
      line: `M${round(x1)} ${round(y1)}C${round(x1)} ${round(my)} ${round(x2)} ${round(my)} ${round(x2)} ${round(y2)}`,
      reverse: `M${round(x2)} ${round(y2)}C${round(x2)} ${round(my)} ${round(x1)} ${round(my)} ${round(x1)} ${round(y1)}`,
      arrow: `M${round(x2 - 4)} ${round(y2 - 6)}L${round(x2)} ${round(y2)}L${round(x2 + 4)} ${round(y2 - 6)}`,
    };
  }

  // Tree: a rail drops from `from` and turns right into `to`.
  const radius = 6;
  const rail = a.x + 12;
  const top = a.y + NODE_H;
  const mid = b.y + NODE_H / 2;
  const tip = b.x - 1;
  return {
    line: `M${rail} ${top}V${mid - radius}Q${rail} ${mid} ${rail + radius} ${mid}H${tip}`,
    reverse: `M${tip} ${mid}H${rail + radius}Q${rail} ${mid} ${rail} ${mid - radius}V${top}`,
    arrow: `M${tip - 5} ${mid - 4}L${tip} ${mid}L${tip - 5} ${mid + 4}`,
  };
}
