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

/** Points and lines of a small, static picture of the topology (the overview's map preview). */
export type MiniMap = {
  width: number;
  height: number;
  points: Array<{ id: string; name: string; health: TopologyNode["health"]; x: number; y: number }>;
  lines: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>;
};

export function miniMap(topology: Topology, width = 560, height = 300, padding = 36): MiniMap {
  const placements = layoutTopology(topology);
  const slots = [...placements.values()].map((p) => p.slot);
  const depths = [...placements.values()].map((p) => p.depth);
  const minSlot = Math.min(0, ...slots);
  const maxSlot = Math.max(0, ...slots);
  const maxDepth = Math.max(0, ...depths);
  const spanX = Math.max(1, maxSlot - minSlot);
  const scaleX = Math.min((width - padding * 2) / spanX, 150);
  const scaleY = maxDepth ? Math.min((height - padding * 2) / maxDepth, 90) : 0;
  const offsetX = width / 2 - ((minSlot + maxSlot) / 2) * scaleX;
  const offsetY = height / 2 - (maxDepth / 2) * scaleY;
  const at = (id: string) => {
    const place = placements.get(id) ?? { depth: 0, slot: 0 };
    return { x: Math.round((offsetX + place.slot * scaleX) * 10) / 10, y: Math.round((offsetY + place.depth * scaleY) * 10) / 10 };
  };
  return {
    width,
    height,
    points: topology.nodes.map((node) => ({ id: node.id, name: node.name, health: node.health, ...at(node.id) })),
    lines: topology.edges.map((edge) => {
      const a = at(edge.source);
      const b = at(edge.target);
      return { id: edge.id, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }),
  };
}
