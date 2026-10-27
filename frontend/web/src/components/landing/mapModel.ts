/*
 * The live map in the hero: the Commerce demo that ships with Hydra (backend DemoSeed.cs), eight services and
 * the seven dependencies between them. A service on the left depends on the services to its right.
 *
 * Pure data and pure functions. LiveMap.tsx renders the map and owns its state; mapEngine.ts moves it.
 * Failures are kept as timestamps, so how far a failure has travelled is always derived from the clock.
 */

/* ---------- The services ---------- */

export type ServiceId = "web" | "gateway" | "orders" | "payments" | "stripe" | "orders-db" | "rabbitmq" | "notifier";

export type Service = {
  id: ServiceId;
  /** What kind of component it is, as in the demo data. */
  kind: string;
  /** Home position in map units. The map is MAP.width × MAP.height units and keeps that aspect ratio. */
  x: number;
  y: number;
  /** How near it floats: nearer services follow the pointer a little more. */
  depth: number;
  /** Order in which it bursts out of the file when the map first appears. */
  order: number;
};

export const MAP = { width: 1100, height: 1000 } as const;

/** Where the services burst out from when the map first appears: the compose.yaml chip. */
export const ORIGIN = { x: 560, y: 540 } as const;

export const SERVICES: readonly Service[] = [
  { id: "web", kind: "Frontend", x: 88, y: 460, depth: 1.15, order: 0 },
  { id: "gateway", kind: "Gateway", x: 340, y: 460, depth: 0.9, order: 1 },
  { id: "orders", kind: "Service", x: 592, y: 460, depth: 1.2, order: 2 },
  { id: "payments", kind: "Service", x: 825, y: 200, depth: 1, order: 3 },
  { id: "stripe", kind: "External service", x: 1023, y: 200, depth: 0.8, order: 4 },
  { id: "orders-db", kind: "Database", x: 825, y: 520, depth: 0.95, order: 5 },
  { id: "rabbitmq", kind: "Message broker", x: 825, y: 780, depth: 1.05, order: 6 },
  { id: "notifier", kind: "Worker", x: 592, y: 820, depth: 0.85, order: 7 },
];

/** `from` depends on `to`. Requests flow the same way. */
export type Dependency = { from: ServiceId; to: ServiceId };

export const DEPENDENCIES: readonly Dependency[] = [
  { from: "web", to: "gateway" },
  { from: "gateway", to: "orders" },
  { from: "orders", to: "payments" },
  { from: "orders", to: "orders-db" },
  { from: "orders", to: "rabbitmq" },
  { from: "notifier", to: "rabbitmq" },
  { from: "payments", to: "stripe" },
];

export function linkId(dependency: Dependency): string {
  return `${dependency.from}>${dependency.to}`;
}

export function serviceById(id: ServiceId): Service {
  const service = SERVICES.find((candidate) => candidate.id === id);
  if (!service) throw new Error(`Unknown service ${id}`);
  return service;
}

const dependentsCache = new Map<ServiceId, Map<ServiceId, number>>();

/**
 * Everything that depends on a service, directly or through others, with the number of hops.
 * This is what "potentially affected" means.
 */
export function dependentsOf(failing: ServiceId): Map<ServiceId, number> {
  const cached = dependentsCache.get(failing);
  if (cached) return cached;
  const hops = new Map<ServiceId, number>();
  let frontier: ServiceId[] = [failing];
  for (let distance = 1; frontier.length > 0; distance += 1) {
    const next: ServiceId[] = [];
    for (const target of frontier) {
      for (const dependency of DEPENDENCIES) {
        if (dependency.to === target && dependency.from !== failing && !hops.has(dependency.from)) {
          hops.set(dependency.from, distance);
          next.push(dependency.from);
        }
      }
    }
    frontier = next;
  }
  dependentsCache.set(failing, hops);
  return hops;
}

export function deepestHop(failing: ServiceId): number {
  return Math.max(0, ...dependentsOf(failing).values());
}

/** The curve of a dependency line: it leaves and arrives horizontally, like a wire. */
export function linkCurve(from: { x: number; y: number }, to: { x: number; y: number }): [number, number, number, number, number, number, number, number] {
  const bend = (to.x - from.x) * 0.5;
  return [from.x, from.y, from.x + bend, from.y, to.x - bend, to.y, to.x, to.y];
}

export function curvePath(curve: readonly number[]): string {
  const r = (value: number) => Math.round(value * 10) / 10;
  return `M${r(curve[0])} ${r(curve[1])}C${r(curve[2])} ${r(curve[3])} ${r(curve[4])} ${r(curve[5])} ${r(curve[6])} ${r(curve[7])}`;
}

/* ---------- Failures ---------- */

/** One hop of a failure, or of a recovery, takes this long. */
export const HOP_MS = 520;
/** How long "Recovered" stays on a service after the recovery has travelled all the way back. */
export const RECOVERED_HOLD_MS = 900;

/**
 * A failing service, or one that was just fixed. `since` is when it failed, or when it was fixed.
 * While recovering, `peak` is how far the failure had travelled when it was fixed.
 */
export type Incident = { phase: "failing" | "recovering"; since: number; peak: number };
export type Incidents = Partial<Record<ServiceId, Incident>>;

function stepsSince(incident: Incident, now: number): number {
  return Math.max(0, Math.floor((now - incident.since) / HOP_MS));
}

/** How many hops the failure has reached (failing), or how many hops have healed (recovering). */
export function reachOf(id: ServiceId, incident: Incident, now: number): number {
  const steps = stepsSince(incident, now);
  return incident.phase === "failing" ? Math.min(deepestHop(id), steps) : steps;
}

/** Fails a healthy service, or fixes a failing one. With `instant`, the result shows at once. */
export function toggleIncident(incidents: Incidents, id: ServiceId, now: number, instant: boolean): Incidents {
  const current = incidents[id];
  const past = (deepestHop(id) + 2) * HOP_MS + RECOVERED_HOLD_MS;
  if (current?.phase === "failing") {
    const peak = reachOf(id, current, now);
    return { ...incidents, [id]: { phase: "recovering", since: instant ? now - past : now, peak } };
  }
  return { ...incidents, [id]: { phase: "failing", since: instant ? now - past : now, peak: 0 } };
}

function recoveredUntil(incident: Incident): number {
  return incident.since + (incident.peak + 1) * HOP_MS + RECOVERED_HOLD_MS;
}

/** Drops recoveries that have finished. Returns the same object when nothing changed. */
export function pruneIncidents(incidents: Incidents, now: number): Incidents {
  let changed = false;
  const next: Incidents = {};
  for (const id of Object.keys(incidents) as ServiceId[]) {
    const incident = incidents[id];
    if (!incident) continue;
    if (incident.phase === "recovering" && now >= recoveredUntil(incident)) {
      changed = true;
      continue;
    }
    next[id] = incident;
  }
  return changed ? next : incidents;
}

/** When the map next changes by itself: a hop is reached or healed, or a recovery ends. */
export function nextChangeAt(incidents: Incidents, now: number): number | null {
  let next = Number.POSITIVE_INFINITY;
  for (const id of Object.keys(incidents) as ServiceId[]) {
    const incident = incidents[id];
    if (!incident) continue;
    const steps = stepsSince(incident, now);
    if (incident.phase === "failing") {
      if (steps < deepestHop(id)) next = Math.min(next, incident.since + (steps + 1) * HOP_MS);
    } else if (steps <= incident.peak) {
      next = Math.min(next, incident.since + (steps + 1) * HOP_MS);
    } else {
      next = Math.min(next, recoveredUntil(incident));
    }
  }
  return Number.isFinite(next) ? next : null;
}

/* ---------- What the map shows ---------- */

export type Role = "ok" | "failed" | "affected" | "recovered";

/**
 * idle: no failure anywhere. quiet: something failed, but not through this dependency.
 * charging: a failure is travelling along it now. impact: it carries a failure.
 * healing: a recovery is travelling along it now.
 */
export type EdgeState = "idle" | "quiet" | "charging" | "impact" | "healing";

export type MapView = {
  roles: Record<ServiceId, Role>;
  edges: Record<string, EdgeState>;
  failing: ServiceId[];
  recovering: ServiceId[];
  /** Potentially affected right now, in hop order. */
  affected: ServiceId[];
  /** Everything a current failure can reach, now or in the next hops. The rest of the map steps back. */
  reachable: Set<ServiceId>;
};

const ROLE_RANK: Record<Role, number> = { ok: 0, recovered: 1, affected: 2, failed: 3 };
const EDGE_RANK: Record<EdgeState, number> = { idle: 0, quiet: 0, healing: 1, charging: 2, impact: 3 };

export function viewOf(incidents: Incidents, now: number): MapView {
  const roles = Object.fromEntries(SERVICES.map((service) => [service.id, "ok"])) as Record<ServiceId, Role>;
  const edges: Record<string, EdgeState> = {};
  const failing: ServiceId[] = [];
  const recovering: ServiceId[] = [];
  const affectedHop = new Map<ServiceId, number>();
  const reachable = new Set<ServiceId>();
  const raise = (id: ServiceId, role: Role) => {
    if (ROLE_RANK[role] > ROLE_RANK[roles[id]]) roles[id] = role;
  };
  const mark = (key: string, state: EdgeState) => {
    if (!edges[key] || EDGE_RANK[state] > EDGE_RANK[edges[key]]) edges[key] = state;
  };

  for (const id of Object.keys(incidents) as ServiceId[]) {
    const incident = incidents[id];
    if (!incident) continue;
    const hops = dependentsOf(id);
    const reach = reachOf(id, incident, now);
    if (incident.phase === "failing") {
      failing.push(id);
      raise(id, "failed");
      reachable.add(id);
      for (const service of hops.keys()) reachable.add(service);
    } else {
      recovering.push(id);
      raise(id, "recovered");
    }
    for (const [service, hop] of hops) {
      const marked = incident.phase === "failing" ? hop <= reach : hop <= incident.peak && hop > reach;
      if (!marked) continue;
      raise(service, "affected");
      affectedHop.set(service, Math.min(hop, affectedHop.get(service) ?? hop));
    }
    for (const dependency of DEPENDENCIES) {
      const fromHop = hops.get(dependency.from);
      const onPath = fromHop !== undefined && (dependency.to === id || hops.has(dependency.to));
      if (!onPath) continue;
      const key = linkId(dependency);
      if (incident.phase === "failing") {
        if (fromHop <= reach) mark(key, "impact");
        else if (fromHop === reach + 1) mark(key, "charging");
      } else if (fromHop <= incident.peak) {
        if (fromHop === reach + 1) mark(key, "healing");
        else if (fromHop > reach + 1) mark(key, "impact");
      }
    }
  }

  const anyFailing = failing.length > 0;
  for (const dependency of DEPENDENCIES) {
    const key = linkId(dependency);
    if (!edges[key]) edges[key] = anyFailing ? "quiet" : "idle";
  }
  const affected = [...affectedHop.entries()]
    .filter(([id]) => roles[id] === "affected")
    .sort((a, b) => a[1] - b[1] || serviceById(a[0]).order - serviceById(b[0]).order)
    .map(([id]) => id);
  return { roles, edges, failing, recovering, affected, reachable };
}

/** What would be potentially affected if a service failed now, leaving out what is already failing. */
export function previewOf(id: ServiceId, incidents: Incidents): ServiceId[] {
  return [...dependentsOf(id).entries()]
    .filter(([service]) => incidents[service]?.phase !== "failing")
    .sort((a, b) => a[1] - b[1] || serviceById(a[0]).order - serviceById(b[0]).order)
    .map(([service]) => service);
}

/* ---------- Words ---------- */

function count(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

function list(ids: readonly ServiceId[]): string {
  return ids.join(", ");
}

export type StatusTone = "ok" | "alert" | "preview" | "recover";
export type Status = { tone: StatusTone; text: string; detail: string };

/** The status line on the map. Pointing at a healthy service shows what would happen if it failed. */
export function statusOf(view: MapView, preview: ServiceId | null, incidents: Incidents): Status {
  if (preview) {
    const would = previewOf(preview, incidents);
    return {
      tone: "preview",
      text: `If ${preview} fails`,
      detail:
        would.length === 0
          ? "Nothing depends on it"
          : `${count(would.length, "service")} would be potentially affected: ${list(would)}`,
    };
  }
  if (view.failing.length > 0) {
    const text =
      view.failing.length === 1
        ? `${view.failing[0]} is unhealthy`
        : `${count(view.failing.length, "service")} are unhealthy`;
    const them = view.failing.length === 1 ? "it" : "them";
    const detail =
      view.affected.length === 0
        ? deepestOfAll(view.failing) === 0
          ? `Nothing depends on ${them}`
          : `Following what depends on ${them}…`
        : `${count(view.affected.length, "service")} potentially affected: ${list(view.affected)}`;
    return { tone: "alert", text, detail };
  }
  if (view.recovering.length > 0) {
    return {
      tone: "recover",
      text: view.recovering.length === 1 ? `${view.recovering[0]} recovered` : `${count(view.recovering.length, "service")} recovered`,
      detail: "The map is returning to normal",
    };
  }
  return { tone: "ok", text: `All ${SERVICES.length} services OK`, detail: `${DEPENDENCIES.length} dependencies, read from one file` };
}

function deepestOfAll(ids: readonly ServiceId[]): number {
  return Math.max(0, ...ids.map(deepestHop));
}

/** What a screen reader hears after a service is broken or fixed. */
export function announcementOf(id: ServiceId, broke: boolean, incidentsAfter: Incidents): string {
  if (!broke) {
    const still = (Object.keys(incidentsAfter) as ServiceId[]).filter((other) => incidentsAfter[other]?.phase === "failing");
    return still.length === 0 ? `${id} recovered. All services are OK.` : `${id} recovered. Still unhealthy: ${list(still)}.`;
  }
  const affected = previewOf(id, incidentsAfter).filter((service) => service !== id);
  return affected.length === 0
    ? `${id} is unhealthy. Nothing depends on it.`
    : `${id} is unhealthy. ${count(affected.length, "service")} potentially affected: ${list(affected)}.`;
}

export const ROLE_TEXT: Record<Role, string> = {
  ok: "OK",
  failed: "Unhealthy",
  affected: "Potentially affected",
  recovered: "Recovered",
};
