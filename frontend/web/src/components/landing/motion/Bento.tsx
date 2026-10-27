import type { ReactNode } from "react";
import { SECTION_IDS } from "../content";
import { cssVars } from "../cssVars";
import { INCIDENT_SERVICE } from "../graph";
import { Icon } from "../Icon";
import lp from "../landing.module.css";
import { Reveal } from "../Reveal";
import { SectionHeader } from "../SectionHeader";
import { StateGlyph } from "../StateGlyph";
import { APPEAR_ORDER, GEOMETRY, SAMPLE_IMPACT, type GraphKind } from "./geometry";
import { InView } from "./InView";
import { Tilt } from "./Tilt";
import styles from "./motion.module.css";

/*
 * Capabilities as tiles. Every tile names something the workspace does today and has its own
 * small loop: data flowing along edges, a ripple, a heartbeat, a feed, a comparison, a lock, a
 * card moving across a board. Loops pause when a tile is scrolled away.
 */

type TileProps = { title: string; text: string; className?: string; delay?: number; children: ReactNode };

function Tile({ title, text, className, delay = 0, children }: TileProps) {
  return (
    <Reveal delay={delay} className={[styles.tileCell, className].filter(Boolean).join(" ")}>
      <InView className={styles.tileInView}>
        <Tilt className={styles.tile}>
          <div className={styles.tileFigure} aria-hidden="true">
            {children}
          </div>
          <div className={styles.tileHead}>
            <h3 className={styles.tileTitle}>{title}</h3>
            <p className={styles.tileText}>{text}</p>
          </div>
        </Tilt>
      </InView>
    </Reveal>
  );
}

function FlowMap({ kind }: { kind: GraphKind }) {
  const g = GEOMETRY[kind];
  const half = g.pill.width / 2;
  const hh = g.pill.height / 2;
  return (
    <svg viewBox={`0 0 ${g.width} ${g.height}`} className={`${styles.flowMap} ${kind === "wide" ? styles.graphWide : styles.graphTall}`}>
      {g.edges.map((edge) => (
        <g key={edge.key}>
          <path className={styles.flowTrack} d={edge.d} />
          <path className={styles.flowDots} d={edge.d} />
          <path className={styles.edgeArrow} d={edge.arrow} />
        </g>
      ))}
      {APPEAR_ORDER.map((id) => {
        const [x, y] = g.position[id];
        return g.node === "point" ? (
          <g key={id} transform={`translate(${x} ${y})`} className={styles.flowNode}>
            <circle r={g.radius} />
            <circle className={styles.flowCore} r="4.5" />
            <text y={g.radius + 17} fontSize={g.font} textAnchor="middle">
              {id}
            </text>
          </g>
        ) : (
          <g key={id} transform={`translate(${x} ${y})`} className={styles.flowNode}>
            <rect x={-half} y={-hh} width={g.pill.width} height={g.pill.height} rx={hh} />
            <circle className={styles.flowCore} cx={-half + 15} cy="0" r="4" />
            <text x={-half + 27} y={g.font * 0.36} fontSize={g.font}>
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const IMPACT_ROWS = [
  ...SAMPLE_IMPACT.direct.map((id) => ({ id, note: "direct" })),
  ...SAMPLE_IMPACT.indirect.map((id) => ({ id, note: "indirect" })),
];

const EVENTS = [
  { time: "10:00", text: `${INCIDENT_SERVICE} v1.4.0 deployed`, kind: "healthy" as const },
  { time: "10:04", text: "Error rate above threshold", kind: "unknown" as const },
  { time: "10:05", text: "Health changed to degraded", kind: "degraded" as const },
];

const ENV_ROWS = [
  { service: "api-gateway", dev: "2.3.0", prod: "2.3.0" },
  { service: "order-service", dev: "3.1.2", prod: "3.1.2" },
  { service: INCIDENT_SERVICE, dev: "1.4.1", prod: "1.4.0" },
];

export function Bento() {
  return (
    <section id={SECTION_IDS.capabilities} className={`${lp.section} ${styles.bentoSection}`} aria-labelledby="capabilities-title">
      <div className={lp.wrap}>
        <SectionHeader
          id="capabilities-title"
          eyebrow="Capabilities"
          title="One model for the whole system."
          lede="Components, dependencies, deployments, health and events sit in one place, so nobody has to piece them together during an incident."
        />
        <div className={styles.bentoGrid}>
          <Tile
            className={styles.span2}
            title="Live topology"
            text="Every service and its dependencies on one map. Filter by type, health or where a dependency came from."
          >
            <div className={styles.flowBox}>
              <FlowMap kind="wide" />
              <FlowMap kind="tall" />
            </div>
          </Tile>

          <Tile delay={80} title="Impact analysis" text="Pick a service and see which others may be affected, directly or through the chain.">
            <div className={styles.ripple}>
              <span className={styles.rippleRings}>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.rippleCore}>
                <StateGlyph kind="degraded" />
                {INCIDENT_SERVICE}
              </span>
            </div>
            <ul className={styles.impactRows}>
              {IMPACT_ROWS.map((row, i) => (
                <li key={row.id} style={cssVars({ "--i": i })}>
                  <StateGlyph kind="affected" />
                  {row.id}
                  <span>{row.note}</span>
                </li>
              ))}
            </ul>
          </Tile>

          <Tile delay={0} title="Runtime health" text="Healthy, degraded, unhealthy or unknown, updated live without reloading the page.">
            <div className={styles.pulse}>
              <svg viewBox="0 0 240 60" preserveAspectRatio="none" className={styles.pulseLine}>
                <path d="M0 34H40l8-14 10 30 10-40 9 24h43l8-14 10 30 10-40 9 24h83" />
              </svg>
              <svg viewBox="0 0 240 60" preserveAspectRatio="none" className={styles.pulseLine} data-copy>
                <path d="M0 34H40l8-14 10 30 10-40 9 24h43l8-14 10 30 10-40 9 24h83" />
              </svg>
            </div>
            <div className={styles.flipStatus}>
              <span className={styles.flipStatusFace} data-face="ok">
                <StateGlyph kind="healthy" />
                Healthy
              </span>
              <span className={styles.flipStatusFace} data-face="bad">
                <StateGlyph kind="degraded" />
                Degraded
              </span>
            </div>
          </Tile>

          <Tile delay={80} title="Deployments and events" text="Deployments and health changes on one timeline, so you can see what changed around an incident.">
            <ol className={styles.feed}>
              {EVENTS.map((event, i) => (
                <li key={event.time} style={cssVars({ "--i": i })}>
                  <span className={styles.feedTime}>{event.time}</span>
                  <StateGlyph kind={event.kind} />
                  <span>{event.text}</span>
                </li>
              ))}
            </ol>
          </Tile>

          <Tile delay={160} title="Environments" text="Compare two environments side by side: deployed versions and recorded health.">
            <div className={styles.envTable}>
              <span className={styles.envHead}>Service</span>
              <span className={styles.envHead}>Development</span>
              <span className={styles.envHead}>Production</span>
              {ENV_ROWS.map((row) => (
                <div key={row.service} className={styles.envRow} data-differs={row.dev !== row.prod}>
                  <span>{row.service}</span>
                  <span>{row.dev}</span>
                  <span>{row.prod}</span>
                </div>
              ))}
              <span className={styles.envScan} />
              <em className={styles.envNote}>1 version differs</em>
            </div>
          </Tile>

          <Tile delay={0} title="Read-only by design" text="Hydra reads configuration as text. It never runs your code or changes your repository.">
            <div className={styles.lockArt}>
              <span className={styles.lockFile}>
                <Icon name="file-code" size={40} strokeWidth={1.5} />
                <i className={styles.lockScan} />
              </span>
              <svg className={styles.lock} viewBox="0 0 40 48" width="44" height="52">
                <path className={styles.lockShackle} d="M11 22v-7a9 9 0 0 1 18 0v7" />
                <rect className={styles.lockBody} x="5" y="22" width="30" height="22" rx="6" />
                <circle className={styles.lockHole} cx="20" cy="33" r="3" />
              </svg>
            </div>
          </Tile>

          <Tile
            className={styles.span2}
            delay={80}
            title="Boards"
            text="Track work in New, Active, Resolved and Closed, and link each item to the components it affects."
          >
            <div className={styles.board}>
              {["New", "Active", "Resolved", "Closed"].map((column) => (
                <div key={column} className={styles.boardColumn}>
                  <span className={styles.boardName}>{column}</span>
                  <span className={styles.boardCard} />
                </div>
              ))}
              <span className={styles.boardMover}>
                <StateGlyph kind="degraded" />
                Error rate
              </span>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}
