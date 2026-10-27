import type { ReactNode } from "react";
import { SECTION_IDS } from "./content";
import { INCIDENT_SERVICE, analyzeImpact, frameFor, summarizeImpact, type ServiceId } from "./graph";
import { Icon } from "./Icon";
import { Legend } from "./Legend";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";
import { StateGlyph, type GlyphKind } from "./StateGlyph";
import { TopologyGraph } from "./TopologyGraph";
import styles from "./landing.module.css";

/*
 * Every tile describes something the product does today (topology filters, impact analysis,
 * live runtime health, deployments and events, environment comparison, boards). The figures
 * are small illustrations built from the same sample data as the hero.
 */

const TOPOLOGY_FRAME = frameFor("incident");
const IMPACT = analyzeImpact(INCIDENT_SERVICE);

type Chip = { id: ServiceId; kind: GlyphKind; note: string };

const IMPACT_CHIPS: readonly Chip[] = [
  { id: INCIDENT_SERVICE, kind: "degraded", note: "degraded" },
  ...IMPACT.direct.map((id): Chip => ({ id, kind: "affected", note: "direct" })),
  ...IMPACT.indirect.map((id): Chip => ({ id, kind: "affected", note: "indirect" })),
];

/** The three filters of the topology workspace, shown as they read in the product (type, health, dependency source). */
const FILTERS: readonly string[] = ["All types", "All health", "All sources"];

const HEALTH: ReadonlyArray<{ kind: GlyphKind; label: string }> = [
  { kind: "healthy", label: "Healthy" },
  { kind: "degraded", label: "Degraded" },
  { kind: "unhealthy", label: "Unhealthy" },
  { kind: "unknown", label: "Unknown" },
];

const EVENTS: ReadonlyArray<{ time: string; text: string; kind?: GlyphKind }> = [
  { time: "10:00", text: `${INCIDENT_SERVICE} v1.4.0 deployed` },
  { time: "10:04", text: "Error rate above threshold" },
  { time: "10:05", text: "Health changed to degraded", kind: "degraded" },
];

const BOARD: ReadonlyArray<{ name: string; cards: number }> = [
  { name: "New", cards: 1 },
  { name: "Active", cards: 2 },
  { name: "Resolved", cards: 1 },
  { name: "Closed", cards: 1 },
];

type TileProps = {
  title: string;
  text: string;
  children: ReactNode;
  figureClassName?: string;
};

/** A capability: a heading, one sentence, and a decorative figure that is hidden from assistive technology. */
function Tile({ title, text, children, figureClassName }: TileProps) {
  return (
    <article className={styles.tile}>
      <div className={styles.tileHead}>
        <h3 className={styles.tileTitle}>{title}</h3>
        <p className={styles.tileText}>{text}</p>
      </div>
      <div className={[styles.figure, figureClassName].filter(Boolean).join(" ")} aria-hidden="true">
        {children}
      </div>
    </article>
  );
}

export function Capabilities() {
  return (
    <section id={SECTION_IDS.capabilities} className={styles.section} aria-labelledby="capabilities-title">
      <div className={styles.wrap}>
        <SectionHeader
          id="capabilities-title"
          eyebrow="Capabilities"
          title="One model for the whole system."
          lede="Components, dependencies, deployments, health and events sit in one place, so nobody has to piece them together during an incident."
        />
        <div className={styles.bento}>
          <Reveal className={styles.stretch}>
            <Tile
              title="Topology"
              text="Every service and its dependencies on one live map. Filter by type, health or where a dependency came from."
              figureClassName={styles.figureGraph}
            >
              <div className={styles.filters}>
                {FILTERS.map((label) => (
                  <span key={label} className={styles.filter}>
                    {label}
                    <Icon name="chevron-down" size={14} />
                  </span>
                ))}
              </div>
              <div className={styles.thumb}>
                <div className={styles.thumbWide}>
                  <TopologyGraph layout="wide" nodes={TOPOLOGY_FRAME.nodes} edges={TOPOLOGY_FRAME.edges} label="Sample dependency graph" />
                </div>
                <div className={styles.thumbTree}>
                  <TopologyGraph layout="tree" nodes={TOPOLOGY_FRAME.nodes} edges={TOPOLOGY_FRAME.edges} label="Sample dependency graph" />
                </div>
              </div>
              <Legend rule={false} />
            </Tile>
          </Reveal>

          <div className={styles.bentoRight}>
            <Reveal delay={80}>
              <Tile
                title="Impact analysis"
                text="Select a service to see which others may be affected, directly or through the chain."
              >
                <ul className={styles.chips}>
                  {IMPACT_CHIPS.map((chip) => (
                    <li key={chip.id} className={styles.chip}>
                      <StateGlyph kind={chip.kind} />
                      {chip.id}
                      <span className={styles.chipNote}>{chip.note}</span>
                    </li>
                  ))}
                </ul>
                <p className={styles.figureCaption}>{summarizeImpact(IMPACT)}</p>
              </Tile>
            </Reveal>

            <div className={styles.bentoPair}>
              <Reveal delay={160} className={styles.stretch}>
                <Tile title="Runtime health" text="Healthy, degraded, unhealthy or unknown, updated without reloading the page.">
                  <ul className={styles.healthGrid}>
                    {HEALTH.map((item) => (
                      <li key={item.kind} className={styles.healthItem}>
                        <StateGlyph kind={item.kind} />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </Tile>
              </Reveal>
              <Reveal delay={240} className={styles.stretch}>
                <Tile
                  title="Deployments and events"
                  text="Deployments, health changes and other operational events on one timeline, so you can see what changed around an incident."
                >
                  <ol className={styles.timeline}>
                    {EVENTS.map((event) => (
                      <li key={event.time} className={styles.timelineItem}>
                        <span className={styles.timelineTime}>{event.time}</span>
                        <span className={styles.timelineText}>
                          {event.kind && <StateGlyph kind={event.kind} />}
                          {event.text}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className={styles.figureCaption}>Sample events</p>
                </Tile>
              </Reveal>
            </div>
          </div>

          <Reveal delay={80} className={styles.stretch}>
            <Tile title="Environments" text="Compare two environments side by side: deployed versions and recorded health.">
              <div className={styles.compare}>
                <span className={styles.envPill}>Development</span>
                <Icon name="git-compare-arrows" size={20} />
                <span className={styles.envPill}>Production</span>
              </div>
            </Tile>
          </Reveal>

          <Reveal delay={160} className={styles.stretch}>
            <Tile title="Boards" text="Track work in New, Active, Resolved and Closed, and link items to the components they affect.">
              <div className={styles.miniBoard}>
                {BOARD.map((column) => (
                  <div key={column.name} className={styles.miniColumn}>
                    <span className={styles.miniColumnName}>{column.name}</span>
                    {Array.from({ length: column.cards }, (_, card) => (
                      <span key={card} className={styles.miniCard}>
                        <span />
                        <span />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </Tile>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
