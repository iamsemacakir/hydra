"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import s from "./LiveMap.module.css";
import { useFinePointer, useInView, useMounted, usePageVisible, useReducedMotion } from "./hooks";
import { AffectedIcon, AlertIcon, CheckIcon, FileIcon, PauseIcon, PlayIcon, PointerIcon, RecoverIcon } from "./icons";
import {
  DEPENDENCIES,
  HOP_MS,
  MAP,
  ORIGIN,
  ROLE_TEXT,
  SERVICES,
  announcementOf,
  curvePath,
  linkCurve,
  linkId,
  nextChangeAt,
  previewOf,
  pruneIncidents,
  statusOf,
  toggleIncident,
  viewOf,
  type Incidents,
  type Role,
  type ServiceId,
  type StatusTone,
} from "./mapModel";
import { MapEngine } from "./mapEngine";

/** Inline styles that also carry CSS custom properties. */
type StyleVars = CSSProperties & Record<`--${string}`, string | number>;

/** The demo cursor sets off this long before the burst has fully settled (the services are in place by then). */
const DEMO_LEAD_MS = 380;
/** How long the demo cursor takes to reach a service. */
const GHOST_MS = 600;

type DemoStep = { target: ServiceId; hold: number };

/** What the demo cursor does until a visitor takes over: break something, fix it, then something deeper. */
const DEMO: readonly DemoStep[] = [
  { target: "payments", hold: 3400 },
  { target: "payments", hold: 1700 },
  { target: "stripe", hold: 3900 },
  { target: "stripe", hold: 1700 },
  { target: "rabbitmq", hold: 3700 },
  { target: "rabbitmq", hold: 7000 },
];

/** The still frame for reduced motion: one failure and everything it potentially affects. */
const STILL_FAILURE: ServiceId = "payments";

const STATUS_ICONS: Record<StatusTone, ReactNode> = {
  ok: <CheckIcon />,
  alert: <AlertIcon />,
  preview: <AffectedIcon />,
  recover: <RecoverIcon />,
};

const ROLE_ICONS: Record<Exclude<Role, "ok">, ReactNode> = {
  failed: <AlertIcon />,
  affected: <AffectedIcon />,
  recovered: <RecoverIcon />,
};

const HOME_PATHS = Object.fromEntries(
  DEPENDENCIES.map((dependency) => {
    const from = SERVICES.find((service) => service.id === dependency.from);
    const to = SERVICES.find((service) => service.id === dependency.to);
    return [linkId(dependency), from && to ? curvePath(linkCurve(from, to)) : ""];
  }),
);

type Drag = { id: ServiceId; pointerId: number; x: number; y: number; moved: boolean };

/**
 * How long until the burst on the first paint has finished, in ms (0 once it has, and for reduced motion).
 * Read from the CSS animations themselves, so the demo follows the burst however late the page painted.
 */
function burstRemaining(map: HTMLElement): number {
  let remaining = 0;
  for (const element of map.querySelectorAll<HTMLElement>("[data-intro]")) {
    for (const animation of element.getAnimations()) {
      const end = animation.effect?.getComputedTiming().endTime;
      const current = animation.currentTime;
      if (typeof end === "number" && typeof current === "number") remaining = Math.max(remaining, end - current);
    }
  }
  return remaining;
}

/** Keyframes along a gentle arc, for the demo cursor. */
function ghostFrames(from: { x: number; y: number }, to: { x: number; y: number }): Keyframe[] {
  const control = {
    x: (from.x + to.x) / 2 + (to.y - from.y) * 0.18,
    y: (from.y + to.y) / 2 - Math.abs(to.x - from.x) * 0.16,
  };
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    const u = 1 - t;
    const x = u * u * from.x + 2 * u * t * control.x + t * t * to.x;
    const y = u * u * from.y + 2 * u * t * control.y + t * t * to.y;
    frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`, offset: t });
  }
  return frames;
}

/**
 * The hero: the live map of the demo system, ready to be touched.
 *
 * The map bursts out of compose.yaml on the first paint (CSS, so it moves before JavaScript has loaded). Then
 * requests start to flow and a demo cursor breaks a service: the failure travels to everything that depends on
 * it. Visitors take over at any moment: hover (or focus) a service to preview what it would affect, press it
 * to break it, press it again to fix it, or drag it around. Several services can be broken at once.
 *
 * Pause stops everything that moves by itself. With reduced motion nothing moves by itself: the map shows one
 * failure as a still frame, and pressing a service shows the result at once. Without JavaScript the map is a
 * still picture of the healthy system.
 */
export function LiveMap() {
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const pageVisible = usePageVisible();
  const mounted = useMounted();
  const [mapRef, inView] = useInView<HTMLDivElement>(0.3);
  const ghostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const incidentsRef = useRef<Incidents>({});
  const instantRef = useRef(false);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const demoStep = useRef(0);
  const ghostAt = useRef<{ x: number; y: number } | null>(null);

  const [incidents, setIncidents] = useState<Incidents>({});
  const [now, setNow] = useState(0);
  const [preview, setPreview] = useState<ServiceId | null>(null);
  const [paused, setPaused] = useState(false);
  const [demoOver, setDemoOver] = useState(false);
  const [breaks, setBreaks] = useState<Partial<Record<ServiceId, number>>>({});
  const [announcement, setAnnouncement] = useState("");

  const motion = mounted && !reducedMotion && !paused;
  const view = viewOf(incidents, now);
  // Preview only services that are healthy right now; one that was just fixed shows its recovery instead.
  const previewing = preview !== null && !incidents[preview] ? preview : null;
  const wouldBeAffected = previewing ? new Set(previewOf(previewing, incidents)) : null;
  const status = statusOf(view, previewing, incidents);
  const anyFailing = view.failing.length > 0;
  const anyIncident = Object.keys(incidents).length > 0;

  useEffect(() => {
    incidentsRef.current = incidents;
  }, [incidents]);

  useEffect(() => {
    instantRef.current = reducedMotion;
  }, [reducedMotion]);

  // Fail or fix a service. The demo cursor uses the same path as visitors, without the announcement.
  const toggle = useCallback((id: ServiceId, by: "visitor" | "demo") => {
    const at = performance.now();
    const next = toggleIncident(incidentsRef.current, id, at, instantRef.current);
    incidentsRef.current = next;
    setIncidents(next);
    setNow(at);
    const broke = next[id]?.phase === "failing";
    if (broke) setBreaks((previous) => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }));
    if (by === "visitor") setAnnouncement(announcementOf(id, broke, next));
  }, []);

  const takeOver = useCallback(() => setDemoOver(true), []);

  // The map moves on by itself between hops: wake up exactly when the next hop is due.
  useEffect(() => {
    const next = nextChangeAt(incidents, now);
    if (next === null) return;
    const timer = window.setTimeout(
      () => {
        const at = performance.now();
        setNow(at);
        setIncidents((previous) => pruneIncidents(previous, at));
      },
      Math.max(0, next - performance.now()),
    );
    return () => window.clearTimeout(timer);
  }, [incidents, now]);

  // The engine: springs, flowing requests and pulses, written straight to the DOM.
  useEffect(() => {
    const root = mapRef.current;
    if (!root) return;
    const engine = new MapEngine(root, HOP_MS - 40);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [mapRef]);

  useEffect(() => {
    engineRef.current?.setVisible(inView && pageVisible);
  }, [inView, pageVisible]);

  useEffect(() => {
    engineRef.current?.setPhysics(mounted && !reducedMotion);
  }, [mounted, reducedMotion]);

  // Requests start to flow as the services land.
  useEffect(() => {
    const engine = engineRef.current;
    const map = mapRef.current;
    if (!engine || !map) return;
    if (!motion) {
      engine.setFlow(false);
      return;
    }
    const timer = window.setTimeout(() => engine.setFlow(true), Math.max(0, burstRemaining(map) - 250));
    return () => window.clearTimeout(timer);
  }, [motion, mapRef]);

  // After every render: the engine starts a pulse wherever a failure or a recovery has just set off.
  useEffect(() => {
    engineRef.current?.setEdgeStates(view.edges);
  });

  // Reduced motion: a still frame of one failure and what it potentially affects.
  useEffect(() => {
    if (!mounted || !reducedMotion || Object.keys(incidentsRef.current).length > 0) return;
    toggle(STILL_FAILURE, "demo");
  }, [mounted, reducedMotion, toggle]);

  // The headline's full stop turns red while something is failing.
  useEffect(() => {
    document.documentElement.dataset.hydraIncident = anyFailing ? "true" : "false";
  }, [anyFailing]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset.hydraIncident;
    },
    [],
  );

  // The demo cursor: shows what the map can do within the first two seconds, until a visitor takes over.
  useEffect(() => {
    if (!motion || demoOver || !inView || !pageVisible) return;
    const ghost = ghostRef.current;
    const engine = engineRef.current;
    const map = mapRef.current;
    if (!ghost || !engine || !map) return;
    let cancelled = false;
    let timer = 0;
    let flight: Animation | null = null;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms);
      });

    const run = async () => {
      await wait(Math.max(120, burstRemaining(map) - DEMO_LEAD_MS));
      while (!cancelled) {
        const step = DEMO[demoStep.current % DEMO.length];
        const from = ghostAt.current ?? { x: map.clientWidth * 0.58, y: map.clientHeight * 1.04 };
        const centre = engine.positionOf(step.target);
        // An arrow rests its tip just off the centre, so the service stays visible; a finger covers it.
        const to = ghost.dataset.pointer === "fine" ? { x: centre.x + 5, y: centre.y + 7 } : centre;
        ghost.dataset.state = "shown";
        flight = ghost.animate(ghostFrames(from, to), {
          duration: GHOST_MS,
          easing: "cubic-bezier(0.45, 0, 0.15, 1)",
          fill: "forwards",
        });
        await flight.finished.catch(() => undefined);
        if (cancelled) return;
        ghostAt.current = to;
        ghost.dataset.state = "pressing";
        await wait(130);
        if (cancelled) return;
        toggle(step.target, "demo");
        ghost.dataset.state = "released";
        demoStep.current += 1;
        await wait(step.hold);
      }
    };
    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      flight?.cancel();
      ghost.dataset.state = "hidden";
      ghostAt.current = null;
    };
  }, [motion, demoOver, inView, pageVisible, mapRef, toggle]);

  function reset() {
    takeOver();
    incidentsRef.current = {};
    setIncidents({});
    setNow(performance.now());
    setAnnouncement("All services are OK.");
  }

  function toggleMotion() {
    takeOver();
    setPaused(!paused);
  }

  /* ----- Pointer: hover to preview, press to break or fix, drag to move ----- */

  function onMapPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    takeOver();
    engineRef.current?.setCursor(event.clientX, event.clientY);
  }

  function onMapPointerLeave() {
    engineRef.current?.clearCursor();
  }

  function onServicePointerDown(id: ServiceId, event: PointerEvent<HTMLButtonElement>) {
    takeOver();
    if (event.button !== 0 || reducedMotion) return;
    dragRef.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    engineRef.current?.grabService(id, event.clientX, event.clientY);
  }

  function onServicePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) {
      drag.moved = true;
      setPreview(null);
    }
    if (drag.moved) engineRef.current?.dragTo(event.clientX, event.clientY);
  }

  function onServicePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    engineRef.current?.release();
    if (drag.moved) suppressClick.current = true;
    dragRef.current = null;
  }

  function onServiceClick(id: ServiceId) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    takeOver();
    toggle(id, "visitor");
  }

  function onServiceFocus(id: ServiceId, event: FocusEvent<HTMLButtonElement>) {
    if (event.currentTarget.matches(":focus-visible")) {
      takeOver();
      setPreview(id);
    }
  }

  const hint = anyFailing
    ? `${finePointer ? "Click" : "Tap"} a broken service to fix it.`
    : finePointer
      ? "Click any service to break it. Hover first to see what it would affect."
      : "Tap any service to break it.";

  return (
    <div className={s.live} data-motion={motion ? "on" : "off"}>
      <div className={s.hudBar}>
        <p className={s.meta} aria-hidden="true">
          <span className={s.liveTag}>
            <span className={s.liveDot} />
            Live
          </span>
          <span className={s.source}>
            <FileIcon />
            compose.yaml
          </span>
          <span className={s.counts}>
            {SERVICES.length} services · {DEPENDENCIES.length} dependencies
          </span>
        </p>
        <div className={s.controls}>
          {anyIncident ? (
            <button type="button" className={s.control} onClick={reset} aria-label="Reset: make every service healthy">
              <RecoverIcon />
              <span className={s.controlText}>Reset</span>
            </button>
          ) : null}
          {reducedMotion ? null : (
            <button
              type="button"
              className={s.control}
              onClick={toggleMotion}
              aria-label={paused ? "Play the map's motion" : "Pause the map's motion"}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
              <span className={s.controlText}>{paused ? "Play" : "Pause"}</span>
            </button>
          )}
        </div>
      </div>

      <div
        ref={mapRef}
        className={s.map}
        role="group"
        aria-label="Live map of the demo system"
        aria-describedby="live-map-help"
        onPointerMove={onMapPointerMove}
        onPointerLeave={onMapPointerLeave}
        onPointerDown={takeOver}
        style={{ "--ox": ORIGIN.x, "--oy": ORIGIN.y } as StyleVars}
      >
        <span className={s.grid} aria-hidden="true" />
        <p className={s.status} data-tone={status.tone}>
          <span key={`${status.tone}:${status.text}`} className={s.statusText}>
            {STATUS_ICONS[status.tone]}
            {status.text}
          </span>
          <span key={status.tone} className={s.statusDetail}>
            {status.detail}
          </span>
        </p>
        <svg className={s.links} viewBox={`0 0 ${MAP.width} ${MAP.height}`} aria-hidden="true" focusable="false">
          {DEPENDENCIES.map((dependency) => {
            const key = linkId(dependency);
            const onPreviewPath =
              previewing !== null &&
              wouldBeAffected !== null &&
              wouldBeAffected.has(dependency.from) &&
              (dependency.to === previewing || wouldBeAffected.has(dependency.to));
            return (
              <g key={key} className={s.link} data-link={key} data-state={view.edges[key]} data-preview={onPreviewPath ? "true" : undefined}>
                <path className={s.line} d={HOME_PATHS[key]} data-line="" />
                <circle className={s.particle} data-particle="" r="4" cx="0" cy="0" opacity="0" />
                <circle className={s.particle} data-particle="" r="4" cx="0" cy="0" opacity="0" />
                <circle className={s.pulse} data-pulse="" r="8" cx="0" cy="0" opacity="0" />
              </g>
            );
          })}
        </svg>
        <span className={s.origin} aria-hidden="true">
          <FileIcon />
          compose.yaml
        </span>

        {SERVICES.map((service) => {
          const role = view.roles[service.id];
          // Only what no current failure can reach steps back; the rest waits for the failure to arrive.
          const dim = anyFailing && role === "ok" && !view.reachable.has(service.id);
          return (
            <div
              key={service.id}
              className={s.node}
              data-role={role}
              data-dim={dim ? "true" : undefined}
              data-preview={wouldBeAffected?.has(service.id) ? "affected" : previewing === service.id ? "source" : undefined}
              style={{ "--hx": service.x, "--hy": service.y, "--i": service.order } as StyleVars}
            >
              <div className={s.body} data-body={service.id}>
                <div className={s.intro} data-intro="">
                  <span className={s.heat} aria-hidden="true" />
                  <span key={breaks[service.id] ?? 0} className={s.rings} aria-hidden="true">
                    <span className={s.ring} />
                    <span className={s.ring} />
                  </span>
                  <button
                    type="button"
                    className={s.service}
                    disabled={!mounted}
                    aria-pressed={role === "failed"}
                    aria-label={`${service.id}, ${ROLE_TEXT[role]}. ${role === "failed" ? "Press to fix it." : "Press to break it."}`}
                    onClick={() => onServiceClick(service.id)}
                    onPointerDown={(event) => onServicePointerDown(service.id, event)}
                    onPointerMove={onServicePointerMove}
                    onPointerUp={onServicePointerUp}
                    onPointerCancel={onServicePointerUp}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") setPreview(service.id);
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType === "mouse") setPreview(null);
                    }}
                    onFocus={(event) => onServiceFocus(service.id, event)}
                    onBlur={() => setPreview(null)}
                  >
                    <span className={s.orb} aria-hidden="true" />
                    <span className={s.name}>{service.id}</span>
                    {role === "ok" ? null : (
                      <span key={role} className={s.chip} data-role={role}>
                        {ROLE_ICONS[role]}
                        <span className={s.chipText}>{ROLE_TEXT[role]}</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={ghostRef} className={s.ghost} data-state="hidden" data-pointer={finePointer ? "fine" : "touch"} aria-hidden="true">
          <svg className={s.ghostArrow} viewBox="0 0 24 24" focusable="false">
            <path d="M5 3.5l13.5 7.6-6 1.6-2.6 6.1z" />
          </svg>
          <span className={s.ghostTouch} />
        </div>
      </div>

      <div className={s.foot}>
        <p className={s.hint}>
          <PointerIcon />
          {hint}
        </p>
        <p className={s.legend} aria-hidden="true">
          <span>
            <AlertIcon />
            Unhealthy
          </span>
          <span>
            <AffectedIcon />
            Potentially affected
          </span>
        </p>
      </div>

      <p id="live-map-help" className={s.srOnly}>
        The demo system: web depends on gateway, gateway on orders, orders on payments, orders-db and rabbitmq,
        payments on stripe, and notifier on rabbitmq. Press a service to break it and hear which services are
        potentially affected. Press it again to fix it.
      </p>
      <p className={s.srOnly} aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
