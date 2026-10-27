/*
 * Everything the hero animation shows: the compose.yaml that gets typed, the six services it
 * describes, how they depend on each other, the order the story plays in, and what a failure
 * potentially affects. Pure data and pure functions, so the server renders the still frame from the
 * same source, and the same rules drive the story and a visitor's own clicks.
 */

/* ---------- The services ---------- */

export type ServiceId = "web" | "api" | "orders" | "catalog" | "payments" | "db";

type Point = { x: number; y: number };

export type Service = {
  id: ServiceId;
  /** Order in which the service flies from the file onto the map. */
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
  { id: "catalog", order: 3, wide: { x: 62, y: 74 }, tall: { x: 61, y: 58 } },
  { id: "payments", order: 4, wide: { x: 88, y: 26 }, tall: { x: 9, y: 83 } },
  { id: "db", order: 5, wide: { x: 88, y: 74 }, tall: { x: 61, y: 83 } },
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

/** The service that fails when the story plays by itself. */
export const STORY_FAILING: ServiceId = "payments";

export function serviceById(id: ServiceId): Service {
  const service = SERVICES.find((candidate) => candidate.id === id);
  if (!service) throw new Error(`Unknown service ${id}`);
  return service;
}

const dependentsCache = new Map<ServiceId, Map<ServiceId, number>>();

/**
 * Walks the dependencies backwards from a failing service: everything that depends on it, directly or
 * through others, with the number of hops. This is what "potentially affected" means.
 */
export function dependentsOf(failing: ServiceId): Map<ServiceId, number> {
  const cached = dependentsCache.get(failing);
  if (cached) return cached;
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
  dependentsCache.set(failing, hops);
  return hops;
}

export function deepestHop(failing: ServiceId): number {
  return Math.max(0, ...dependentsOf(failing).values());
}

/* ---------- Choreography: one set of numbers for the script and the styles ---------- */

/** When the first service lifts off the file, after the map phase starts. */
export const FLY_LEAD_MS = 120;
/** Time between two services lifting off. */
export const FLY_STAGGER_MS = 150;
/** How long one service takes to fly from the file to its point. */
export const FLY_MS = 780;
/** Recovery travels one hop per step of this length (the ink pulse takes a little less). */
export const HEAL_STEP_MS = 480;

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
  /** The service this line declares, if it is a service key such as "  web:". */
  defines?: ServiceId;
  /** For a depends_on line: when its first dependency is drawn on the map, in ms from the start of "map". */
  glowAt?: number;
};

const CHAR_MS = 13;
const LINE_PAUSE_MS = 70;
const TYPE_LEAD_MS = 250;

function isServiceId(value: string): value is ServiceId {
  return SERVICES.some((service) => service.id === value);
}

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

/** When an edge starts to draw, in ms from the start of the "map" phase: once both ends have landed. */
export function edgeDrawAt(dependency: Dependency): number {
  return FLY_LEAD_MS + dependencyOrder(dependency) * FLY_STAGGER_MS + FLY_MS + 60;
}

function buildLines(): { lines: CodeLine[]; total: number } {
  let clock = TYPE_LEAD_MS;
  let currentService: ServiceId | undefined;
  const lines = COMPOSE_LINES.map((raw, index) => {
    const indent = raw.length - raw.trimStart().length;
    const body = raw.slice(indent);
    const duration = body.length * CHAR_MS;
    const key = body.replace(/:.*$/, "");
    const defines = indent === 2 && isServiceId(key) ? key : undefined;
    if (defines) currentService = defines;
    let glowAt: number | undefined;
    if (key === "depends_on" && currentService) {
      const owner = currentService;
      const drawn = DEPENDENCIES.filter((dependency) => dependency.from === owner).map(edgeDrawAt);
      glowAt = drawn.length > 0 ? Math.min(...drawn) : undefined;
    }
    const line: CodeLine = {
      number: index + 1,
      indent,
      tokens: tokenize(body, indent === 2),
      length: body.length,
      start: clock,
      duration,
      defines,
      glowAt,
    };
    clock += duration + LINE_PAUSE_MS;
    return line;
  });
  return { lines, total: clock };
}

/* ---------- The map geometry ---------- */

/* Canvas sizes used for the edge geometry (same aspect ratios as the CSS canvases). */
export const WIDE_VIEW = { width: 1000, height: 625 } as const;
export const TALL_VIEW = { width: 400, height: 500 } as const;

function at(service: Service, layout: "wide" | "tall"): Point {
  const view = layout === "wide" ? WIDE_VIEW : TALL_VIEW;
  const point = service[layout];
  return { x: (point.x / 100) * view.width, y: (point.y / 100) * view.height };
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

const built = buildLines();
export const CODE_LINES: readonly CodeLine[] = built.lines;
/** Total typing time, in ms. */
export const TYPE_MS = built.total;

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
  | "heal1"
  | "heal2"
  | "heal3"
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
  { id: "map", step: "map", ms: 3000 },
  { id: "check", step: "health", ms: 2100 },
  { id: "fail", step: "fail", ms: 1500 },
  { id: "spread1", step: "fail", ms: 750 },
  { id: "spread2", step: "fail", ms: 750 },
  { id: "spread3", step: "fail", ms: 2600 },
  { id: "recover", step: "recover", ms: HEAL_STEP_MS + 160 },
  { id: "heal1", step: "recover", ms: HEAL_STEP_MS },
  { id: "heal2", step: "recover", ms: HEAL_STEP_MS },
  { id: "heal3", step: "recover", ms: 1300 },
  { id: "calm", step: "recover", ms: 1500 },
];

export function phaseIndex(id: PhaseId): number {
  return TIMELINE.findIndex((phase) => phase.id === id);
}

/** The still frame: the failure and everything it potentially affects. */
export const POSTER_PHASE: PhaseId = "spread3";
/** How long the still frame holds before the story moves on. */
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

/* ---------- Incidents: what a failure shows on the map ---------- */

/**
 * A failing service and how far the failure has travelled, in hops.
 * While `healing`, the service has recovered and `reach` is how far the recovery has travelled back.
 */
export type Incident = { failing: ServiceId; reach: number; healing: boolean };

/** The incident the story shows in a phase, if any. */
export function storyIncident(phase: PhaseId): Incident | null {
  switch (phase) {
    case "fail":
      return { failing: STORY_FAILING, reach: 0, healing: false };
    case "spread1":
      return { failing: STORY_FAILING, reach: 1, healing: false };
    case "spread2":
      return { failing: STORY_FAILING, reach: 2, healing: false };
    case "spread3":
      return { failing: STORY_FAILING, reach: 3, healing: false };
    case "recover":
      return { failing: STORY_FAILING, reach: 0, healing: true };
    case "heal1":
      return { failing: STORY_FAILING, reach: 1, healing: true };
    case "heal2":
      return { failing: STORY_FAILING, reach: 2, healing: true };
    case "heal3":
      return { failing: STORY_FAILING, reach: 3, healing: true };
    default:
      return null;
  }
}

/** What the map shows before any failure: nothing yet, freshly saved, or healthy. */
export type MapState = "hidden" | "saved" | "ok";

export function storyMapState(phase: PhaseId): MapState {
  if (phase === "clear" || phase === "type" || phase === "read") return "hidden";
  return phase === "map" ? "saved" : "ok";
}

export type Role = "hidden" | "saved" | "ok" | "failed" | "affected" | "recovered";

export function roleOf(id: ServiceId, map: MapState, incident: Incident | null): Role {
  if (map === "hidden") return "hidden";
  if (!incident) return map;
  if (id === incident.failing) return incident.healing ? "recovered" : "failed";
  const hop = dependentsOf(incident.failing).get(id);
  if (hop === undefined) return "ok";
  // Failing: marked once the failure reaches it. Healing: clear once the recovery does.
  if (incident.healing) return hop > incident.reach ? "affected" : "ok";
  return hop <= incident.reach ? "affected" : "ok";
}

/** True for services a failure never reaches, while that failure is on screen. */
export function isBystander(id: ServiceId, incident: Incident | null): boolean {
  return incident !== null && !incident.healing && id !== incident.failing && !dependentsOf(incident.failing).has(id);
}

/**
 * hidden: not on the map yet. shown: a normal dependency. quiet: dimmed, the failure never travels here.
 * charging: the failure is travelling along it right now. impact: it carries the failure.
 * healing: the recovery is travelling along it right now.
 */
export type EdgeState = "hidden" | "shown" | "quiet" | "charging" | "impact" | "healing";

export function edgeState(dependency: Dependency, map: MapState, incident: Incident | null): EdgeState {
  if (map === "hidden") return "hidden";
  if (!incident) return "shown";
  const hops = dependentsOf(incident.failing);
  const onPath = hops.has(dependency.from) && (dependency.to === incident.failing || hops.has(dependency.to));
  if (!onPath) return incident.healing ? "shown" : "quiet";
  const fromHop = hops.get(dependency.from) ?? 0;
  if (incident.healing) {
    if (fromHop <= incident.reach) return "shown";
    return fromHop === incident.reach + 1 ? "healing" : "impact";
  }
  if (fromHop <= incident.reach) return "impact";
  return fromHop === incident.reach + 1 ? "charging" : "shown";
}

export const BADGE_TEXT: Record<Exclude<Role, "hidden">, string> = {
  saved: "Saved",
  ok: "OK",
  failed: "Unhealthy",
  affected: "Potentially affected",
  recovered: "Recovered",
};

export type StatusIcon = "wait" | "read" | "save" | "check" | "alert" | "recover";

function servicesPhrase(count: number): string {
  return `${count} ${count === 1 ? "service" : "services"}`;
}

/** The one-line status at the top of the map. */
export function statusOf(phase: PhaseId | "explore", incident: Incident | null): { icon: StatusIcon; text: string } {
  if (incident) {
    if (incident.healing) return { icon: "recover", text: `${incident.failing} recovered` };
    const hops = dependentsOf(incident.failing);
    if (incident.reach <= 0) {
      return {
        icon: "alert",
        text: hops.size === 0 ? `${incident.failing} is unhealthy · nothing depends on it` : `${incident.failing} is unhealthy`,
      };
    }
    const reached = [...hops.values()].filter((hop) => hop <= incident.reach).length;
    return { icon: "alert", text: `${servicesPhrase(reached)} potentially affected` };
  }
  switch (phase) {
    case "clear":
    case "type":
      return { icon: "wait", text: "Waiting for compose.yaml" };
    case "read":
      return { icon: "read", text: "Reading compose.yaml" };
    case "map":
      return { icon: "save", text: `Saved ${SERVICES.length} services, ${DEPENDENCIES.length} dependencies` };
    default:
      return { icon: "check", text: `All ${SERVICES.length} services OK` };
  }
}

/** What a screen reader hears after a visitor breaks or restores a service. */
export function announcementFor(incident: Incident | null, restored: ServiceId | null): string {
  if (restored) return `${restored} recovered. All services are OK.`;
  if (!incident) return "";
  const names = [...dependentsOf(incident.failing).keys()];
  if (names.length === 0) return `${incident.failing} is unhealthy. Nothing depends on it.`;
  return `${incident.failing} is unhealthy. ${servicesPhrase(names.length)} potentially affected: ${names.join(", ")}.`;
}
