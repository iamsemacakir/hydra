"use client";

import Link from "next/link";
import type { Topology } from "@/lib/api";
import { miniMap } from "@/lib/graph";
import { countHealth, healthLook, type StatusLook } from "@/lib/status";
import { cssVars } from "../landing/cssVars";
import { Icon } from "../landing/Icon";
import { InView } from "../landing/motion/InView";
import { StatusGlyph } from "./Status";

/** One line, in words, about what the picture shows (the narration under the map). */
function narration(topology: Topology): StatusLook & { text: string } {
  const problems = topology.nodes.filter(n => n.health === "Degraded" || n.health === "Unhealthy");
  if (problems.length === 1) {
    const look = healthLook(problems[0].health);
    return { ...look, text: `${problems[0].name} is ${look.label.toLowerCase()}` };
  }
  if (problems.length > 1) {
    const look = healthLook(problems.some(n => n.health === "Unhealthy") ? "Unhealthy" : "Degraded");
    return { ...look, text: `${problems.length} components need attention` };
  }
  const counts = countHealth(topology.nodes);
  if (counts.Healthy === topology.nodes.length) {
    return { ...healthLook("Healthy"), text: topology.nodes.length === 1 ? "The component is healthy" : `All ${topology.nodes.length} components healthy` };
  }
  return { ...healthLook("Unknown"), text: "No problems recorded" };
}

/**
 * The environment's live map on the overview, on a dark stage with an indigo glow (like the picture on
 * the sign-in page): a labelled pill per component (status shape plus name) and a curved arrow per
 * dependency, on the same layered layout as the topology page.
 *
 * It moves, calmly and only while it is on screen (`InView`): the map draws itself layer by layer when
 * it appears; a soft light runs along the dependencies every few seconds; degraded and unhealthy
 * components breathe; and from each of them, red travels back against the arrows to the components
 * that are potentially affected, then fades, while the line under the map says so in words. With
 * reduced motion it rests on the recorded state. A box narrower than 460 px shows the components
 * layer by layer instead (container query in app.css). The whole picture is one link to the topology.
 */
export function MapPreview({ topology, href, environmentName }: { topology: Topology | null; href: string; environmentName: string }) {
  if (!topology || topology.nodes.length === 0) {
    return <Link className="map-preview map-preview-empty" href={href}><span className="map-empty">{topology ? "No components yet. Add some to draw the map." : "Loading the map…"}</span></Link>;
  }
  const map = miniMap(topology);
  const now = narration(topology);
  const problems = topology.nodes.filter(n => n.health === "Degraded" || n.health === "Unhealthy").length;
  const w = map.pill.width;
  const h = map.pill.height;
  const halfW = w / 2;
  const halfH = h / 2;
  return <Link className="map-preview fade-in" href={href} aria-label={`Open the live topology of ${environmentName}: ${topology.nodes.length} components, ${problems} need attention`}>
    <InView className="map-stage">
      <span className="map-caption" aria-hidden="true">{environmentName} · live map</span>

      <svg className="map" viewBox={`0 0 ${map.width} ${map.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        {map.edges.map(edge => <g key={edge.id} className="map-link" style={cssVars({ "--len": edge.length, "--d": edge.depth, "--h": edge.ripple ?? 0 })}>
          <path className="map-edge" d={edge.d} />
          <path className="map-arrow" d={edge.arrow} />
          <path className="map-flow-glow" d={edge.d} />
          <path className="map-flow" d={edge.d} />
          {edge.ripple !== null && <><path className="map-hot-glow" d={edge.back} /><path className="map-hot" d={edge.back} /></>}
        </g>)}
        {map.nodes.map(node => {
          const look = healthLook(node.health);
          const problem = node.hop === 0;
          const affected = node.hop !== null && node.hop > 0;
          return <g key={node.id} className="map-node" data-tone={look.tone} data-problem={problem || undefined} data-affected={affected || undefined}
            transform={`translate(${node.x} ${node.y})`} style={cssVars({ "--d": node.depth, "--h": node.hop ?? 0 })}>
            {node.label !== node.name && <title>{node.name}</title>}
            <g className="map-node-body">
              {problem && <rect className="map-halo" x={-halfW - 5} y={-halfH - 5} width={w + 10} height={h + 10} rx={halfH + 5} />}
              <rect className="map-pill" x={-halfW} y={-halfH} width={w} height={h} rx={halfH} />
              <g className="map-glyph-now" transform={`translate(${-halfW + 10} -6)`}><StatusGlyph glyph={look.glyph} /></g>
              {affected && <g className="map-aff" data-tone="bad">
                <rect className="map-aff-ring" x={-halfW - 3} y={-halfH - 3} width={w + 6} height={h + 6} rx={halfH + 3} />
                <g transform={`translate(${-halfW + 10} -6)`}><StatusGlyph glyph="triangle-outline" /></g>
              </g>}
              <text className="map-name" x={-halfW + 28} y={map.font * 0.36} fontSize={map.font}>{node.label}</text>
            </g>
          </g>;
        })}
      </svg>

      <ol className="map-rows" aria-hidden="true">
        {map.rows.map((row, index) => <li key={index} style={cssVars({ "--d": index })}>
          {index > 0 && <span className="map-row-flow" />}
          {row.map(node => {
            const look = healthLook(node.health);
            const affected = (node.hop ?? 0) > 0;
            return <span key={node.id} className="map-chip" data-tone={look.tone} data-problem={node.hop === 0 || undefined}
              data-affected={affected || undefined} style={cssVars({ "--h": node.hop ?? 0 })}>
              <span className="map-chip-glyph">
                <span className="map-glyph-now"><StatusGlyph glyph={look.glyph} size={10} /></span>
                {affected && <span className="map-aff" data-tone="bad"><StatusGlyph glyph="triangle-outline" size={10} /></span>}
              </span>
              {node.name}
            </span>;
          })}
        </li>)}
      </ol>

      <p className="map-say" data-ripple={map.affected > 0 || undefined} style={cssVars({ "--h": map.reach })} aria-hidden="true">
        <span className="map-say-now" data-tone={now.tone}><StatusGlyph glyph={now.glyph} />{now.text}</span>
        {map.affected > 0 && <span className="map-say-ripple" data-tone="bad"><StatusGlyph glyph="triangle-outline" />{map.affected} potentially affected</span>}
      </p>
      <span className="map-cta">Open live map<Icon name="arrow-right" size={14} /></span>
    </InView>
  </Link>;
}
