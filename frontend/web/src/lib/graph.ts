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

/**
 * A small, static picture of the topology (the overview's map preview), in the style of the landing
 * page's small maps: every component is a labelled pill on the layered layout above, and every
 * dependency a curve with an arrowhead, from the bottom of the dependent to the top of what it
 * depends on. `rows` holds the same components layer by layer, for boxes too narrow for the picture.
 */
export type MiniMapNode = { id: string; name: string; label: string; health: TopologyNode["health"]; x: number; y: number };
export type MiniMap = {
  width: number;
  height: number;
  pill: { width: number; height: number };
  font: number;
  nodes: MiniMapNode[];
  edges: Array<{ id: string; d: string; arrow: string }>;
  rows: Array<Array<{ id: string; name: string; health: TopologyNode["health"] }>>;
};

const MAP_FONT = 11.5;
/** A generous average glyph width of Geist, as a share of the font size, so labels always fit their pill. */
const MAP_CHAR = 0.55;
/** Left of the label: padding and the status glyph. Right of it: padding. */
const MAP_LABEL_LEFT = 28;
const MAP_LABEL_RIGHT = 16;
const MAP_PAD = 14;
/** The picture never shrinks below this, so a map with one or two components is not blown up. */
const MAP_MIN = { width: 440, height: 200 };

const r1 = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export function miniMap(topology: Topology): MiniMap {
  const placements = layoutTopology(topology);
  const charWidth = MAP_FONT * MAP_CHAR;
  const longest = Math.max(0, ...topology.nodes.map((node) => node.name.length));
  const pill = {
    width: Math.ceil(Math.min(184, Math.max(112, longest * charWidth + MAP_LABEL_LEFT + MAP_LABEL_RIGHT))),
    height: Math.round(MAP_FONT * 2.5),
  };
  const fits = Math.floor((pill.width - MAP_LABEL_LEFT - MAP_LABEL_RIGHT) / charWidth + 0.01);
  const label = (name: string) => (name.length <= fits ? name : `${name.slice(0, Math.max(1, fits - 1)).trimEnd()}…`);
  const stepX = pill.width + 24;
  const stepY = pill.height + 38;

  const places = [...placements.values()];
  const minSlot = Math.min(...places.map((p) => p.slot));
  const maxSlot = Math.max(...places.map((p) => p.slot));
  const maxDepth = Math.max(...places.map((p) => p.depth));
  const contentWidth = MAP_PAD * 2 + pill.width + (maxSlot - minSlot) * stepX;
  const contentHeight = MAP_PAD * 2 + pill.height + maxDepth * stepY;
  const width = Math.max(MAP_MIN.width, contentWidth);
  const height = Math.max(MAP_MIN.height, contentHeight);
  const offsetX = (width - contentWidth) / 2 + MAP_PAD + pill.width / 2;
  const offsetY = (height - contentHeight) / 2 + MAP_PAD + pill.height / 2;
  const at = (id: string) => {
    const place = placements.get(id) ?? { depth: 0, slot: minSlot };
    return { x: r1(offsetX + (place.slot - minSlot) * stepX), y: r1(offsetY + place.depth * stepY) };
  };

  const halfW = pill.width / 2;
  const halfH = pill.height / 2;
  const edges = topology.edges.flatMap((edge) => {
    if (!placements.has(edge.source) || !placements.has(edge.target) || edge.source === edge.target) return [];
    const a = at(edge.source);
    const b = at(edge.target);
    if (b.y !== a.y) {
      // Down to a lower layer (the usual case), or back up for an edge that closes a cycle. Lines leave
      // and reach a pill a little towards each other, so a fan of dependencies spreads instead of bunching.
      const dir = b.y > a.y ? 1 : -1;
      const dx = b.x - a.x;
      const sx = r1(a.x + clamp(dx * 0.3, halfW * 0.55));
      const tx = r1(b.x + clamp(-dx * 0.12, halfW * 0.3));
      const sy = r1(a.y + dir * halfH);
      const tip = r1(b.y - dir * (halfH + 1));
      const ey = r1(tip - dir * 6);
      const bend = r1(Math.max(10, Math.abs(ey - sy) * 0.5));
      return [{
        id: edge.id,
        d: `M${sx} ${sy}C${sx} ${r1(sy + dir * bend)} ${tx} ${r1(ey - dir * bend)} ${tx} ${ey}`,
        arrow: `M${tx} ${tip}L${r1(tx - 4)} ${r1(tip - dir * 7)}L${r1(tx + 4)} ${r1(tip - dir * 7)}Z`,
      }];
    }
    // Same layer: a low arc from side to side.
    const dir = b.x > a.x ? 1 : -1;
    const sx = r1(a.x + dir * halfW);
    const tip = r1(b.x - dir * (halfW + 1));
    const ex = r1(tip - dir * 6);
    const lift = r1(a.y - halfH - 10);
    return [{
      id: edge.id,
      d: `M${sx} ${a.y}C${r1(sx + dir * 20)} ${lift} ${r1(ex - dir * 20)} ${lift} ${ex} ${b.y}`,
      arrow: `M${tip} ${b.y}L${r1(tip - dir * 7)} ${r1(b.y - 4)}L${r1(tip - dir * 7)} ${r1(b.y + 4)}Z`,
    }];
  });

  const nodes = topology.nodes.map((node) => ({ id: node.id, name: node.name, label: label(node.name), health: node.health, ...at(node.id) }));
  const byDepth = new Map<number, Array<{ id: string; name: string; health: TopologyNode["health"]; slot: number }>>();
  for (const node of topology.nodes) {
    const place = placements.get(node.id) ?? { depth: 0, slot: 0 };
    byDepth.set(place.depth, [...(byDepth.get(place.depth) ?? []), { id: node.id, name: node.name, health: node.health, slot: place.slot }]);
  }
  const rows = [...byDepth.keys()].sort((x, y) => x - y)
    .map((depth) => (byDepth.get(depth) ?? []).sort((x, y) => x.slot - y.slot).map(({ id, name, health }) => ({ id, name, health })));

  return { width, height, pill, font: MAP_FONT, nodes, edges, rows };
}
