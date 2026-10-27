"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import s from "./Story.module.css";
import { useFinePointer, useInView, useMounted, usePageVisible, useReducedMotion } from "./hooks";
import {
  AffectedIcon,
  AlertIcon,
  CheckIcon,
  FileIcon,
  HydraMark,
  LockIcon,
  PauseIcon,
  PlayIcon,
  ReadIcon,
  RecoverIcon,
  SaveIcon,
  WaitIcon,
} from "./icons";
import {
  AFFECTED_HOPS,
  BADGE_TEXT,
  CODE_LINES,
  DEPENDENCIES,
  POSTER_HOLD_MS,
  POSTER_PHASE,
  SERVICES,
  STEPS,
  TALL_VIEW,
  TIMELINE,
  WIDE_VIEW,
  dependencyOrder,
  dependencyPath,
  edgeState,
  elapsedInStep,
  isBystander,
  phaseIndex,
  roleOf,
  statusOf,
  stepDuration,
  type Dependency,
  type PhaseId,
  type Role,
  type StatusIcon,
  type StepId,
} from "./story";

/** Inline styles that also carry CSS custom properties. */
type StyleVars = CSSProperties & Record<`--${string}`, string | number>;

const POSTER_INDEX = phaseIndex(POSTER_PHASE);
const POSTER_STEP_DELAY = elapsedInStep(POSTER_PHASE, TIMELINE[POSTER_INDEX].ms - POSTER_HOLD_MS);

const STATUS_ICONS: Record<StatusIcon, ReactNode> = {
  wait: <WaitIcon />,
  read: <ReadIcon />,
  save: <SaveIcon />,
  check: <CheckIcon />,
  alert: <AlertIcon />,
  recover: <RecoverIcon />,
};

const BADGE_ICONS: Record<Exclude<Role, "hidden">, ReactNode> = {
  saved: <SaveIcon />,
  ok: <CheckIcon />,
  failed: <AlertIcon />,
  affected: <AffectedIcon />,
  recovered: <RecoverIcon />,
};

/**
 * The hero story: a compose.yaml is typed, Hydra reads and saves it, the services appear on the map,
 * turn OK, one fails and marks what depends on it, then everything recovers. It loops.
 *
 * The server renders the still frame (the failure and what it potentially affects). With JavaScript and
 * motion allowed, the story plays from there while it is on screen. It pauses when the tab is hidden,
 * when it scrolls out of view, when the visitor presses Pause, and stays still for reduced motion.
 */
export function HeroStory() {
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const pageVisible = usePageVisible();
  const mounted = useMounted();
  const [frameRef, inView] = useInView<HTMLDivElement>(0.25);
  const stageRef = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(POSTER_INDEX);
  const [typingRun, setTypingRun] = useState(0);
  const [stepRun, setStepRun] = useState(0);
  const [stepDelay, setStepDelay] = useState(POSTER_STEP_DELAY);
  const [jumpRun, setJumpRun] = useState(0);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const remaining = useRef(POSTER_HOLD_MS);

  const paused = userPaused ?? reducedMotion;
  const running = mounted && !paused && inView && pageVisible;
  const phase = TIMELINE[index];

  // The clock: one timeout per phase. Pausing keeps the time that was left.
  useEffect(() => {
    if (!running) return;
    let fired = false;
    const startedAt = performance.now();
    const timer = window.setTimeout(() => {
      fired = true;
      const next = (index + 1) % TIMELINE.length;
      remaining.current = TIMELINE[next].ms;
      if (TIMELINE[next].step !== TIMELINE[index].step) {
        setStepRun((run) => run + 1);
        setStepDelay(0);
      }
      if (TIMELINE[next].id === "type") setTypingRun((run) => run + 1);
      setIndex(next);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (!fired) remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt));
    };
  }, [running, index, jumpRun]);

  // A gentle tilt that follows a mouse or trackpad. Layers separate a little while the pointer is over the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reducedMotion || !finePointer) return;
    const current = { x: 0, y: 0, depth: 0 };
    let target = { x: 0, y: 0, depth: 0 };
    let frame = 0;

    const render = () => {
      current.x += (target.x - current.x) * 0.07;
      current.y += (target.y - current.y) * 0.07;
      current.depth += (target.depth - current.depth) * 0.07;
      const settled =
        Math.abs(target.x - current.x) < 0.005 &&
        Math.abs(target.y - current.y) < 0.005 &&
        Math.abs(target.depth - current.depth) < 0.003;
      if (settled && target.depth === 0) {
        stage.style.removeProperty("transform");
        stage.style.removeProperty("--depth");
        frame = 0;
        return;
      }
      stage.style.transform = `perspective(1600px) rotateX(${current.x.toFixed(3)}deg) rotateY(${current.y.toFixed(3)}deg)`;
      stage.style.setProperty("--depth", current.depth.toFixed(3));
      frame = settled ? 0 : window.requestAnimationFrame(render);
    };
    const wake = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      const box = stage.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width - 0.5;
      const py = (event.clientY - box.top) / box.height - 0.5;
      target = { x: -py * 3.2, y: px * 4.2, depth: 1 };
      wake();
    };
    const onLeave = () => {
      target = { x: 0, y: 0, depth: 0 };
      wake();
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      window.cancelAnimationFrame(frame);
      stage.style.removeProperty("transform");
      stage.style.removeProperty("--depth");
    };
  }, [reducedMotion, finePointer]);

  function playFrom(step: StepId) {
    const target = TIMELINE.findIndex((candidate) => candidate.step === step);
    remaining.current = TIMELINE[target].ms;
    setStepRun((run) => run + 1);
    setStepDelay(0);
    if (TIMELINE[target].id === "type") setTypingRun((run) => run + 1);
    setIndex(target);
    setJumpRun((run) => run + 1);
    setUserPaused(false);
  }

  const status = statusOf(phase.id);
  const activeStep = STEPS.findIndex((step) => step.id === phase.step);

  return (
    <div className={s.story} data-phase={phase.id} data-running={running ? "true" : "false"}>
      <p className={s.srOnly} id="hero-story-description">
        An animation of how Hydra works. A compose.yaml file with six services is written. Hydra reads it without
        running anything and saves the services and their dependencies as one map. Each service is marked saved, then
        OK. Then the payments service becomes unhealthy, and the three services that depend on it, orders, api and
        web, are marked potentially affected. The services that do not depend on it stay OK. Payments recovers and the
        map returns to normal.
      </p>

      <div ref={frameRef} className={s.frame}>
        <div ref={stageRef} className={s.stage} id="hero-story" aria-hidden="true">
          <div className={s.panes}>
            <div className={s.codePane}>
              <div className={s.window}>
                <div className={s.windowBar}>
                  <FileIcon className={s.fileIcon} />
                  <span className={s.fileName}>compose.yaml</span>
                  <span className={s.readOnly}>
                    <LockIcon />
                    Read-only
                  </span>
                </div>
                <div className={s.code} key={typingRun} style={{ "--lines": CODE_LINES.length } as StyleVars}>
                  {CODE_LINES.map((line) => (
                    <div
                      key={line.number}
                      className={s.line}
                      style={
                        {
                          "--n": line.length,
                          "--indent": line.indent,
                          "--start": `${line.start}ms`,
                          "--d": `${line.duration}ms`,
                        } as StyleVars
                      }
                    >
                      <span className={s.lineNumber}>{line.number}</span>
                      <span className={s.lineCode}>
                        <span>{" ".repeat(line.indent)}</span>
                        <span className={s.typed}>
                          {line.tokens.map((token, tokenIndex) => (
                            <span key={tokenIndex} className={s[token.kind]}>
                              {token.text}
                            </span>
                          ))}
                        </span>
                        <span className={s.caret} />
                      </span>
                    </div>
                  ))}
                  <span className={s.scan} />
                </div>
              </div>
            </div>

            <div className={s.link}>
              <span className={s.linkLine} />
              {[0, 1, 2, 3].map((packet) => (
                <span key={packet} className={s.packet} style={{ "--i": packet } as StyleVars} />
              ))}
              <span className={s.port} />
            </div>

            <div className={s.mapPane}>
              <div className={s.mapHead}>
                <span className={s.brand}>
                  <HydraMark className={s.brandMark} />
                  Hydra
                </span>
                <span className={s.status} data-icon={status.icon}>
                  <span key={status.text} className={s.statusText}>
                    {STATUS_ICONS[status.icon]}
                    {status.text}
                  </span>
                </span>
              </div>
              <div className={s.canvas}>
                <Edges layout="wide" phase={phase.id} />
                <Edges layout="tall" phase={phase.id} />
                {SERVICES.map((service) => {
                  const role = roleOf(service.id, phase.id);
                  return (
                    <div
                      key={service.id}
                      className={s.node}
                      data-role={role}
                      data-bystander={isBystander(service.id, phase.id) ? "true" : "false"}
                      style={
                        {
                          "--wx": service.wide.x,
                          "--wy": service.wide.y,
                          "--tx": service.tall.x,
                          "--ty": service.tall.y,
                          "--order": service.order,
                          "--hop": AFFECTED_HOPS.get(service.id) ?? 0,
                        } as StyleVars
                      }
                    >
                      <div className={s.nodeBody}>
                        <span className={s.point} />
                        <span className={s.label}>
                          <span className={s.name}>{service.id}</span>
                          <Badge role={role} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.controls}>
        <ol className={s.steps} role="list" aria-label="Steps of the animation">
          {STEPS.map((step, stepIndex) => {
            const active = stepIndex === activeStep;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  className={s.stepButton}
                  data-state={active ? "active" : stepIndex < activeStep ? "done" : "todo"}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Play from ${step.label}`}
                  aria-controls="hero-story"
                  onClick={() => playFrom(step.id)}
                >
                  <span className={s.stepLabel}>{step.label}</span>
                  <span className={s.stepTrack}>
                    <span
                      key={active ? `run-${stepRun}` : "rest"}
                      className={s.stepFill}
                      style={
                        active
                          ? ({ "--step-ms": `${stepDuration(step.id)}ms`, "--step-delay": `${-stepDelay}ms` } as StyleVars)
                          : undefined
                      }
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className={s.pause}
          aria-controls="hero-story"
          aria-describedby="hero-story-description"
          onClick={() => setUserPaused(!paused)}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </div>
  );
}

function Badge({ role }: { role: Role }) {
  const shown = role === "hidden" ? "saved" : role;
  return (
    <span key={shown} className={s.badge} data-role={shown}>
      {BADGE_ICONS[shown]}
      {BADGE_TEXT[shown]}
    </span>
  );
}

function Edges({ layout, phase }: { layout: "wide" | "tall"; phase: PhaseId }) {
  const view = layout === "wide" ? WIDE_VIEW : TALL_VIEW;
  return (
    <svg
      className={`${s.edges} ${layout === "wide" ? s.edgesWide : s.edgesTall}`}
      viewBox={`0 0 ${view.width} ${view.height}`}
      preserveAspectRatio="none"
      focusable="false"
    >
      {DEPENDENCIES.map((dependency) => (
        <Edge key={`${dependency.from}-${dependency.to}`} dependency={dependency} layout={layout} phase={phase} />
      ))}
    </svg>
  );
}

function Edge({ dependency, layout, phase }: { dependency: Dependency; layout: "wide" | "tall"; phase: PhaseId }) {
  const path = dependencyPath(dependency, layout);
  return (
    <g
      className={s.edge}
      data-state={edgeState(dependency, phase)}
      style={{ "--edge-order": dependencyOrder(dependency) } as StyleVars}
    >
      <path className={s.edgeLine} d={path} pathLength={1} />
      <path className={s.edgePulse} d={path} pathLength={1} />
    </g>
  );
}
