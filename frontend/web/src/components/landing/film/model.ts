import {
  COMPOSE_EXCERPT,
  DEPENDENCIES,
  INCIDENT_SERVICE,
  SERVICE_IDS,
  analyzeImpact,
  edgeKey,
  summarizeImpact,
  type Impact,
  type ServiceId,
} from "../graph";
import { clamp01, easeInOut, easeOut, easeOutBack, seg, type Vec3 } from "./math";

/**
 * The film: one story told on a single 0..1 timeline `u`.
 *
 * Everything here is pure. `computeTimeline(u)` answers "how far along is every part of the
 * scene at this moment", and the renderer only draws that answer. The same function serves the
 * looping hero (u follows the clock), the scroll film (u follows the scrollbar) and the
 * click-to-break interaction (the incident part runs on its own clock).
 */

export const FILM_SECONDS = 26;

export type ChapterId = "write" | "save" | "map" | "watch" | "incident" | "recover";
export type Chapter = { id: ChapterId; label: string; from: number; to: number; title: string; text: string };

const SAMPLE_IMPACT = analyzeImpact(INCIDENT_SERVICE);

export const CHAPTERS: readonly Chapter[] = [
  {
    id: "write",
    label: "Write",
    from: 0,
    to: 0.22,
    title: "Start from the files you already have.",
    text: "Hydra reads configuration such as a compose file. It is read-only: nothing in your repository is executed.",
  },
  {
    id: "save",
    label: "Save",
    from: 0.22,
    to: 0.4,
    title: "What it finds is saved.",
    text: "Review what was found, then apply it. Services and dependencies are saved to the project.",
  },
  {
    id: "map",
    label: "Map",
    from: 0.4,
    to: 0.62,
    title: "One map of the whole system.",
    text: `${SERVICE_IDS.length} services and ${DEPENDENCIES.length} dependencies, each saved and linked. An arrow from A to B means A depends on B.`,
  },
  {
    id: "watch",
    label: "Watch",
    from: 0.62,
    to: 0.74,
    title: "Health stays attached.",
    text: "Runtime health is shown on every service and updates without reloading the page.",
  },
  {
    id: "incident",
    label: "Incident",
    from: 0.74,
    to: 0.9,
    title: "When one fails, see what it reaches.",
    text: `${INCIDENT_SERVICE} degrades. Following the dependencies backwards: ${summarizeImpact(SAMPLE_IMPACT).toLowerCase()}`,
  },
  {
    id: "recover",
    label: "Recover",
    from: 0.9,
    to: 1,
    title: "Then watch it recover.",
    text: `When ${INCIDENT_SERVICE} is healthy again, the map returns to normal.`,
  },
];

export function chapterIndexAt(u: number): number {
  let index = 0;
  CHAPTERS.forEach((chapter, i) => {
    if (u >= chapter.from) index = i;
  });
  return index;
}

/* ------------------------------------------------------------------ */
/* Code window content                                                 */
/* ------------------------------------------------------------------ */

export type CodeKind = "key" | "name" | "value";
export type CodeToken = { text: string; kind: CodeKind };

function buildCode(): CodeToken[][] {
  const lines: CodeToken[][] = [[{ text: "services:", kind: "key" }]];
  for (const row of COMPOSE_EXCERPT) {
    lines.push([{ text: `  ${row.service}:`, kind: "name" }]);
    lines.push([
      { text: "    depends_on: ", kind: "key" },
      { text: `[${row.dependsOn.join(", ")}]`, kind: "value" },
    ]);
  }
  return lines;
}

export const CODE_LINES: readonly (readonly CodeToken[])[] = buildCode();
const lineChars = (line: readonly CodeToken[]) => line.reduce((sum, token) => sum + token.text.length, 0);
export const TOTAL_CHARS = CODE_LINES.reduce((sum, line) => sum + lineChars(line), 0);

/* ------------------------------------------------------------------ */
/* 3D layout                                                           */
/* ------------------------------------------------------------------ */

export type FilmLayout = "wide" | "tall";

export type Layout3D = {
  kind: FilmLayout;
  /** Floor position [x, z] of each service. */
  nodes: Record<ServiceId, readonly [number, number]>;
  /** Footprint (w along x, d along z) and resting height of a service slab. */
  slab: { w: number; d: number; h: number };
  hub: Vec3;
  /** The code window: world position of its top-left corner and the vectors along its top and left edges. */
  window: { origin: Vec3; across: Vec3; down: Vec3 };
  target: Vec3;
  /** World size the default framing has to hold. */
  fit: { width: number; height: number };
  yaw: number;
  pitch: number;
  floor: { x0: number; x1: number; z0: number; z1: number };
  /** Axis the dependency curves bend along. */
  flowAxis: "x" | "z";
};

const WINDOW_W = 300;
const WINDOW_H = 208;

function windowAt(center: Vec3, yaw: number): Layout3D["window"] {
  const across: Vec3 = [Math.cos(yaw) * WINDOW_W, 0, Math.sin(yaw) * WINDOW_W];
  return {
    origin: [center[0] - across[0] / 2, center[1] + WINDOW_H / 2, center[2] - across[2] / 2],
    across,
    down: [0, -WINDOW_H, 0],
  };
}

const WIDE: Layout3D = {
  kind: "wide",
  nodes: {
    "web-frontend": [20, -40],
    "api-gateway": [135, -40],
    "order-service": [250, -40],
    "payment-service": [385, -150],
    "orders-db": [385, -40],
    rabbitmq: [385, 70],
    "notification-worker": [250, 150],
    "stripe-adapter": [520, -150],
  },
  slab: { w: 74, d: 50, h: 22 },
  hub: [-165, 0, -40],
  window: windowAt([-400, 128, -40], 0.34),
  target: [20, 40, -20],
  fit: { width: 1180, height: 520 },
  yaw: 0.2,
  pitch: 0.58,
  floor: { x0: -770, x1: 770, z0: -420, z1: 420 },
  flowAxis: "x",
};

const TALL: Layout3D = {
  kind: "tall",
  nodes: {
    "web-frontend": [-92, 120],
    "api-gateway": [-92, 40],
    "order-service": [-92, -40],
    "payment-service": [-92, -130],
    "stripe-adapter": [-92, -215],
    "orders-db": [10, -130],
    rabbitmq: [108, -130],
    "notification-worker": [108, -40],
  },
  slab: { w: 62, d: 44, h: 20 },
  hub: [0, 0, 240],
  window: windowAt([0, 150, 400], 0),
  target: [0, 30, 120],
  fit: { width: 400, height: 640 },
  yaw: 0,
  pitch: 0.95,
  floor: { x0: -420, x1: 420, z0: -420, z1: 560 },
  flowAxis: "z",
};

export const layout3d = (kind: FilmLayout): Layout3D => (kind === "wide" ? WIDE : TALL);

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

/** The order the services are saved in: the dependency chain first, then the rest. */
export const SAVE_ORDER: readonly ServiceId[] = [
  "web-frontend",
  "api-gateway",
  "order-service",
  "payment-service",
  "orders-db",
  "rabbitmq",
  "notification-worker",
  "stripe-adapter",
];

const LINE_FIRST_DEPARTURE = 0.225;
const LINE_STAGGER = 0.009;
const LINE_FLIGHT = 0.07;
const NODE_FIRST_DEPARTURE = 0.405;
const NODE_STAGGER = 0.02;
const NODE_FLIGHT = 0.06;
/** The film position the scene rests at while the visitor breaks a service by hand. */
export const REST_U = 0.7;

export const INCIDENT_START = 0.74;
const WAVE_START = 0.77;
const RECOVER_START = 0.9;

export type NodeTimeline = {
  /** 0..1, how far the slab has risen (overshoots slightly). */
  rise: number;
  /** 0..1, the "saved" rectangle popping in. */
  badge: number;
  /** 0..1, the service itself reports a problem. */
  heat: number;
  /** 0..1, the service is potentially affected by a failing dependency. */
  affected: number;
  /** 0..1, green flash after recovery. */
  recovered: number;
  /** Film position at which the packet reaches the slab. */
  arrival: number;
};

export type EdgeTimeline = {
  key: string;
  from: ServiceId;
  to: ServiceId;
  /** 0..1, the line drawing itself. */
  draw: number;
  /** 0..1, the red wave travelling from `to` back to `from`; 0 when there is none. */
  wave: number;
  /** 0..1, how red the line is once the wave has passed. */
  hot: number;
};

export type PacketTimeline = { kind: "line"; index: number; t: number } | { kind: "node"; id: ServiceId; t: number };

export type IncidentTimeline = {
  id: ServiceId;
  impact: Impact;
  /** Three shock rings, each 0..1. */
  shock: readonly [number, number, number];
  /** Green ring after recovery, 0..1. */
  recoverRing: number;
  /** 0..1 visibility of the alert card. */
  alert: number;
  /** Services shown as potentially affected so far. */
  affectedShown: number;
  banner: "alert" | "recovered";
  /** Brief red flash over the whole stage. */
  flash: number;
};

export type Timeline = {
  u: number;
  chapter: number;
  /** Characters of the code typed so far (fractional). */
  typed: number;
  /** 0..1 position of the read bar over the code lines. */
  scan: number;
  windowAlpha: number;
  savedLines: number;
  totalLines: number;
  savedNodes: number;
  drawnEdges: number;
  hubIn: number;
  /** Brief brightening each time something arrives at the hub. */
  hubPulse: number;
  flow: boolean;
  nodes: Record<ServiceId, NodeTimeline>;
  edges: EdgeTimeline[];
  packets: PacketTimeline[];
  incident: IncidentTimeline | null;
};

export type TimelineInput = {
  u: number;
  /** Position on the incident part of the timeline. Equals `u` unless the visitor broke a service by hand. */
  incidentU?: number;
  failing?: ServiceId;
};

export function computeTimeline({ u, incidentU = u, failing = INCIDENT_SERVICE }: TimelineInput): Timeline {
  const totalLines = CODE_LINES.length;

  /* Write and save */
  const typed = TOTAL_CHARS * easeInOut(seg(u, 0.015, 0.2));
  const scan = seg(u, 0.2, 0.34);
  const windowAlpha = easeOut(seg(u, 0, 0.04)) * (1 - 0.5 * easeInOut(seg(u, 0.36, 0.46)));

  const packets: PacketTimeline[] = [];
  let savedLines = 0;
  let hubPulse = 0;
  for (let i = 0; i < totalLines; i++) {
    const depart = LINE_FIRST_DEPARTURE + i * LINE_STAGGER;
    const arrive = depart + LINE_FLIGHT;
    const t = (u - depart) / LINE_FLIGHT;
    if (t > 0 && t < 1) packets.push({ kind: "line", index: i, t });
    if (u >= arrive) {
      savedLines++;
      hubPulse += Math.exp(-(u - arrive) / 0.012);
    }
  }

  /* Map: services arrive from the hub one after another */
  const nodes = {} as Record<ServiceId, NodeTimeline>;
  let savedNodes = 0;
  SAVE_ORDER.forEach((id, i) => {
    const depart = NODE_FIRST_DEPARTURE + i * NODE_STAGGER;
    const arrival = depart + NODE_FLIGHT;
    const t = (u - depart) / NODE_FLIGHT;
    if (t > 0 && t < 1) packets.push({ kind: "node", id, t });
    if (u >= arrival) hubPulse += 0.6 * Math.exp(-(u - arrival) / 0.01);
    const badge = easeOutBack(seg(u, arrival + 0.025, arrival + 0.065));
    if (badge >= 0.999) savedNodes++;
    nodes[id] = {
      rise: easeOutBack(seg(u, arrival, arrival + 0.05)),
      badge,
      heat: 0,
      affected: 0,
      recovered: 0,
      arrival,
    };
  });

  const edges: EdgeTimeline[] = DEPENDENCIES.map(([from, to]) => {
    const start = Math.max(nodes[from].arrival, nodes[to].arrival) + 0.015;
    return { key: edgeKey(from, to), from, to, draw: easeInOut(seg(u, start, start + 0.05)), wave: 0, hot: 0 };
  });
  const drawnEdges = edges.filter((edge) => edge.draw >= 0.999).length;

  /* Incident and recovery, on their own clock */
  let incident: IncidentTimeline | null = null;
  if (incidentU >= INCIDENT_START) {
    const impact = analyzeImpact(failing);
    const depths = Object.values(impact.depth) as number[];
    const maxDepth = Math.max(1, ...depths);
    const levelDuration = Math.min(0.035, 0.11 / maxDepth);
    const recoverAt = (level: number) => easeInOut(seg(incidentU, RECOVER_START + 0.005 + 0.012 * level, RECOVER_START + 0.045 + 0.012 * level));

    const failingRecovery = easeInOut(seg(incidentU, RECOVER_START, RECOVER_START + 0.04));
    nodes[failing].heat = easeOut(seg(incidentU, INCIDENT_START, INCIDENT_START + 0.03)) * (1 - failingRecovery);
    nodes[failing].recovered = failingRecovery * (1 - seg(incidentU, 0.96, 1));

    let affectedShown = 0;
    for (const id of SERVICE_IDS) {
      const level = impact.depth[id];
      if (id === failing || level === undefined) continue;
      const reached = easeOut(seg(incidentU, WAVE_START + level * levelDuration - 0.008, WAVE_START + level * levelDuration + 0.02));
      if (reached > 0.5) affectedShown++;
      const recovery = recoverAt(level);
      nodes[id].affected = reached * (1 - recovery);
      nodes[id].recovered = recovery * (1 - seg(incidentU, 0.96 + 0.004 * level, 1));
    }

    for (const edge of edges) {
      const level = impact.depth[edge.to];
      if (level === undefined) continue;
      const wave = seg(incidentU, WAVE_START + level * levelDuration, WAVE_START + (level + 1) * levelDuration);
      edge.wave = easeInOut(wave);
      edge.hot = (wave >= 1 ? 1 : 0.6 * wave) * (1 - recoverAt(level + 1));
    }

    const ring = (index: number) => easeOut(seg(incidentU, INCIDENT_START + index * 0.015, INCIDENT_START + 0.12 + index * 0.015));
    const recovering = incidentU >= RECOVER_START;
    incident = {
      id: failing,
      impact,
      shock: [ring(0), ring(1), ring(2)],
      recoverRing: easeOut(seg(incidentU, RECOVER_START, RECOVER_START + 0.07)),
      alert: easeOut(seg(incidentU, INCIDENT_START + 0.005, INCIDENT_START + 0.03)) * (1 - easeOut(seg(incidentU, 0.975, 1))),
      affectedShown,
      banner: recovering ? "recovered" : "alert",
      flash: (1 - seg(incidentU, INCIDENT_START, INCIDENT_START + 0.06)) * (incidentU >= INCIDENT_START ? 1 : 0),
    };
  }

  const chapterU = incidentU >= INCIDENT_START ? Math.max(u, incidentU) : u;
  return {
    u,
    chapter: chapterIndexAt(chapterU),
    typed,
    scan,
    windowAlpha,
    savedLines,
    totalLines,
    savedNodes,
    drawnEdges,
    hubIn: easeOut(seg(u, 0.03, 0.16)),
    hubPulse: clamp01(hubPulse),
    flow: u > 0.66,
    nodes,
    edges,
    packets,
    incident,
  };
}

/** What the visitor sees described in words while a service is broken by hand. */
export function describeFailure(id: ServiceId): string {
  return `${id} fails. ${summarizeImpact(analyzeImpact(id))}`;
}

/** The longest-lived part of a hand-made incident, in seconds (alert, waves, recovery). */
export const POKE_SECONDS = 9;

/** Maps seconds since the click to a position on the incident part of the timeline. */
export function pokeToIncidentU(seconds: number): number {
  const incidentSeconds = 6;
  if (seconds < incidentSeconds) return INCIDENT_START + (seconds / incidentSeconds) * (RECOVER_START - INCIDENT_START);
  return RECOVER_START + ((seconds - incidentSeconds) / (POKE_SECONDS - incidentSeconds)) * (1 - RECOVER_START);
}
