import Link from "next/link";
import type { Topology } from "@/lib/api";
import { miniMap } from "@/lib/graph";
import { healthLook } from "@/lib/status";
import { Icon } from "../landing/Icon";

/**
 * A small, static picture of the environment's topology: a point per component (with its status
 * shape) and a line per dependency. The whole picture is one link to the live topology page.
 */
export function MapPreview({ topology, href, environmentName }: { topology: Topology | null; href: string; environmentName: string }) {
  if (!topology || topology.nodes.length === 0) {
    return <Link className="map-preview" href={href}><span className="map-empty">{topology ? "No components yet. Add some to draw the map." : "Loading the map…"}</span></Link>;
  }
  const map = miniMap(topology);
  const problems = topology.nodes.filter(n => n.health === "Degraded" || n.health === "Unhealthy").length;
  return <Link className="map-preview fade-in" href={href} aria-label={`Open the live topology of ${environmentName}: ${topology.nodes.length} components, ${problems} need attention`}>
    <span className="map-caption" aria-hidden="true">{environmentName} · live map</span>
    <svg className="map" viewBox={`0 0 ${map.width} ${map.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      {map.lines.map(line => <line key={line.id} className="map-line" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />)}
      {map.points.map(point => {
        const look = healthLook(point.health);
        const attention = look.tone === "warn" || look.tone === "bad";
        return <g key={point.id} data-tone={look.tone} transform={`translate(${point.x} ${point.y})`}>
          {attention && <circle className="map-halo" r="15" />}
          <circle className="map-point" r="9" />
          {look.glyph === "triangle" ? <path className="map-glyph" data-glyph="triangle" d="M0 -4.6 4.6 3.4H-4.6Z" />
            : look.glyph === "cross" ? <path className="map-glyph" data-glyph="cross" d="M-3.2 -3.2 3.2 3.2M3.2 -3.2-3.2 3.2" />
            : <circle className="map-glyph" data-glyph={look.glyph} r={look.glyph === "ring" ? 3.6 : 4} />}
          <text className="map-label" data-tone={look.tone} y="24" textAnchor="middle">{point.name}</text>
        </g>;
      })}
    </svg>
    <span className="map-cta">Open live map<Icon name="arrow-right" size={14} /></span>
  </Link>;
}
