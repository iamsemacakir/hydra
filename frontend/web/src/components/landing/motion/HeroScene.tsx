"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { cssVars } from "../cssVars";
import { INCIDENT_SERVICE, SERVICE_IDS } from "../graph";
import { StateGlyph } from "../StateGlyph";
import { AFFECTED, APPEAR_ORDER, DEPENDENCY_COUNT, GEOMETRY } from "./geometry";
import styles from "./motion.module.css";

/** Code lines on the file plate, as [indent, width] in characters. Drawn as bars, not text, so they stay sharp at any angle. */
const CODE_BARS: ReadonlyArray<readonly [number, number]> = [
  [0, 9],
  [2, 13],
  [4, 22],
  [2, 12],
  [4, 24],
  [2, 14],
  [4, 30],
  [2, 16],
  [4, 23],
];

const MAP = GEOMETRY.wide;

/**
 * The hero picture: three plates stacked in 3D. The repository file at the bottom, Hydra in the
 * middle and the service map on top. On a 12-second loop the plates lift apart, the file is read,
 * the map is drawn, one service fails and recovers, and the plates settle again. The line under
 * the stack says in words what is happening. Moving the mouse leans the stack a little.
 */
export function HeroScene() {
  const ref = useRef<HTMLDivElement>(null);

  // The loop pauses while the hero is scrolled away.
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.inview = String(entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element || event.pointerType !== "mouse") return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--mx", ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
    element.style.setProperty("--my", ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--mx", "0");
    ref.current?.style.setProperty("--my", "0");
  };

  return (
    <div ref={ref} className={styles.heroVisual} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div
        className={styles.stackStage}
        role="img"
        aria-label={`Animation with a sample system: Hydra reads a compose file, saves ${SERVICE_IDS.length} services as a map, then ${INCIDENT_SERVICE} fails and the services that depend on it are marked potentially affected.`}
      >
        <div className={styles.stack} aria-hidden="true">
          <div className={styles.stackShadow} />

          <div className={`${styles.plate} ${styles.plateCode}`}>
            <div className={styles.plateHead}>
              <i />
              <i />
              <i />
              <span>compose.yaml</span>
            </div>
            <div className={styles.codeBars}>
              {CODE_BARS.map(([indent, width], i) => (
                <span key={i} style={cssVars({ "--indent": indent, "--w": width, "--i": i })} />
              ))}
            </div>
            <span className={styles.readBand} />
          </div>

          <div className={`${styles.plate} ${styles.plateHydra}`}>
            <span className={styles.hydraSweep} />
            <div className={styles.hydraMark}>
              <svg viewBox="0 0 28 28" width="44" height="44" fill="none">
                <path d="M14 20.5V15M14 15 8.6 9.6M14 15l5.4-5.4M14 15V8.6" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="14" cy="20.5" r="2.1" />
                <circle cx="8.6" cy="8.8" r="1.9" />
                <circle cx="14" cy="7.6" r="1.9" />
                <circle cx="19.4" cy="8.8" r="1.9" />
              </svg>
              <span>Hydra</span>
            </div>
          </div>

          <div className={`${styles.plate} ${styles.plateMap}`}>
            <span className={styles.plateTag}>Live map</span>
            <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} className={styles.plateGraph}>
              {MAP.edges.map((edge) => (
                <path
                  key={edge.key}
                  d={edge.d}
                  strokeLinecap="round"
                  className={styles.plateEdge}
                  data-hot={AFFECTED.has(edge.from) && (edge.to === INCIDENT_SERVICE || AFFECTED.has(edge.to))}
                  style={cssVars({ "--len": edge.length, "--i": APPEAR_ORDER.indexOf(edge.to) })}
                />
              ))}
              {SERVICE_IDS.map((id) => {
                const [x, y] = MAP.position[id];
                const state = id === INCIDENT_SERVICE ? "failing" : AFFECTED.has(id) ? "affected" : "fine";
                return (
                  <g key={id} className={styles.plateNode} data-state={state} style={cssVars({ "--i": APPEAR_ORDER.indexOf(id) })}>
                    <g transform={`translate(${x} ${y})`}>
                      <circle className={styles.plateRing} r="34" />
                      <circle className={styles.plateDot} r="20" />
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className={styles.beam}>
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} style={cssVars({ "--i": i })} />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.heroStatus} aria-hidden="true">
        <p data-step="read">
          <span className={styles.statusDot} />
          Reading compose.yaml as text
        </p>
        <p data-step="save">
          <StateGlyph kind="healthy" />
          {SERVICE_IDS.length} services and {DEPENDENCY_COUNT} dependencies saved
        </p>
        <p data-step="fail">
          <StateGlyph kind="degraded" />
          {INCIDENT_SERVICE} degraded · {AFFECTED.size} potentially affected
        </p>
        <p data-step="ok">
          <StateGlyph kind="healthy" />
          Recovered. Every service is OK.
        </p>
      </div>
      <p className={styles.sampleNote}>Sample system</p>
    </div>
  );
}
