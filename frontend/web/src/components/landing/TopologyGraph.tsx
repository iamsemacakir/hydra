import type { KeyboardEvent } from "react";
import { cssVars } from "./cssVars";
import {
  EDGES,
  LAYOUTS,
  NODE_H,
  NODE_W,
  edgePaths,
  type EdgeFrame,
  type Layout,
  type NodeState,
  type ServiceId,
} from "./graph";
import styles from "./landing.module.css";

const STATE_LABEL: Record<NodeState, string> = {
  hidden: "not discovered yet",
  unknown: "status unknown",
  healthy: "healthy",
  degraded: "degraded",
  direct: "potentially affected directly",
  indirect: "potentially affected indirectly",
  dim: "not affected",
};

type TopologyGraphProps = {
  layout: Layout;
  nodes: Record<ServiceId, NodeState>;
  edges: Record<string, EdgeFrame>;
  /** Accessible name. Only used when the graph is interactive. */
  label: string;
  /** Makes every service a button. Without it the graph is decorative and hidden from assistive technology. */
  onSelect?: (id: ServiceId) => void;
  selected?: ServiceId | null;
};

function nodeInteraction(id: ServiceId, state: NodeState, isSelected: boolean, onSelect?: (id: ServiceId) => void) {
  if (!onSelect) return {};
  const select = onSelect;
  return {
    role: "button",
    tabIndex: 0,
    "aria-pressed": isSelected,
    "aria-label": `${id}, ${STATE_LABEL[state]}`,
    onClick: () => select(id),
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(id);
      }
    },
  };
}

/**
 * Renders the sample dependency graph as SVG. Edges are drawn in four layers (idle lines,
 * idle arrowheads, highlighted lines, highlighted arrowheads) so a highlight is never
 * painted over by a neighbouring idle edge. All motion is CSS, driven by data-state.
 */
export function TopologyGraph({ layout, nodes, edges, label, onSelect, selected = null }: TopologyGraphProps) {
  const spec = LAYOUTS[layout];
  const interactive = onSelect !== undefined;
  const routes = EDGES.map((edge) => ({ ...edge, ...edgePaths(layout, edge.from, edge.to), frame: edges[edge.key] }));

  return (
    <svg
      className={styles.graph}
      data-layout={layout}
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      role={interactive ? "group" : undefined}
      aria-label={interactive ? label : undefined}
      aria-hidden={interactive ? undefined : true}
      focusable="false"
    >
      <g>
        {routes.map((route, index) => (
          <path key={route.key} className={styles.edgeLine} d={route.line} pathLength={1} data-state={route.frame.visual} style={cssVars({ "--i": index })} />
        ))}
      </g>
      <g>
        {routes.map((route, index) => (
          <path key={route.key} className={styles.edgeArrow} d={route.arrow} data-state={route.frame.visual} style={cssVars({ "--i": index })} />
        ))}
      </g>
      <g>
        {routes.map((route) => (
          <path key={route.key} className={styles.hotLine} d={route.reverse} pathLength={1} data-state={route.frame.visual} style={cssVars({ "--depth": route.frame.depth })} />
        ))}
      </g>
      <g>
        {routes.map((route) => (
          <path key={route.key} className={styles.hotArrow} d={route.arrow} data-state={route.frame.visual} style={cssVars({ "--depth": route.frame.depth })} />
        ))}
      </g>
      <g>
        {spec.order.map((id, index) => {
          const { x, y } = spec.positions[id];
          const state = nodes[id];
          const isSelected = selected === id;
          return (
            <g key={id} transform={`translate(${x} ${y})`}>
              <g
                className={styles.node}
                data-state={state}
                data-selected={isSelected ? "true" : undefined}
                style={cssVars({ "--i": index })}
                {...nodeInteraction(id, state, isSelected, onSelect)}
              >
                <g className={styles.nodeInner}>
                  <rect className={styles.nodeHit} x={-4} y={-6} width={NODE_W + 8} height={NODE_H + 12} />
                  <rect className={styles.nodePulse} width={NODE_W} height={NODE_H} rx={8} />
                  <rect className={styles.nodeBox} width={NODE_W} height={NODE_H} rx={8} />
                  <rect className={styles.nodeSelected} x={-5} y={-5} width={NODE_W + 10} height={NODE_H + 10} rx={13} />
                  <rect className={styles.nodeFocus} x={-3} y={-3} width={NODE_W + 6} height={NODE_H + 6} rx={11} />
                  <g className={styles.glyphs} transform="translate(14 11)">
                    <circle className={styles.glyphUnknown} cx={6} cy={6} r={4.25} />
                    <circle className={styles.glyphHealthy} cx={6} cy={6} r={4} />
                    <path className={styles.glyphDegraded} d="M6 1.5 10.8 10.2H1.2Z" />
                    <path className={styles.glyphAffected} d="M6 1.5 10.8 10.2H1.2Z" />
                  </g>
                  <text className={styles.nodeLabel} x={34} y={17} dy=".35em">
                    {id}
                  </text>
                </g>
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
