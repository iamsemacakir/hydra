import { DEPENDENCIES, INCIDENT_SERVICE, SERVICE_IDS, analyzeImpact, edgeKey, type ServiceId } from "../graph";

/**
 * Positions and paths for the small animated graphs. Pure data, so the scenes only draw it.
 * An arrow from A to B means A depends on B. The wide layout flows left to right, the tall
 * one top to bottom for narrow screens.
 */

export type GraphKind = "wide" | "tall";

export type EdgeShape = {
  key: string;
  from: ServiceId;
  to: ServiceId;
  /** Curve from the border of `from` to the border of `to`. */
  d: string;
  /** The same curve drawn the other way, for the failure travelling back. */
  back: string;
  /** Arrowhead at the `to` end. */
  arrow: string;
  /** Slightly generous length, for stroke-dash drawing. */
  length: number;
};

export type GraphGeometry = {
  kind: GraphKind;
  /** Wide graphs draw each service as a point with its name below; tall ones as a labelled pill. */
  node: "point" | "pill";
  /** Radius of a point. */
  radius: number;
  width: number;
  height: number;
  pill: { width: number; height: number };
  font: number;
  position: Record<ServiceId, readonly [number, number]>;
  edges: readonly EdgeShape[];
};

const WIDE_POSITION: Record<ServiceId, readonly [number, number]> = {
  "web-frontend": [70, 165],
  "api-gateway": [210, 165],
  "order-service": [350, 165],
  "payment-service": [490, 75],
  "orders-db": [490, 165],
  rabbitmq: [490, 255],
  "stripe-adapter": [630, 75],
  "notification-worker": [630, 255],
};

const TALL_POSITION: Record<ServiceId, readonly [number, number]> = {
  "web-frontend": [210, 40],
  "api-gateway": [210, 125],
  "order-service": [210, 210],
  "payment-service": [70, 300],
  "orders-db": [210, 300],
  rabbitmq: [350, 300],
  "stripe-adapter": [70, 390],
  "notification-worker": [350, 390],
};

const round = (value: number) => Math.round(value * 10) / 10;

function edgeShape(
  kind: GraphKind,
  position: Record<ServiceId, readonly [number, number]>,
  inset: { x: number; y: number },
  from: ServiceId,
  to: ServiceId,
): EdgeShape {
  const [ax, ay] = position[from];
  const [bx, by] = position[to];
  if (kind === "wide") {
    const dir = bx >= ax ? 1 : -1;
    const sx = ax + dir * inset.x;
    const ex = bx - dir * (inset.x + 3);
    const bend = Math.max(10, Math.abs(ex - sx) * 0.5);
    const c1 = [sx + dir * bend, ay];
    const c2 = [ex - dir * bend, by];
    return {
      key: edgeKey(from, to),
      from,
      to,
      d: `M${sx} ${ay}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${ex} ${by}`,
      back: `M${ex} ${by}C${c2[0]} ${c2[1]} ${c1[0]} ${c1[1]} ${sx} ${ay}`,
      arrow: `M${ex} ${by}L${ex - dir * 8} ${by - 4.5}L${ex - dir * 8} ${by + 4.5}Z`,
      length: Math.round(Math.hypot(ex - sx, by - ay) * 1.2 + 6),
    };
  }
  const dir = by >= ay ? 1 : -1;
  const sy = ay + dir * inset.y;
  const ey = by - dir * (inset.y + 2);
  const bend = Math.max(8, Math.abs(ey - sy) * 0.5);
  const c1 = [ax, round(sy + dir * bend)];
  const c2 = [bx, round(ey - dir * bend)];
  return {
    key: edgeKey(from, to),
    from,
    to,
    d: `M${ax} ${sy}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${bx} ${ey}`,
    back: `M${bx} ${ey}C${c2[0]} ${c2[1]} ${c1[0]} ${c1[1]} ${ax} ${sy}`,
    arrow: `M${bx} ${ey}L${bx - 4} ${ey - dir * 7}L${bx + 4} ${ey - dir * 7}Z`,
    length: Math.round(Math.hypot(bx - ax, ey - sy) * 1.2 + 6),
  };
}

function build(kind: GraphKind): GraphGeometry {
  const position = kind === "wide" ? WIDE_POSITION : TALL_POSITION;
  const pill = { width: 132, height: 32 };
  const radius = 15;
  const inset = kind === "wide" ? { x: radius, y: radius } : { x: pill.width / 2, y: pill.height / 2 };
  return {
    kind,
    node: kind === "wide" ? "point" : "pill",
    radius,
    width: kind === "wide" ? 700 : 420,
    height: kind === "wide" ? 320 : 430,
    pill,
    font: kind === "wide" ? 12.5 : 10.8,
    position,
    edges: DEPENDENCIES.map(([from, to]) => edgeShape(kind, position, inset, from, to)),
  };
}

export const GEOMETRY: Record<GraphKind, GraphGeometry> = { wide: build("wide"), tall: build("tall") };

/** Order in which services appear when the map is drawn: along the dependency flow. */
export const APPEAR_ORDER: readonly ServiceId[] = [
  "web-frontend",
  "api-gateway",
  "order-service",
  "payment-service",
  "orders-db",
  "rabbitmq",
  "stripe-adapter",
  "notification-worker",
];

export const SAMPLE_IMPACT = analyzeImpact(INCIDENT_SERVICE);
export const AFFECTED: ReadonlySet<ServiceId> = new Set([...SAMPLE_IMPACT.direct, ...SAMPLE_IMPACT.indirect]);

/** How many hops back from the failing service a service is, or undefined if it is not reached. */
export const hopOf = (id: ServiceId): number | undefined => SAMPLE_IMPACT.depth[id];

/** An edge carries the failure back when the service it points to is the failing one or already affected. */
export const isHotEdge = (edge: EdgeShape) => hopOf(edge.to) !== undefined;

export const SERVICE_COUNT = SERVICE_IDS.length;
export const DEPENDENCY_COUNT = DEPENDENCIES.length;
