"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Topology } from "@/lib/api";
import { COMPONENT_TYPE_ICONS, componentTypeLabel } from "@/lib/componentTypes";
import { liveMap, type LiveMap, type MapCard } from "@/lib/graph";
import { countHealth, healthHeadline, healthLook, POTENTIALLY_AFFECTED, type Glyph, type Tone } from "@/lib/status";
import { cssVars } from "../landing/cssVars";
import { Icon } from "../landing/Icon";
import { InView } from "../landing/motion/InView";
import { StatusGlyph } from "./Status";

const ms = (value: number) => `${Math.round(value)}ms`;
/** Pictures wider than this (four columns of cards and more) are told layer by layer. */
const ROWS_FROM_WIDTH = 860;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const stateOf = (card: MapCard) => (card.hop === 0 ? "problem" : card.hop !== null ? "affected" : "plain");

/** One thing the line under the map says, from `at` until `until` (null: it stays). */
type Saying = { tone: Tone; glyph: Glyph | null; text: string; at: number; until: number | null };

/** What the line under the map says, step by step: what was drawn, then what is wrong, then what it could reach. */
function narration(topology: Topology, map: LiveMap): Saying[] {
  const problems = topology.nodes.filter((node) => node.health === "Degraded" || node.health === "Unhealthy");
  if (problems.length === 0 || map.at.problems === null) {
    const counts = countHealth(topology.nodes);
    const look = healthLook(counts.Healthy === topology.nodes.length ? "Healthy" : "Unknown");
    return [{ tone: look.tone, glyph: look.glyph, text: healthHeadline(counts).replace(/\.$/, ""), at: map.at.health, until: null }];
  }
  const worst = healthLook(problems.some((node) => node.health === "Unhealthy") ? "Unhealthy" : "Degraded");
  const problem = problems.length === 1 ? `${problems[0].name} is ${healthLook(problems[0].health).label.toLowerCase()}` : `${problems.length} components need attention`;
  const drawn = `${plural(topology.nodes.length, "component", "components")} · ${plural(topology.edges.length, "dependency", "dependencies")}`;
  const sayings: Saying[] = [
    { tone: "neutral", glyph: null, text: drawn, at: map.at.health, until: map.at.problems },
    { tone: worst.tone, glyph: worst.glyph, text: problem, at: map.at.problems, until: map.at.affected },
  ];
  if (map.at.affected !== null) {
    sayings.push({ tone: "bad", glyph: POTENTIALLY_AFFECTED.glyph, text: `${problem} · ${map.affected} potentially affected`, at: map.at.affected, until: null });
  }
  return sayings;
}

/** A component: its type icon, its name and one status word (its type until its health shows). */
function Card({ card, width, height, shadow }: { card: MapCard; width: number; height: number; shadow: string }) {
  const look = healthLook(card.health);
  const state = stateOf(card);
  const left = -width / 2;
  const vars: Record<`--${string}`, string> = { "--show": ms(card.at.show), "--health": ms(card.at.health) };
  if (card.at.lit !== null) vars["--lit"] = ms(card.at.lit);
  return (
    <g className="map-card" data-state={state} data-tone={look.tone} transform={`translate(${card.x} ${card.y})`} style={cssVars(vars)}>
      {card.label !== card.name && <title>{card.name}</title>}
      <g className="map-card-body">
        {state !== "plain" && <rect className="map-card-halo" x={left - 4} y={-height / 2 - 4} width={width + 8} height={height + 8} rx={15} />}
        <rect className="map-card-box" x={left} y={-height / 2} width={width} height={height} rx={12} filter={`url(#${shadow})`} />
        {state !== "plain" && <rect className="map-card-lit" x={left} y={-height / 2} width={width} height={height} rx={12} />}
        <rect className="map-card-tile" x={left + 10} y={-15} width={30} height={30} rx={8} />
        <Icon name={COMPONENT_TYPE_ICONS[card.type] ?? "box"} size={16} strokeWidth={1.75} x={left + 17} y={-8} className="map-card-icon" />
        <text className="map-card-name" x={left + 52} y={-3}>{card.label}</text>
        <text className="map-card-st map-st-type" x={left + 52} y={13}>{componentTypeLabel(card.type)}</text>
        <g className="map-card-st map-st-health" data-tone={look.tone}>
          <g transform={`translate(${left + 52} 4)`}><StatusGlyph glyph={look.glyph} size={10} /></g>
          <text x={left + 67} y={13}>{look.label}</text>
        </g>
        {state === "affected" && (
          <g className="map-card-st map-st-affected" data-tone={POTENTIALLY_AFFECTED.tone}>
            <g transform={`translate(${left + 52} 4)`}><StatusGlyph glyph={POTENTIALLY_AFFECTED.glyph} size={10} /></g>
            <text x={left + 67} y={13}>{POTENTIALLY_AFFECTED.label}</text>
          </g>
        )}
        {state !== "plain" && <rect className="map-card-burst" x={left} y={-height / 2} width={width} height={height} rx={12} />}
      </g>
    </g>
  );
}

/** The same component as a small chip, for boxes too narrow for the picture. */
function Chip({ card }: { card: MapCard }) {
  const look = healthLook(card.health);
  const state = stateOf(card);
  const vars: Record<`--${string}`, string> = { "--health": ms(card.at.health) };
  if (card.at.lit !== null) vars["--lit"] = ms(card.at.lit);
  return (
    <span className="map-chip" data-state={state} data-tone={look.tone} style={cssVars(vars)}>
      <span className="map-chip-glyph">
        <span className="map-chip-wait" data-tone="neutral"><StatusGlyph glyph="ring" size={10} /></span>
        <span className="map-chip-health" data-tone={look.tone}><StatusGlyph glyph={look.glyph} size={10} /></span>
        {state === "affected" && <span className="map-chip-affected" data-tone={POTENTIALLY_AFFECTED.tone}><StatusGlyph glyph={POTENTIALLY_AFFECTED.glyph} size={10} /></span>}
      </span>
      {card.name}
    </span>
  );
}

/**
 * The environment's live map on the overview: a card per component (type icon, name, status word) on the
 * same layered layout as the topology page, connectors that branch like a tree, and a line under the map
 * that says what it shows. The whole box opens the topology page.
 *
 * It tells its story once, when it first comes into view: the components appear layer by layer as the
 * arrows to them grow, their health shows, degraded and unhealthy components light up, and from each a red
 * arrow climbs to what depends on it, which lights up as potentially affected, one hop at a time. Then it
 * rests on that last frame, which is also what reduced motion shows. Replay tells it again. The timing comes
 * from `liveMap` (lib/graph.ts) and runs as CSS animations (app.css). A box narrower than 520 px, and a
 * system too wide to draw legibly (more than three columns of cards), show the same story layer by layer.
 */
export function MapPreview({ topology, href, environmentName }: { topology: Topology | null; href: string; environmentName: string }) {
  const [run, setRun] = useState(0);
  const shadow = `map-shadow-${useId().replace(/[^\w-]/g, "")}`;
  if (!topology || topology.nodes.length === 0) {
    return (
      <Link className="map-preview map-preview-empty" href={href}>
        <span className="map-empty">{topology ? "No components yet. Add some to draw the map." : "Loading the map…"}</span>
      </Link>
    );
  }
  const map = liveMap(topology);
  const sayings = narration(topology, map);
  // More than three columns of cards would be too small to read in the box: tell it layer by layer instead.
  const rows = map.width > ROWS_FROM_WIDTH;
  return (
    <div className={rows ? "map-preview map-preview-rows" : "map-preview"}>
      <InView className="map-stage">
        <div className="map-head">
          <p className="map-caption">{environmentName} · live map</p>
          <button type="button" className="button small map-replay" onClick={() => setRun((count) => count + 1)} aria-label="Replay the map">
            <Icon name="rotate-ccw" size={14} />
            Replay
          </button>
        </div>
        <div className="map-body" key={`map-${run}`}>
          <svg className="map-svg" viewBox={`0 0 ${map.width} ${map.height}`} width={map.width} height={map.height} style={{ maxWidth: map.width }} aria-hidden="true" focusable="false">
            <defs>
              <filter id={shadow} x="-10%" y="-25%" width="120%" height="170%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.08" />
              </filter>
            </defs>
            {map.lines.map((line) => {
              const vars: Record<`--${string}`, string | number> = { "--draw": ms(line.at.draw), "--dur": ms(line.at.duration), "--len": line.length };
              if (line.climb) vars["--climb"] = ms(line.climb.at);
              return (
                <g key={line.id} className="map-line" data-climb={line.climb ? "" : undefined} style={cssVars(vars)}>
                  <path className="map-line-stroke" d={line.d} />
                  <path className="map-line-head" d={line.head} />
                </g>
              );
            })}
            {map.lines.map((line) => line.climb && (
              <g key={`climb-${line.id}`} className="map-climb" style={cssVars({ "--climb": ms(line.climb.at), "--len": line.climb.length })}>
                <path className="map-climb-glow" d={line.climb.d} />
                <path className="map-climb-stroke" d={line.climb.d} />
                <path className="map-climb-head" d={line.climb.head} />
              </g>
            ))}
            {map.cards.map((card) => <Card key={card.id} card={card} width={map.card.width} height={map.card.height} shadow={shadow} />)}
          </svg>
          <ol className="map-rows" aria-hidden="true">
            {map.rows.map((row, index) => {
              const vars: Record<`--${string}`, string> = { "--show": ms(row.show) };
              if (row.link) vars["--draw"] = ms(row.link.draw);
              if (row.link?.climb != null) vars["--climb"] = ms(row.link.climb);
              return (
                <li key={index} data-climb={row.link?.climb != null ? "" : undefined} style={cssVars(vars)}>
                  {row.link && <span className="map-row-link" />}
                  {row.link?.climb != null && <span className="map-row-climb" />}
                  {row.cards.map((card) => <Chip key={card.id} card={card} />)}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="map-foot">
          <p className="map-say" key={`say-${run}`}>
            {sayings.map((saying, index) => {
              const vars: Record<`--${string}`, string> = { "--in": ms(saying.at) };
              if (saying.until !== null) vars["--out"] = ms(saying.until);
              return (
                <span key={index} data-tone={saying.tone} data-out={saying.until !== null ? "" : undefined} aria-hidden={saying.until !== null || undefined} style={cssVars(vars)}>
                  {saying.glyph && <StatusGlyph glyph={saying.glyph} />}
                  {saying.text}
                </span>
              );
            })}
          </p>
          <Link className="map-cta" href={href} aria-label={`Open the live topology of ${environmentName}`}>
            Open live map
            <Icon name="arrow-right" size={14} className="map-cta-arrow" />
          </Link>
        </div>
      </InView>
    </div>
  );
}
