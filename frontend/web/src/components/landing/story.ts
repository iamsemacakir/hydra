/*
 * Everything the hero animation shows: the compose.yaml that gets typed, the six services it
 * describes, how they depend on each other, and the order the story plays in.
 * Pure data and pure functions, so the server can render the still frame from the same source.
 */

/* ---------- The file ---------- */

export const COMPOSE_LINES: readonly string[] = [
  "services:",
  "  web:",
  "    image: shop/web",
  "    depends_on: [api]",
  "  api:",
  "    image: shop/api",
  "    depends_on: [orders, catalog]",
  "  orders:",
  "    image: shop/orders",
  "    depends_on: [payments, db]",
  "  catalog:",
  "    image: shop/catalog",
  "    depends_on: [db]",
  "  payments:",
  "    image: shop/payments",
  "  db:",
  "    image: postgres:17",
];

export type TokenKind = "service" | "key" | "value" | "punct";
export type Token = { text: string; kind: TokenKind };
export type CodeLine = {
  number: number;
  indent: number;
  tokens: Token[];
  /** Characters typed after the indentation. */
  length: number;
  /** When typing of this line starts, in ms from the start of the "type" phase. */
  start: number;
  /** How long the line takes to type, in ms. */
  duration: number;
};

const CHAR_MS = 13;
const LINE_PAUSE_MS = 70;
const TYPE_LEAD_MS = 250;

function tokenize(body: string, isService: boolean): Token[] {
  const match = /^([\w-]+)(:)(\s?)(.*)$/.exec(body);
  if (!match) return [{ text: body, kind: "value" }];
  const [, key, colon, space, rest] = match;
  const tokens: Token[] = [
    { text: key, kind: isService ? "service" : "key" },
    { text: colon + space, kind: "punct" },
  ];
  // Split "[payments, db]" into names and punctuation; plain values stay whole.
  for (const part of rest.split(/(\[|\]|, )/)) {
    if (!part) continue;
    tokens.push({ text: part, kind: part === "[" || part === "]" || part === ", " ? "punct" : "value" });
  }
  return tokens;
}

function buildLines(): { lines: CodeLine[]; total: number } {
  let clock = TYPE_LEAD_MS;
  const lines = COMPOSE_LINES.map((raw, index) => {
    const indent = raw.length - raw.trimStart().length;
    const body = raw.slice(indent);
    const duration = body.length * CHAR_MS;
    const line: CodeLine = {
      number: index + 1,
      indent,
      tokens: tokenize(body, indent === 2),
      length: body.length,
      start: clock,
      duration,
    };
    clock += duration + LINE_PAUSE_MS;
    return line;
  });
  return { lines, total: clock };
}

const built = buildLines();
export const CODE_LINES: readonly CodeLine[] = built.lines;
/** Total typing time, in ms. */
export const TYPE_MS = built.total;

/* ---------- The map ---------- */

export type ServiceId = "web" | "api" | "orders" | "catalog" | "payments" | "db";

type Point = { x: number; y: number };

export type Service = {
  id: ServiceId;
  /** Order in which the point appears. */
  order: number;
  /** Position in the wide map (left to right), in percent of the canvas. */
  wide: Point;
  /** Position in the tall map used on phones (top to bottom), in percent of the canvas. */
  tall: Point;
};

export const SERVICES: readonly Service[] = [
  { id: "web", order: 0, wide: { x: 12, y: 50 }, tall: { x: 9, y: 8 } },
  { id: "api", order: 1, wide: { x: 37, y: 50 }, tall: { x: 9, y: 33 } },
  { id: "orders", order: 2, wide: { x: 62, y: 26 }, tall: { x: 9, y: 58 } },
  { id: "catalog", order: 3, wide: { x: 62, y: 74 }, tall: { x: 70, y: 58 } },
  { id: "payments", order: 4, wide: { x: 88, y: 26 }, tall: { x: 9, y: 83 } },
  { id: "db", order: 5, wide: { x: 88, y: 74 }, tall: { x: 70, y: 83 } },
];

/** `from` depends on `to`, exactly as compose.yaml says. */
export type Dependency = { from: ServiceId; to: ServiceId };

export const DEPENDENCIES: readonly Dependency[] = [
  { from: "web", to: "api" },
  { from: "api", to: "orders" },
  { from: "api", to: "catalog" },
  { from: "orders", to: "payments" },
  { from: "orders", to: "db" },
  { from: "catalog", to: "db" },
];

/** The service that fails in the story. */
export const FAILING: ServiceId = "payments";

/**
 * Walks the dependencies backwards from the failing service: everything that depends on it,
 * directly or through others, with the number of hops. This is what "potentially affected" means.
 */
export function dependentsOf(failing: ServiceId): Map<ServiceId, number> {
  const hops = new Map<ServiceId, number>();
  let frontier: ServiceId[] = [failing];
  let distance = 0;
  while (frontier.length > 0) {
    distance += 1;
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
  return hops;
}

export const AFFECTED_HOPS = dependentsOf(FAILING);
export const MAX_HOP = Math.max(...AFFECTED_HOPS.values());

/* Canvas sizes used for the edge geometry (same aspect ratios as the CSS canvases). */
export const WIDE_VIEW = { width: 1000, height: 625 } as const;
export const TALL_VIEW = { width: 400, height: 500 } as const;

function at(service: Service, layout: "wide" | "tall"): Point {
  const view = layout === "wide" ? WIDE_VIEW : TALL_VIEW;
  const point = service[layout];
  return { x: (point.x / 100) * view.width, y: (point.y / 100) * view.height };
}

function serviceById(id: ServiceId): Service {
  const service = SERVICES.find((candidate) => candidate.id === id);
  if (!service) throw new Error(`Unknown service ${id}`);
  return service;
}

/** A smooth S-curve between two points: horizontal in the wide map, vertical in the tall one. */
export function dependencyPath(dependency: Dependency, layout: "wide" | "tall"): string {
  const a = at(serviceById(dependency.from), layout);
  const b = at(serviceById(dependency.to), layout);
  const round = (value: number) => Math.round(value * 10) / 10;
  if (layout === "wide") {
    const bend = (b.x - a.x) / 2;
    return `M${round(a.x)} ${round(a.y)}C${round(a.x + bend)} ${round(a.y)} ${round(b.x - bend)} ${round(b.y)} ${round(b.x)} ${round(b.y)}`;
  }
  const bend = (b.y - a.y) / 2;
  return `M${round(a.x)} ${round(a.y)}C${round(a.x)} ${round(a.y + bend)} ${round(b.x)} ${round(b.y - bend)} ${round(b.x)} ${round(b.y)}`;
}

/** Edges appear once both of their points are on the map. */
export function dependencyOrder(dependency: Dependency): number {
  return Math.max(serviceById(dependency.from).order, serviceById(dependency.to).order);
}

/* ---------- The timeline ---------- */

export type PhaseId =
  | "clear"
  | "type"
  | "read"
  | "map"
  | "check"
  | "fail"
  | "spread1"
  | "spread2"
  | "spread3"
  | "recover"
  | "calm";

export type StepId = "write" | "save" | "map" | "health" | "fail" | "recover";

export const STEPS: readonly { id: StepId; label: string }[] = [
  { id: "write", label: "Write" },
  { id: "save", label: "Save" },
  { id: "map", label: "Map" },
  { id: "health", label: "Health" },
  { id: "fail", label: "Fail" },
  { id: "recover", label: "Recover" },
];

export type Phase = { id: PhaseId; step: StepId; ms: number };

export const TIMELINE: readonly Phase[] = [
  { id: "clear", step: "write", ms: 650 },
  { id: "type", step: "write", ms: TYPE_MS + 450 },
  { id: "read", step: "save", ms: 1700 },
  { id: "map", step: "map", ms: 2500 },
  { id: "check", step: "health", ms: 2100 },
  { id: "fail", step: "fail", ms: 1200 },
  { id: "spread1", step: "fail", ms: 750 },
  { id: "spread2", step: "fail", ms: 750 },
  { id: "spread3", step: "fail", ms: 2700 },
  { id: "recover", step: "recover", ms: 1400 },
  { id: "calm", step: "recover", ms: 2200 },
];

export function phaseIndex(id: PhaseId): number {
  return TIMELINE.findIndex((phase) => phase.id === id);
}

/** The still frame: the failure and everything it potentially affects. */
export const POSTER_PHASE: PhaseId = "spread3";
/** How long the still frame holds before the story plays from the start. */
export const POSTER_HOLD_MS = 1900;

export function stepDuration(step: StepId): number {
  return TIMELINE.filter((phase) => phase.step === step).reduce((sum, phase) => sum + phase.ms, 0);
}

/** Time already spent in a step when `phase` begins, plus `intoPhase` ms. */
export function elapsedInStep(phase: PhaseId, intoPhase: number): number {
  const index = phaseIndex(phase);
  const step = TIMELINE[index].step;
  let elapsed = intoPhase;
  for (let i = index - 1; i >= 0 && TIMELINE[i].step === step; i -= 1) elapsed += TIMELINE[i].ms;
  return elapsed;
}

/* ---------- What each service shows in a phase ---------- */

export type Role = "hidden" | "saved" | "ok" | "failed" | "affected" | "recovered";

const SPREAD: Partial<Record<PhaseId, number>> = { fail: 0, spread1: 1, spread2: 2, spread3: 3 };

export function roleOf(id: ServiceId, phase: PhaseId): Role {
  switch (phase) {
    case "clear":
    case "type":
    case "read":
      return "hidden";
    case "map":
      return "saved";
    case "check":
    case "calm":
      return "ok";
    case "recover":
      return id === FAILING ? "recovered" : "ok";
    default: {
      if (id === FAILING) return "failed";
      const hop = AFFECTED_HOPS.get(id);
      const reach = SPREAD[phase] ?? 0;
      return hop !== undefined && hop <= reach ? "affected" : "ok";
    }
  }
}

/** True for services the failure never reaches, while the failure is on screen. */
export function isBystander(id: ServiceId, phase: PhaseId): boolean {
  return SPREAD[phase] !== undefined && id !== FAILING && !AFFECTED_HOPS.has(id);
}

/**
 * hidden: not on the map yet. shown: a normal dependency. quiet: dimmed, the failure never travels here.
 * charging: the failure is travelling along it right now (a red pulse). impact: it carries the failure.
 */
export type EdgeState = "hidden" | "shown" | "quiet" | "charging" | "impact";

export function edgeState(dependency: Dependency, phase: PhaseId): EdgeState {
  if (phase === "clear" || phase === "type" || phase === "read") return "hidden";
  const reach = SPREAD[phase];
  if (reach === undefined) return "shown";
  const onPath = AFFECTED_HOPS.has(dependency.from) && (dependency.to === FAILING || AFFECTED_HOPS.has(dependency.to));
  if (!onPath) return "quiet";
  const fromHop = AFFECTED_HOPS.get(dependency.from) ?? 0;
  if (fromHop <= reach) return "impact";
  return fromHop === reach + 1 ? "charging" : "shown";
}

export const BADGE_TEXT: Record<Exclude<Role, "hidden">, string> = {
  saved: "Saved",
  ok: "OK",
  failed: "Unhealthy",
  affected: "Potentially affected",
  recovered: "Recovered",
};

export type StatusIcon = "wait" | "read" | "save" | "check" | "alert" | "recover";

export function statusOf(phase: PhaseId): { icon: StatusIcon; text: string } {
  const affected = (count: number) => `${count} ${count === 1 ? "service" : "services"} potentially affected`;
  switch (phase) {
    case "clear":
    case "type":
      return { icon: "wait", text: "Waiting for compose.yaml" };
    case "read":
      return { icon: "read", text: "Reading compose.yaml" };
    case "map":
      return { icon: "save", text: `Saved ${SERVICES.length} services, ${DEPENDENCIES.length} dependencies` };
    case "check":
    case "calm":
      return { icon: "check", text: `All ${SERVICES.length} services OK` };
    case "fail":
      return { icon: "alert", text: `${FAILING} is unhealthy` };
    case "spread1":
      return { icon: "alert", text: affected(1) };
    case "spread2":
      return { icon: "alert", text: affected(2) };
    case "spread3":
      return { icon: "alert", text: affected(AFFECTED_HOPS.size) };
    case "recover":
      return { icon: "recover", text: `${FAILING} recovered` };
  }
}
