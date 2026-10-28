import Link from "next/link";
import type { Topology } from "@/lib/api";
import { miniMap } from "@/lib/graph";
import { healthLook } from "@/lib/status";
import { Icon } from "../landing/Icon";
import { StatusGlyph } from "./Status";

/**
 * A small, static picture of the environment's topology, drawn like the landing page's small maps:
 * a labelled pill per component (status shape plus name) and a curved arrow per dependency.
 * A box too narrow for the picture shows the same components layer by layer instead (container query
 * in app.css). The whole picture is one link to the live topology page.
 */
export function MapPreview({ topology, href, environmentName }: { topology: Topology | null; href: string; environmentName: string }) {
  if (!topology || topology.nodes.length === 0) {
    return <Link className="map-preview" href={href}><span className="map-empty">{topology ? "No components yet. Add some to draw the map." : "Loading the map…"}</span></Link>;
  }
  const map = miniMap(topology);
  const problems = topology.nodes.filter(n => n.health === "Degraded" || n.health === "Unhealthy").length;
  const halfW = map.pill.width / 2;
  const halfH = map.pill.height / 2;
  return <Link className="map-preview fade-in" href={href} aria-label={`Open the live topology of ${environmentName}: ${topology.nodes.length} components, ${problems} need attention`}>
    <span className="map-caption" aria-hidden="true">{environmentName} · live map</span>
    <svg className="map" viewBox={`0 0 ${map.width} ${map.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <g className="map-edges">
        {map.edges.map(edge => <g key={edge.id}><path className="map-edge" d={edge.d} /><path className="map-arrow" d={edge.arrow} /></g>)}
      </g>
      {map.nodes.map(node => {
        const look = healthLook(node.health);
        const attention = look.tone === "warn" || look.tone === "bad";
        return <g key={node.id} className="map-node" data-tone={look.tone} data-attention={attention} transform={`translate(${node.x} ${node.y})`}>
          {node.label !== node.name && <title>{node.name}</title>}
          {attention && <rect className="map-halo" x={-halfW - 4} y={-halfH - 4} width={map.pill.width + 8} height={map.pill.height + 8} rx={halfH + 4} />}
          <rect className="map-pill" x={-halfW} y={-halfH} width={map.pill.width} height={map.pill.height} rx={halfH} />
          <g transform={`translate(${-halfW + 10} -6)`}><StatusGlyph glyph={look.glyph} /></g>
          <text className="map-name" x={-halfW + 28} y={map.font * 0.36} fontSize={map.font}>{node.label}</text>
        </g>;
      })}
    </svg>
    <ol className="map-rows" aria-hidden="true">
      {map.rows.map((row, index) => <li key={index}>
        {row.map(node => {
          const look = healthLook(node.health);
          return <span key={node.id} className="map-chip" data-tone={look.tone} data-attention={look.tone === "warn" || look.tone === "bad"}><StatusGlyph glyph={look.glyph} size={10} />{node.name}</span>;
        })}
      </li>)}
    </ol>
    <span className="map-cta">Open live map<Icon name="arrow-right" size={14} /></span>
  </Link>;
}
