"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  PointerIcon,
  ReadIcon,
  RecoverIcon,
  SaveIcon,
  WaitIcon,
} from "./icons";
import {
  BADGE_TEXT,
  CODE_LINES,
  DEPENDENCIES,
  FLY_LEAD_MS,
  FLY_MS,
  FLY_STAGGER_MS,
  HEAL_STEP_MS,
  POSTER_HOLD_MS,
  POSTER_PHASE,
  SERVICES,
  STEPS,
  STORY_FAILING,
  TALL_VIEW,
  TIMELINE,
  WIDE_VIEW,
  announcementFor,
  deepestHop,
  dependencyOrder,
  dependencyPath,
  edgeState,
  elapsedInStep,
  isBystander,
  phaseIndex,
  roleOf,
  serviceById,
  statusOf,
  stepDuration,
  storyIncident,
  storyMapState,
  type Dependency,
  type EdgeState,
  type Incident,
  type MapState,
  type Role,
  type ServiceId,
  type StatusIcon,
  type StepId,
} from "./story";

/** Inline styles that also carry CSS custom properties. */
type StyleVars = CSSProperties & Record<`--${string}`, string | number>;

/** "story" plays the loop by itself; "explore" is a visitor breaking services on the map. */
type Mode = "story" | "explore";

const POSTER_INDEX = phaseIndex(POSTER_PHASE);
const POSTER_STEP_DELAY = elapsedInStep(POSTER_PHASE, TIMELINE[POSTER_INDEX].ms - POSTER_HOLD_MS);

/** The same timing numbers the flight script uses, handed to the CSS. */
const CHOREOGRAPHY: StyleVars = {
  "--fly-lead": `${FLY_LEAD_MS}ms`,
  "--fly-stagger": `${FLY_STAGGER_MS}ms`,
  "--fly-ms": `${FLY_MS}ms`,
  "--heal-ms": `${HEAL_STEP_MS}ms`,
};

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

type Point = { x: number; y: number };

/** Position of an element inside an ancestor, from layout alone (transforms ignored). */
function offsetWithin(element: HTMLElement, ancestor: HTMLElement): Point | null {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
  }
  return node === ancestor ? { x, y } : null;
}

const FLIGHT_SAMPLES = 12;

/**
 * Keyframes for one flying service name. It lifts (grows a little), travels along a gentle arc that rises
 * above both ends (a quadratic curve), then shrinks into its point and fades as it lands.
 */
function flightFrames(from: Point, to: Point): Keyframe[] {
  const lift = Math.min(96, Math.max(40, Math.hypot(to.x - from.x, to.y - from.y) * 0.24));
  const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
  const frames: Keyframe[] = [];
  for (let i = 0; i <= FLIGHT_SAMPLES; i += 1) {
    const t = i / FLIGHT_SAMPLES;
    const u = 1 - t;
    const x = u * u * from.x + 2 * u * t * control.x + t * t * to.x;
    const y = u * u * from.y + 2 * u * t * control.y + t * t * to.y;
    const lifting = Math.min(1, t / 0.15);
    const landing = Math.max(0, (t - 0.78) / 0.22);
    const scale = 1 + 0.08 * lifting - 0.7 * landing;
    const opacity = Math.min(1, Math.max(0, (1 - t) / 0.16));
    frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`, opacity, offset: t });
  }
  return frames;
}

/**
 * The hero story: a compose.yaml is typed, Hydra reads it, each service name flies from the file to its
 * point on the map, the services turn OK, one fails and marks what depends on it, then everything heals.
 * Visitors can also tap any service to break it and see what it would potentially affect.
 *
 * The server renders the still frame (the failure and what it potentially affects). With JavaScript and
 * motion allowed, the story plays from there while it is on screen. It pauses when the tab is hidden, when
 * it scrolls out of view and when the visitor presses Pause, and stays still for reduced motion.
 */
export function HeroStory() {
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const pageVisible = usePageVisible();
  const mounted = useMounted();
  const [frameRef, inView] = useInView<HTMLDivElement>(0.25);
  const stageRef = useRef<HTMLDivElement>(null);
  const flightLayerRef = useRef<HTMLDivElement>(null);
  const flights = useRef<Animation[]>([]);

  const [index, setIndex] = useState(POSTER_INDEX);
  const [typingRun, setTypingRun] = useState(0);
  const [stepRun, setStepRun] = useState(0);
  const [stepDelay, setStepDelay] = useState(POSTER_STEP_DELAY);
  const [jumpRun, setJumpRun] = useState(0);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("story");
  const [manual, setManual] = useState<Incident | null>(null);
  const [focus, setFocus] = useState<ServiceId>(STORY_FAILING);
  const [incidentRun, setIncidentRun] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const remaining = useRef(POSTER_HOLD_MS);

  const exploring = mode === "explore";
  const paused = userPaused ?? reducedMotion;
  const onScreen = mounted && inView && pageVisible;
  const clockRunning = onScreen && !exploring && !paused;
  const cssRunning = onScreen && (exploring || !paused);
  const phase = TIMELINE[index];
  const mapState: MapState = exploring ? "ok" : storyMapState(phase.id);
  const incident = exploring ? manual : storyIncident(phase.id);
  const incidentLive = incident !== null && !incident.healing;
  const focusService = serviceById(incident?.failing ?? focus);
  const status = statusOf(exploring ? "explore" : phase.id, incident);
  const activeStep = exploring ? -1 : STEPS.findIndex((step) => step.id === phase.step);

  // The clock: one timeout per phase. Pausing keeps the time that was left.
  useEffect(() => {
    if (!clockRunning) return;
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
  }, [clockRunning, index, jumpRun]);

  // A visitor's failure travels one hop at a time, then waits until they restore it.
  useEffect(() => {
    if (!manual || manual.healing || manual.reach >= deepestHop(manual.failing)) return;
    const failing = manual.failing;
    const timer = window.setTimeout(
      () =>
        setManual((current) =>
          current && !current.healing && current.failing === failing ? { ...current, reach: current.reach + 1 } : current,
        ),
      manual.reach === 0 ? 900 : 700,
    );
    return () => window.clearTimeout(timer);
  }, [manual]);

  // Restoring it sends the recovery back the same way, one hop at a time, then the map settles.
  useEffect(() => {
    if (!manual?.healing) return;
    const failing = manual.failing;
    const settled = manual.reach >= deepestHop(failing);
    const timer = window.setTimeout(
      () =>
        setManual((current) => {
          if (!current || !current.healing || current.failing !== failing) return current;
          return settled ? null : { ...current, reach: current.reach + 1 };
        }),
      settled ? 1300 : manual.reach === 0 ? HEAL_STEP_MS + 160 : HEAL_STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [manual]);

  // The headline's full stop turns red while something is failing.
  useEffect(() => {
    document.documentElement.dataset.hydraIncident = incidentLive ? "true" : "false";
  }, [incidentLive]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset.hydraIncident;
    },
    [],
  );

  // The signature move: each service name lifts out of the file and flies to its point on the map.
  // A layout effect, so the names are already lifted in the first frame of the map phase.
  useLayoutEffect(() => {
    if (exploring || phase.id !== "map" || reducedMotion || !mounted) return;
    const stage = stageRef.current;
    const layer = flightLayerRef.current;
    if (!stage || !layer) return;
    const animations: Animation[] = [];
    const chips: HTMLElement[] = [];
    for (const service of SERVICES) {
      const token = stage.querySelector<HTMLElement>(`[data-token="${service.id}"]`);
      const node = stage.querySelector<HTMLElement>(`[data-service="${service.id}"]`);
      if (!token || !node) continue;
      const from = offsetWithin(token, stage);
      const to = offsetWithin(node, stage);
      if (!from || !to) continue;
      const chip = document.createElement("span");
      chip.className = s.flight;
      chip.textContent = service.id;
      layer.appendChild(chip);
      chips.push(chip);
      const start = { x: from.x - (chip.offsetWidth - token.offsetWidth) / 2, y: from.y - (chip.offsetHeight - token.offsetHeight) / 2 };
      const end = { x: to.x - chip.offsetWidth / 2, y: to.y - chip.offsetHeight / 2 };
      const animation = chip.animate(flightFrames(start, end), {
        duration: FLY_MS,
        delay: FLY_LEAD_MS + service.order * FLY_STAGGER_MS,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "both",
      });
      animation.onfinish = () => chip.remove();
      animations.push(animation);
    }
    flights.current = animations;
    return () => {
      for (const animation of animations) animation.cancel();
      for (const chip of chips) chip.remove();
      flights.current = [];
    };
  }, [exploring, phase.id, reducedMotion, mounted]);

  // Flights pause and resume with everything else.
  useEffect(() => {
    for (const animation of flights.current) {
      if (cssRunning && animation.playState === "paused") animation.play();
      if (!cssRunning && animation.playState === "running") animation.pause();
    }
  }, [cssRunning]);

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

  function jumpTo(target: number) {
    const next = TIMELINE[target];
    remaining.current = next.ms;
    setMode("story");
    setManual(null);
    setFocus(STORY_FAILING);
    setStepRun((run) => run + 1);
    setStepDelay(elapsedInStep(next.id, 0));
    if (next.id === "type") setTypingRun((run) => run + 1);
    setIndex(target);
    setJumpRun((run) => run + 1);
    setUserPaused(false);
  }

  function playFrom(step: StepId) {
    jumpTo(TIMELINE.findIndex((candidate) => candidate.step === step));
  }

  function toggleMotion() {
    if (exploring) {
      // Back to the story, from a calm map.
      jumpTo(phaseIndex("calm"));
      return;
    }
    setUserPaused(!paused);
  }

  function breakService(id: ServiceId) {
    setMode("explore");
    setFocus(id);
    if (manual && manual.failing === id && !manual.healing) {
      setManual({ failing: id, reach: reducedMotion ? deepestHop(id) : 0, healing: true });
      setAnnouncement(announcementFor(null, id));
      return;
    }
    const next: Incident = { failing: id, reach: reducedMotion ? deepestHop(id) : 0, healing: false };
    setManual(next);
    setIncidentRun((run) => run + 1);
    setAnnouncement(announcementFor(next, null));
  }

  const focusVars: StyleVars = {
    "--fx": focusService.wide.x,
    "--fy": focusService.wide.y,
    "--ftx": focusService.tall.x,
    "--fty": focusService.tall.y,
  };

  return (
    <div
      className={s.story}
      data-phase={exploring ? "explore" : phase.id}
      data-map={mapState}
      data-running={cssRunning ? "true" : "false"}
      data-incident={incident ? (incident.healing ? "healing" : "active") : "none"}
      data-reach={incident ? incident.reach : undefined}
      style={CHOREOGRAPHY}
    >
      <p className={s.srOnly} id="hero-story-description">
        An animation of how Hydra works. A compose.yaml file with six services is written. Hydra reads it without
        running anything, and each service moves from the file onto one map, joined by its dependencies. Each service
        is marked saved, then OK. Then the payments service becomes unhealthy, and the three services that depend on
        it, orders, api and web, are marked potentially affected. Catalog and db do not depend on it and stay OK.
        Payments recovers and the map returns to normal. You can also choose any service on the map to see what
        depends on it.
      </p>
      <p className={s.srOnly} aria-live="polite">
        {announcement}
      </p>

      <div ref={frameRef} className={s.frame}>
        <div ref={stageRef} className={s.stage} id="hero-story">
          <div className={s.panes}>
            <div className={s.codePane} aria-hidden="true">
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
                  {CODE_LINES.map((line, lineIndex) => {
                    const owner = line.defines ? serviceById(line.defines) : null;
                    return (
                      <div
                        key={line.number}
                        className={s.line}
                        data-defines={line.defines ? "true" : undefined}
                        data-glow={line.glowAt !== undefined ? "true" : undefined}
                        style={
                          {
                            "--n": line.length,
                            "--indent": line.indent,
                            "--start": `${line.start}ms`,
                            "--d": `${line.duration}ms`,
                            "--line-index": lineIndex,
                            "--order": owner ? owner.order : 0,
                            "--glow-at": `${line.glowAt ?? 0}ms`,
                          } as StyleVars
                        }
                      >
                        <span className={s.lineNumber}>{line.number}</span>
                        <span className={s.lineCode}>
                          <span>{" ".repeat(line.indent)}</span>
                          <span className={s.typed}>
                            {line.tokens.map((token, tokenIndex) => (
                              <span
                                key={tokenIndex}
                                className={s[token.kind]}
                                data-token={token.kind === "service" ? line.defines : undefined}
                              >
                                {token.text}
                              </span>
                            ))}
                          </span>
                          <span className={s.caret} />
                        </span>
                      </div>
                    );
                  })}
                  <span className={s.scan} />
                </div>
              </div>
            </div>

            <div className={s.mapPane}>
              <div className={s.mapHead} aria-hidden="true">
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
              <div
                className={s.canvas}
                style={focusVars}
                role="group"
                aria-label="Service map. Choose a service to see what depends on it."
              >
                <span className={s.heat} aria-hidden="true">
                  <span key={exploring ? `visitor-${incidentRun}` : `story-${typingRun}-${jumpRun}`} className={s.shocks}>
                    <span className={s.shock} />
                    <span className={s.shock} />
                  </span>
                </span>
                <div className={s.world}>
                  <Edges layout="wide" mapState={mapState} incident={incident} />
                  <Edges layout="tall" mapState={mapState} incident={incident} />
                  {SERVICES.map((service) => {
                    const role = roleOf(service.id, mapState, incident);
                    const pressed = exploring && manual?.failing === service.id && !manual.healing;
                    return (
                      <div
                        key={service.id}
                        className={s.node}
                        data-service={service.id}
                        data-role={role}
                        data-bystander={isBystander(service.id, incident) ? "true" : "false"}
                        style={
                          {
                            "--wx": service.wide.x,
                            "--wy": service.wide.y,
                            "--tx": service.tall.x,
                            "--ty": service.tall.y,
                            "--order": service.order,
                          } as StyleVars
                        }
                      >
                        <button
                          type="button"
                          className={s.nodeButton}
                          disabled={!mounted || role === "hidden"}
                          aria-pressed={exploring ? pressed : undefined}
                          aria-label={
                            role === "hidden"
                              ? service.id
                              : `${service.id}, ${BADGE_TEXT[role]}. ${pressed ? "Restore it" : "Break it to see what depends on it"}`
                          }
                          onClick={() => breakService(service.id)}
                        >
                          <span className={s.point} />
                          <span className={s.label}>
                            <span className={s.name}>{service.id}</span>
                            <Badge role={role} />
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div ref={flightLayerRef} className={s.flightLayer} aria-hidden="true" />
        </div>
      </div>

      <div className={s.controls}>
        <p className={s.hint}>
          <PointerIcon />
          Tap or click a service to see what depends on it.
        </p>
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
          onClick={toggleMotion}
        >
          {paused || exploring ? <PlayIcon /> : <PauseIcon />}
          {exploring ? "Play story" : paused ? "Play" : "Pause"}
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

function Edges({ layout, mapState, incident }: { layout: "wide" | "tall"; mapState: MapState; incident: Incident | null }) {
  const view = layout === "wide" ? WIDE_VIEW : TALL_VIEW;
  return (
    <svg
      className={`${s.edges} ${layout === "wide" ? s.edgesWide : s.edgesTall}`}
      viewBox={`0 0 ${view.width} ${view.height}`}
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
    >
      {DEPENDENCIES.map((dependency) => (
        <Edge
          key={`${dependency.from}-${dependency.to}`}
          dependency={dependency}
          layout={layout}
          state={edgeState(dependency, mapState, incident)}
        />
      ))}
    </svg>
  );
}

/** One dependency: the line, the bright tip that draws it, and the pulse a failure or recovery sends along it. */
function Edge({ dependency, layout, state }: { dependency: Dependency; layout: "wide" | "tall"; state: EdgeState }) {
  const path = dependencyPath(dependency, layout);
  return (
    <g className={s.edge} data-state={state} style={{ "--edge-order": dependencyOrder(dependency) } as StyleVars}>
      <path className={s.edgeLine} d={path} pathLength={1} />
      <path className={s.edgeTrail} d={path} pathLength={1} />
      <path className={s.edgePulse} d={path} pathLength={1} />
    </g>
  );
}
