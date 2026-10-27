"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cssVars } from "./cssVars";
import { COMPOSE_EXCERPT, DEPENDENCIES, PHASES, frameFor } from "./graph";
import { Icon } from "./Icon";
import { Legend } from "./Legend";
import { TopologyGraph } from "./TopologyGraph";
import styles from "./landing.module.css";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
const getReducedMotionOnServer = () => false;

/**
 * The server HTML shows the Impact frame, the most informative one. It stays that way without
 * JavaScript and for visitors who prefer reduced motion. With motion allowed the loop simply
 * continues from there, so nothing jumps on hydration.
 */
const FIRST_PHASE = PHASES.findIndex((phase) => phase.id === "impact");

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * The hero demo: a six-step story (scan, map, observe, incident, impact, recover) that loops.
 *
 * The CSS animation of the active progress bar is the clock: when it ends, the next phase
 * starts. Pausing the animation therefore pauses the story, with no timers to keep in sync.
 * The loop pauses on pointer hover, keyboard focus, when scrolled out of view, and on request.
 */
export function HeroStage() {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getReducedMotionOnServer);
  const [index, setIndex] = useState(FIRST_PHASE);
  const [restart, setRestart] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [inView, setInView] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const running = hydrated && !reducedMotion;
  const paused = userPaused || hovered || keyboardFocus || !inView;
  const phase = PHASES[index];
  const frame = frameFor(phase.id);

  const advance = useCallback(() => setIndex((current) => (current + 1) % PHASES.length), []);
  const choose = (next: number) => {
    setIndex(next);
    setRestart((count) => count + 1);
  };

  return (
    <div
      ref={rootRef}
      className={styles.stage}
      role="group"
      aria-label="Animated demo of a failure spreading through a sample system"
      data-phase={phase.id}
      data-running={running}
      data-paused={paused}
      style={cssVars({ "--phase-ms": `${phase.ms}ms`, "--scan-ms": `${PHASES[0].ms}ms` })}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocus={(event) => setKeyboardFocus(event.target.matches(":focus-visible"))}
      onBlur={() => setKeyboardFocus(false)}
    >
      <div className={styles.stageHeader}>
        <div className={styles.stageTitle}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span className={styles.stageName}>Commerce Demo</span>
          <span className={styles.sampleTag}>sample data</span>
        </div>
        <div className={styles.stageControls}>
          <span className={styles.phaseChip} key={phase.id}>
            {pad(index + 1)} {phase.label}
          </span>
          <button
            type="button"
            className={styles.pauseButton}
            onClick={() => setUserPaused((value) => !value)}
            aria-label={userPaused ? "Play animation" : "Pause animation"}
          >
            <Icon name={userPaused ? "play" : "pause"} size={14} />
          </button>
        </div>
      </div>

      <div className={styles.code} aria-hidden="true">
        <div className={styles.codeHead}>
          <Icon name="file-code" size={14} />
          <span>compose.yaml</span>
          <span className={styles.codeMuted}>/ simplified</span>
        </div>
        <div className={styles.codeLines}>
          <span className={styles.scanBar} />
          {COMPOSE_EXCERPT.map((row, line) => (
            <div key={row.service} className={styles.codeLine}>
              <span className={styles.codeNo}>{line + 1}</span>
              <span className={styles.codeService}>{row.service}:</span>
              <span className={styles.codeDepends}>depends_on: [{row.dependsOn.join(", ")}]</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.graphArea}>
        <span className={styles.sweep} aria-hidden="true" />
        <div className={styles.graphWide}>
          <TopologyGraph layout="wide" nodes={frame.nodes} edges={frame.edges} label="Sample dependency graph" />
        </div>
        <div className={styles.graphTree}>
          <TopologyGraph layout="tree" nodes={frame.nodes} edges={frame.edges} label="Sample dependency graph" />
        </div>
        <Legend className={styles.stageLegend} />
        <p className={styles.sampleNarrow}>Sample data</p>
      </div>

      <p className={styles.srOnly}>The sample system has these dependencies:</p>
      <ul className={styles.srOnly}>
        {DEPENDENCIES.map(([from, to]) => (
          <li key={`${from}>${to}`}>
            {from} depends on {to}
          </li>
        ))}
      </ul>

      <div className={styles.stageFoot}>
        <p className={styles.caption} key={phase.id}>
          {phase.caption}
        </p>
        <ol className={styles.stepper} aria-label="Animation steps">
          {PHASES.map((step, position) => {
            const state = position < index ? "done" : position === index ? "active" : "todo";
            return (
              <li key={step.id}>
                <button
                  type="button"
                  className={styles.stepButton}
                  aria-current={position === index ? "step" : undefined}
                  aria-label={`Step ${position + 1} of ${PHASES.length}: ${step.label}`}
                  onClick={() => choose(position)}
                >
                  <span className={styles.stepTrack} aria-hidden="true">
                    <span
                      key={`${position}-${restart}`}
                      className={styles.stepFill}
                      data-state={state}
                      onAnimationEnd={state === "active" ? advance : undefined}
                    />
                  </span>
                  <span className={styles.stepLabel} aria-hidden="true">
                    <span className={styles.stepIndex}>{position + 1}</span>
                    <span className={styles.stepName}>{step.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
