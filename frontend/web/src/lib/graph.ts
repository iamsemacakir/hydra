import type { Edge, Node } from "@xyflow/react";
import type { Impact, Topology, TopologyNode } from "./api";

/*
 * Pure graph logic for the topology views. No React here, so it can be tested on its own.
 *
 * An edge A -> B means "A depends on B". The layout puts A above B, so every arrow points down
 * and a failure travels upwards, against the arrows.
 */

type Shape = { nodes: ReadonlyArray<{ id: string }>; edges: ReadonlyArray<{ source: string; target: string }> };

/** Where a component sits: `depth` is its row, `slot` its horizontal position in node widths (0 is the centre line). */
export type Placement = { depth: number; slot: number };

/**
 * Layered layout.
 * 1. Edges that close a cycle are left out of the layering (they are still drawn), so traversal always ends.
 * 2. Each component goes one row below its lowest dependent (longest path), so every arrow points down.
 * 3. A component nothing depends on moves down to sit right above what it depends on.
 * 4. In each row, a component is placed under the average position of its dependents, then neighbours are
 *    pushed apart so they never overlap.
 */
export function layoutTopology({ nodes, edges }: Shape): Map<string, Placement> {
  const ids = nodes.map((node) => node.id);
  const known = new Set(ids);
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of edges) {
    if (known.has(edge.source) && known.has(edge.target) && edge.source !== edge.target) out.get(edge.source)?.push(edge.target);
  }

  // 1. Depth-first search in input order; an edge back to a component on the current path closes a cycle.
  const state = new Map<string, "open" | "done">();
  const dag = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const root of ids) {
    if (state.has(root)) continue;
    const stack: Array<{ id: string; next: number }> = [{ id: root, next: 0 }];
    state.set(root, "open");
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const children = out.get(top.id) ?? [];
      if (top.next >= children.length) {
        state.set(top.id, "done");
        stack.pop();
        continue;
      }
      const child = children[top.next++];
      const seen = state.get(child);
      if (seen === "open") continue;
      dag.get(top.id)?.push(child);
      if (!seen) {
        state.set(child, "open");
        stack.push({ id: child, next: 0 });
      }
    }
  }

  const parents = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const [parent, children] of dag) for (const child of children) parents.get(child)?.push(parent);

  // 2. Longest path from the top, in topological order (Kahn).
  const remaining = new Map<string, number>(ids.map((id) => [id, parents.get(id)?.length ?? 0]));
  const depth = new Map<string, number>(ids.map((id) => [id, 0]));
  const queue = ids.filter((id) => remaining.get(id) === 0);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const child of dag.get(id) ?? []) {
      depth.set(child, Math.max(depth.get(child) ?? 0, (depth.get(id) ?? 0) + 1));
      const left = (remaining.get(child) ?? 1) - 1;
      remaining.set(child, left);
      if (left === 0) queue.push(child);
    }
  }

  // 3. Components nothing depends on sit right above their closest dependency.
  for (const id of ids) {
    const children = dag.get(id) ?? [];
    if ((parents.get(id)?.length ?? 0) > 0 || children.length === 0) continue;
    const closest = Math.min(...children.map((child) => depth.get(child) ?? 0));
    depth.set(id, Math.max(0, closest - 1));
  }

  // 4. Rows from top to bottom.
  const rows = new Map<number, string[]>();
  for (const id of ids) {
    const row = depth.get(id) ?? 0;
    rows.set(row, [...(rows.get(row) ?? []), id]);
  }
  const placements = new Map<string, Placement>();
  for (const row of [...rows.keys()].sort((a, b) => a - b)) {
    const members = rows.get(row) ?? [];
    const placed = members.map((id) => parents.get(id)?.filter((parent) => placements.has(parent)) ?? []);
    const anchored = placed.flatMap((list) => (list.length ? [average(list.map((parent) => placements.get(parent)?.slot ?? 0))] : []));
    let spare = anchored.length ? Math.max(...anchored) + 1 : -(members.length - 1) / 2;
    const wanted = members.map((id, index) => {
      const list = placed[index];
      if (list.length) return { id, index, slot: average(list.map((parent) => placements.get(parent)?.slot ?? 0)) };
      return { id, index, slot: spare++ };
    });
    wanted.sort((a, b) => a.slot - b.slot || a.index - b.index);
    const slots = wanted.map((entry) => entry.slot);
    for (let i = 1; i < slots.length; i++) slots[i] = Math.max(slots[i], slots[i - 1] + 1);
    const shift = average(wanted.map((entry) => entry.slot)) - average(slots);
    wanted.forEach((entry, i) => placements.set(entry.id, { depth: row, slot: slots[i] + shift }));
  }
  return placements;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

/** Edges on an impact path: the route a failure of the analysed component could travel. */
export function impactEdgeKeys(impact: Impact | null): Set<string> {
  const keys = new Set<string>();
  for (const path of impact?.affectedPaths ?? []) {
    for (let i = 1; i < path.componentIds.length; i++) {
      const [a, b] = [path.componentIds[i - 1], path.componentIds[i]];
      keys.add(`${a}>${b}`);
      keys.add(`${b}>${a}`);
    }
  }
  return keys;
}

export type ImpactKind = "" | "direct" | "indirect";
export type ComponentNodeData = { component: TopologyNode; selected: boolean; impactKind: ImpactKind; dimmed: boolean };

export const NODE_SPACING_X = 260;
export const NODE_SPACING_Y = 140;
/** Approximate rendered node size, so the minimap and fitView work before React Flow has measured the nodes. */
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 90;

const EDGE_DASH: Record<string, string | undefined> = { Declared: undefined, Discovered: "6 4", Observed: "1.5 4" };

export function mapTopology(topology: Topology, selectedId: string | null, impact: Impact | null, search: string, selectedEdgeId: string | null = null): { nodes: Node<ComponentNodeData, "component">[]; edges: Edge[] } {
  const placements = layoutTopology(topology);
  const direct = new Set(impact?.directDependents.map((x) => x.id) ?? []);
  const indirect = new Set(impact?.indirectDependents.map((x) => x.id) ?? []);
  const onPath = impactEdgeKeys(impact);
  const query = search.trim().toLowerCase();
  const involved = (id: string) => !!impact && (id === impact.componentId || direct.has(id) || indirect.has(id));
  const nodes = topology.nodes.map((component) => {
    const place = placements.get(component.id) ?? { depth: 0, slot: 0 };
    const impactKind: ImpactKind = direct.has(component.id) ? "direct" : indirect.has(component.id) ? "indirect" : "";
    const unrelated = !!impact && !involved(component.id);
    const filtered = !!query && !component.name.toLowerCase().includes(query);
    return {
      id: component.id,
      type: "component" as const,
      position: { x: 500 + place.slot * NODE_SPACING_X, y: place.depth * NODE_SPACING_Y },
      initialWidth: NODE_WIDTH,
      initialHeight: NODE_HEIGHT,
      data: { component, selected: component.id === selectedId, impactKind, dimmed: unrelated || filtered },
    };
  });
  const edges: Edge[] = topology.edges.map((edge) => {
    const touchesSelection = !!selectedId && (edge.source === selectedId || edge.target === selectedId);
    const isSelected = selectedEdgeId === edge.id;
    const isImpact = onPath.has(`${edge.source}>${edge.target}`) && involved(edge.source) && involved(edge.target);
    const faded = !!impact && !isImpact;
    const color = isImpact ? "var(--lp-bad)" : isSelected || touchesSelection ? "var(--lp-accent)" : "var(--lp-edge)";
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      // Declared is the usual case and is drawn solid; other sources are named on the line too.
      label: edge.sourceKind === "Declared" ? edge.type : `${edge.type} · ${edge.sourceKind}`,
      type: "default",
      animated: false,
      className: isImpact ? "edge-impact" : isSelected ? "edge-selected" : undefined,
      markerEnd: { type: "arrowclosed", color, width: 16, height: 16 },
      style: {
        stroke: color,
        strokeWidth: isSelected ? 2.5 : isImpact || touchesSelection ? 2 : 1.5,
        strokeDasharray: isImpact ? "5 4" : EDGE_DASH[edge.sourceKind],
        strokeLinecap: "round",
        opacity: faded ? 0.3 : 1,
      },
      labelStyle: { fill: isImpact ? "var(--lp-bad-ink)" : "var(--lp-ink-3)", fontSize: 11, fontWeight: 500, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" },
      labelBgStyle: { fill: "var(--lp-surface)", fillOpacity: faded ? 0.5 : 0.96 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
    };
  });
  return { nodes, edges };
}

/*
 * The overview's live map (MapPreview): a card per component on the layered layout above, and a connector per
 * dependency from the bottom of the dependent to the top of what it depends on. Connectors that leave the same
 * card share a short trunk and then branch, like a tree.
 *
 * The map tells what it shows step by step, so every element carries the moment of its part, in milliseconds
 * from the start (MapPreview turns them into CSS animation delays):
 * 1. the components appear layer by layer, each layer once the arrows to it have grown;
 * 2. their health shows, top to bottom;
 * 3. degraded and unhealthy components light up;
 * 4. from each of them a red arrow climbs back along the dependency to what depends on it, which lights up as
 *    potentially affected; then the next hop, until nothing else depends on them.
 * `rows` holds the same story layer by layer, for boxes too narrow for the picture.
 */

type Health = TopologyNode["health"];

/** A component on the map. */
export type MapCard = {
  id: string;
  name: string;
  /** The name, shortened with an ellipsis when it does not fit the card. */
  label: string;
  type: string;
  health: Health;
  /** Centre of the card. */
  x: number;
  y: number;
  depth: number;
  /** 0 for a degraded or unhealthy component, n for one n hops from one against the arrows (potentially affected), else null. */
  hop: number | null;
  /** When the card appears, when its health shows and when it lights up (problems and potentially affected only). */
  at: { show: number; health: number; lit: number | null };
};

type Route = { d: string; head: string; length: number };

/** A dependency on the map, and the way a failure would take back along it. */
export type MapLine = Route & {
  id: string;
  at: { draw: number; duration: number };
  /** Drawn from the component that fails up to the one that depends on it, when the failure climbs; null if it does not. */
  climb: (Route & { at: number }) | null;
};

/** One layer of the map, for narrow boxes: its cards, and the link from the layer above. */
export type MapRow = { cards: MapCard[]; show: number; link: { draw: number; climb: number | null } | null };

export type LiveMap = {
  width: number;
  height: number;
  card: { width: number; height: number };
  cards: MapCard[];
  lines: MapLine[];
  rows: MapRow[];
  /** When the health shows, when problems light up, and when the last potentially affected component does. */
  at: { health: number; problems: number | null; affected: number | null };
  /** Degraded or unhealthy components, and the components that depend on them, directly or not. */
  problems: number;
  affected: number;
};

const CARD = { width: 216, height: 50 };
const GAP = { x: 14, y: 38 };
const PAD = { x: 16, y: 16 };
/** Left of the name: padding, the type icon and a gap. Right of it: padding. */
const TEXT = { left: 52, right: 12 };
/** A generous width of Geist at 13 px semibold, so a name always fits its card. */
const CHAR = 13 * 0.58;
/** Connectors leave a card straight down this far before they branch, with corners of this radius. */
const TRUNK = 15;
const CORNER = 6;
/** Length of a rounded corner (a quadratic curve) of radius r is about 1.62 r; a little more keeps dashes whole. */
const BEND = 1.65;
/** The story's rhythm, in milliseconds. */
const STORY = {
  start: 300,
  /** From a layer appearing to the arrows towards the next one starting to grow. */
  lineDelay: 450,
  draw: 520,
  drawBent: 720,
  /** From the last layer appearing to the health showing, and its stagger per layer. */
  settle: 700,
  wave: 70,
  /** From the health showing to the problems lighting up, and from there to the first red arrow. */
  problems: 1300,
  firstClimb: 1000,
  climb: 700,
  /** From a component lighting up to the next red arrow. */
  nextClimb: 600,
};

const r1 = (value: number) => Math.round(value * 10) / 10;
const isProblem = (health: Health) => health === "Degraded" || health === "Unhealthy";

/** Distance from the nearest degraded or unhealthy component, against the arrows (breadth first, safe on cycles). */
export function failureHops(topology: Pick<Topology, "nodes" | "edges">): Map<string, number> {
  const dependents = new Map<string, string[]>();
  for (const edge of topology.edges) dependents.set(edge.target, [...(dependents.get(edge.target) ?? []), edge.source]);
  const hops = new Map<string, number>();
  const queue = topology.nodes.filter((node) => isProblem(node.health)).map((node) => node.id);
  for (const id of queue) hops.set(id, 0);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const dependent of dependents.get(id) ?? []) {
      if (hops.has(dependent)) continue;
      hops.set(dependent, (hops.get(id) ?? 0) + 1);
      queue.push(dependent);
    }
  }
  return hops;
}

type Point = { x: number; y: number };
type Routes = { forward: Route; back: Route; bent: boolean };

/** Down from `a` to a lower layer `b`: straight when they line up, else down a short trunk, across and down again. */
function downRoute(a: Point, b: Point): Routes {
  const half = CARD.height / 2;
  const bottom = r1(a.y + half);
  const top = r1(b.y - half);
  const tip = r1(top - 1);
  const end = r1(tip - 6);
  const head = (x: number) => `M${x} ${tip}L${r1(x - 4)} ${r1(tip - 7)}H${r1(x + 4)}Z`;
  const backHead = (x: number) => `M${x} ${r1(bottom + 1)}L${r1(x - 4.5)} ${r1(bottom + 9)}H${r1(x + 4.5)}Z`;
  const dx = b.x - a.x;
  if (Math.abs(dx) < 24) {
    return {
      bent: false,
      forward: { d: `M${b.x} ${bottom}V${end}`, head: head(b.x), length: Math.ceil(end - bottom) + 1 },
      back: { d: `M${b.x} ${r1(top - 0.5)}V${r1(bottom + 7)}`, head: backHead(b.x), length: Math.ceil(top - bottom - 7) + 1 },
    };
  }
  const dir = Math.sign(dx);
  const join = r1(bottom + TRUNK);
  const r = Math.min(CORNER, Math.abs(dx) / 2, end - join);
  const across = Math.abs(dx) - 2 * r + 2 * BEND * r;
  return {
    bent: true,
    forward: {
      d: `M${a.x} ${bottom}V${r1(join - r)}Q${a.x} ${join} ${r1(a.x + dir * r)} ${join}H${r1(b.x - dir * r)}Q${b.x} ${join} ${b.x} ${r1(join + r)}V${end}`,
      head: head(b.x),
      length: Math.ceil(join - r - bottom + across + end - join - r) + 1,
    },
    back: {
      d: `M${b.x} ${r1(top - 0.5)}V${r1(join + r)}Q${b.x} ${join} ${r1(b.x - dir * r)} ${join}H${r1(a.x + dir * r)}Q${a.x} ${join} ${a.x} ${r1(join - r)}V${r1(bottom + 7)}`,
      head: backHead(a.x),
      length: Math.ceil(top - 0.5 - join - r + across + join - r - bottom - 7) + 1,
    },
  };
}

/** To a component in the same layer: a low bridge over the top. */
function bridgeRoute(a: Point, b: Point): Routes {
  const top = r1(a.y - CARD.height / 2);
  const lift = r1(top - 14);
  const dir = Math.sign(b.x - a.x) || 1;
  const sx = r1(a.x + dir * 30);
  const ex = r1(b.x - dir * 30);
  const r = Math.min(CORNER, Math.abs(ex - sx) / 2);
  const length = Math.ceil(top - lift + Math.abs(ex - sx) + top - 7 - lift) + 1;
  const head = (x: number) => `M${x} ${r1(top - 1)}L${r1(x - 4)} ${r1(top - 8)}H${r1(x + 4)}Z`;
  const path = (from: number, to: number, way: number) =>
    `M${from} ${top}V${r1(lift + r)}Q${from} ${lift} ${r1(from + way * r)} ${lift}H${r1(to - way * r)}Q${to} ${lift} ${to} ${r1(lift + r)}V${r1(top - 7)}`;
  return { bent: true, forward: { d: path(sx, ex, dir), head: head(ex), length }, back: { d: path(ex, sx, -dir), head: head(sx), length } };
}

/** To a component in a layer above (the dependency closes a cycle): around the right-hand side. */
function sideRoute(a: Point, b: Point): Routes {
  const half = CARD.width / 2;
  const out = r1(Math.max(a.x, b.x) + half + 18);
  const r = Math.min(CORNER, Math.abs(a.y - b.y) / 2);
  const length = Math.ceil(out - a.x - half + Math.abs(a.y - b.y) + out - b.x - half) + 1;
  const head = (p: Point) => `M${r1(p.x + half + 1)} ${p.y}L${r1(p.x + half + 8)} ${r1(p.y - 4)}V${r1(p.y + 4)}Z`;
  const path = (from: Point, to: Point) => {
    const way = Math.sign(to.y - from.y);
    return `M${r1(from.x + half)} ${from.y}H${r1(out - r)}Q${out} ${from.y} ${out} ${r1(from.y + way * r)}V${r1(to.y - way * r)}Q${out} ${to.y} ${r1(out - r)} ${to.y}H${r1(to.x + half + 7)}`;
  };
  return { bent: true, forward: { d: path(a, b), head: head(b), length }, back: { d: path(b, a), head: head(a), length } };
}

export function liveMap(topology: Topology): LiveMap {
  const empty: LiveMap = { width: 0, height: 0, card: CARD, cards: [], lines: [], rows: [], at: { health: 0, problems: null, affected: null }, problems: 0, affected: 0 };
  if (topology.nodes.length === 0) return empty;
  const placements = layoutTopology(topology);
  const hops = failureHops(topology);
  // The map's own columns: each layer's slots rounded to half a card and still a card apart, so a component
  // with a single dependent sits right under it and its connector runs straight.
  const layers = new Map<number, Array<{ id: string; slot: number }>>();
  for (const [id, p] of placements) layers.set(p.depth, [...(layers.get(p.depth) ?? []), { id, slot: p.slot }]);
  const slots = new Map<string, number>();
  for (const members of layers.values()) {
    let previous = -Infinity;
    for (const member of [...members].sort((p, q) => p.slot - q.slot)) {
      previous = Math.max(Math.round(member.slot * 2) / 2, previous + 1);
      slots.set(member.id, previous);
    }
  }
  const minSlot = Math.min(...slots.values());
  const maxSlot = Math.max(...slots.values());
  const maxDepth = Math.max(...[...placements.values()].map((p) => p.depth));
  const stepX = CARD.width + GAP.x;
  const stepY = CARD.height + GAP.y;
  const place = (id: string) => ({ depth: placements.get(id)?.depth ?? 0, slot: slots.get(id) ?? minSlot });
  const depthOf = (id: string) => place(id).depth;
  const point = (id: string): Point => {
    const p = place(id);
    return { x: r1(PAD.x + CARD.width / 2 + (p.slot - minSlot) * stepX), y: r1(PAD.y + CARD.height / 2 + p.depth * stepY) };
  };

  const routes = topology.edges.flatMap((edge) => {
    if (!placements.has(edge.source) || !placements.has(edge.target) || edge.source === edge.target) return [];
    const [from, to] = [depthOf(edge.source), depthOf(edge.target)];
    const [a, b] = [point(edge.source), point(edge.target)];
    const route = to > from ? downRoute(a, b) : to === from ? bridgeRoute(a, b) : sideRoute(a, b);
    return [{ edge, down: to > from, ...route }];
  });

  // 1. Layer by layer: the arrows to a layer grow, then its cards appear. Arrows sideways or up come last.
  const show: number[] = [STORY.start];
  const drawAt: Array<number | null> = [null];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const incoming = routes.filter((route) => route.down && depthOf(route.edge.target) === depth);
    const start = show[depth - 1] + STORY.lineDelay;
    drawAt.push(incoming.length ? start : null);
    show.push(incoming.length ? start + Math.max(...incoming.map((route) => (route.bent ? STORY.drawBent : STORY.draw))) - 20 : start + 100);
  }
  const lateAt = show[maxDepth] + STORY.lineDelay;
  const built = routes.some((route) => !route.down) ? lateAt + STORY.drawBent : show[maxDepth];

  // 2. Health, 3. problems, 4. a red arrow per hop.
  const healthAt = built + STORY.settle;
  const problems = topology.nodes.filter((node) => isProblem(node.health)).length;
  const problemsAt = problems > 0 ? healthAt + STORY.problems : null;
  const reach = Math.max(0, ...hops.values());
  const climbAt: number[] = [];
  const litAt: number[] = [];
  if (problemsAt !== null) {
    litAt[0] = problemsAt;
    for (let hop = 1; hop <= reach; hop++) {
      climbAt[hop] = hop === 1 ? problemsAt + STORY.firstClimb : litAt[hop - 1] + STORY.nextClimb;
      litAt[hop] = climbAt[hop] + STORY.climb;
    }
  }
  const rippleOf = (source: string, target: string) => {
    const from = hops.get(target);
    const to = hops.get(source);
    return from !== undefined && to !== undefined && to === from + 1 ? to : null;
  };

  const lines: MapLine[] = routes.map(({ edge, down, bent, forward, back }) => {
    const hop = rippleOf(edge.source, edge.target);
    const climb = hop !== null ? climbAt[hop] : undefined;
    return {
      id: edge.id,
      ...forward,
      at: { draw: down ? (drawAt[depthOf(edge.target)] ?? show[depthOf(edge.target)]) : lateAt, duration: bent ? STORY.drawBent : STORY.draw },
      climb: climb !== undefined ? { ...back, at: climb } : null,
    };
  });

  const fits = Math.floor((CARD.width - TEXT.left - TEXT.right) / CHAR + 0.01);
  const label = (name: string) => (name.length <= fits ? name : `${name.slice(0, Math.max(1, fits - 1)).trimEnd()}…`);
  const cards: MapCard[] = topology.nodes.map((node) => {
    const depth = depthOf(node.id);
    const hop = hops.get(node.id) ?? null;
    return {
      id: node.id, name: node.name, label: label(node.name), type: node.type, health: node.health,
      ...point(node.id), depth, hop,
      at: {
        show: show[depth],
        health: hop === 0 && problemsAt !== null ? problemsAt : healthAt + depth * STORY.wave,
        lit: hop !== null ? (litAt[hop] ?? null) : null,
      },
    };
  });

  const rows: MapRow[] = [];
  for (let depth = 0; depth <= maxDepth; depth++) {
    const members = cards.filter((card) => card.depth === depth).sort((p, q) => place(p.id).slot - place(q.id).slot);
    if (members.length === 0) continue;
    // The link from the layer above turns red when a failure climbs through it.
    const climbs = routes.flatMap((route, index) => {
      const at = lines[index].climb?.at;
      return at !== undefined && route.down && depthOf(route.edge.source) < depth && depth <= depthOf(route.edge.target) ? [at] : [];
    });
    rows.push({
      cards: members,
      show: show[depth],
      link: depth === 0 ? null : { draw: drawAt[depth] ?? show[depth] - 400, climb: climbs.length ? Math.min(...climbs) : null },
    });
  }

  return {
    width: Math.ceil(PAD.x * 2 + CARD.width + (maxSlot - minSlot) * stepX),
    height: Math.ceil(PAD.y * 2 + CARD.height + maxDepth * stepY),
    card: CARD,
    cards,
    lines,
    rows,
    at: { health: healthAt, problems: problemsAt, affected: reach > 0 ? (litAt[reach] ?? null) : null },
    problems,
    affected: [...hops.values()].filter((hop) => hop > 0).length,
  };
}
