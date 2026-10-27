"use client";

import { useMemo, useState } from "react";
import {
  SERVICE_KIND,
  analyzeImpact,
  describeImpact,
  impactFrame,
  type ServiceId,
} from "./graph";
import { Icon } from "./Icon";
import { Legend } from "./Legend";
import { StateGlyph } from "./StateGlyph";
import { TopologyGraph } from "./TopologyGraph";
import styles from "./landing.module.css";

const INITIAL_SELECTION: ServiceId = "payment-service";
const GRAPH_LABEL = "Sample dependency graph. Select a service to see what could be affected if it fails.";

function ImpactGroup({ label, items }: { label: string; items: ServiceId[] }) {
  return (
    <section className={styles.resultGroup}>
      <h4 className={styles.groupLabel}>
        {label} <span className={styles.groupCount}>{items.length}</span>
      </h4>
      {items.length > 0 ? (
        <ul className={styles.groupList}>
          {items.map((id) => (
            <li key={id}>
              <StateGlyph kind="affected" />
              {id}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.groupNone}>None</p>
      )}
    </section>
  );
}

/**
 * Interactive what-if on the same sample graph as the hero. Selecting a service marks it as
 * failed and highlights everything that depends on it, found by walking the declared
 * dependencies in reverse. Results are worded as "potentially affected", never as certain.
 */
export function ImpactExplorer() {
  const [selected, setSelected] = useState<ServiceId | null>(INITIAL_SELECTION);
  const impact = useMemo(() => (selected ? analyzeImpact(selected) : null), [selected]);
  const frame = useMemo(() => impactFrame(impact), [impact]);
  const toggle = (id: ServiceId) => setSelected((current) => (current === id ? null : id));

  return (
    <div className={styles.explorer}>
      <div className={styles.graphPanel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelHint}>
            <Icon name="mouse-pointer-click" size={16} />
            Select any service
          </span>
          <button type="button" className={styles.resetButton} onClick={() => setSelected(null)} disabled={selected === null}>
            <Icon name="rotate-ccw" size={14} />
            Reset
          </button>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.graphWide}>
            <TopologyGraph layout="wide" nodes={frame.nodes} edges={frame.edges} label={GRAPH_LABEL} onSelect={toggle} selected={selected} />
          </div>
          <div className={styles.graphTree}>
            <TopologyGraph layout="tree" nodes={frame.nodes} edges={frame.edges} label={GRAPH_LABEL} onSelect={toggle} selected={selected} />
          </div>
        </div>
        <div className={styles.panelFooter}>
          <Legend rule={false} />
          <span className={styles.sampleNote}>Sample data</span>
        </div>
      </div>

      <aside className={styles.result} aria-label="Impact of the selected service">
        <p className={styles.srOnly} role="status">
          {impact ? `${impact.selected} selected. ${describeImpact(impact)}` : "Selection cleared."}
        </p>
        {/* Keyed so the panel animates in again whenever the selection changes. */}
        <div className={styles.resultBody} key={impact ? impact.selected : "none"}>
          {impact ? (
            <>
              <div>
                <p className={styles.monoLabel}>Selected</p>
                <div className={styles.selectedRow}>
                  <StateGlyph kind="degraded" />
                  <h3 className={styles.selectedName}>{impact.selected}</h3>
                  <span className={styles.tag}>{SERVICE_KIND[impact.selected]}</span>
                </div>
              </div>
              <div>
                <p className={styles.resultSummary}>{describeImpact(impact)}</p>
                <p className={styles.resultMethod}>Found by following declared dependencies in reverse.</p>
              </div>
              <ImpactGroup label="Direct" items={impact.direct} />
              <ImpactGroup label="Indirect" items={impact.indirect} />
              {impact.longestPath.length > 1 && (
                <section className={styles.resultGroup}>
                  <h4 className={styles.groupLabel}>Longest path</h4>
                  <ol className={styles.pathList}>
                    {impact.longestPath.map((id) => (
                      <li key={id}>{id}</li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          ) : (
            <div className={styles.resultEmpty}>
              <p className={styles.resultSummary}>Nothing selected.</p>
              <p className={styles.resultMethod}>Select a service in the graph to see what could be affected if it fails.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
