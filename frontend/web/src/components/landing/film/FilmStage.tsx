"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { INCIDENT_SERVICE, SERVICE_IDS, type ServiceId } from "../graph";
import { easeOut, seg, type Vec3 } from "./math";
import { FILM_SECONDS, POKE_SECONDS, REST_U, computeTimeline, pokeToIncidentU } from "./model";
import { cameraPath } from "./path";
import { createRenderer, type FilmRenderer, type Quality } from "./render";
import { useReducedMotion } from "./useReducedMotion";
import styles from "./film.module.css";

/** Shared, mutable playback state. The stage reads it every frame; controls around it write to it. */
export type FilmClock = {
  /** Film position, 0..1. */
  u: number;
  playing: boolean;
  /** A service the visitor broke by clicking it. */
  poke: { id: ServiceId; seconds: number } | null;
};

export const createClock = (): FilmClock => ({ u: 0, playing: true, poke: null });

type FilmStageProps = {
  /** "autoplay" advances on its own; "scrub" follows `scrub.current`. */
  mode: "autoplay" | "scrub";
  clock: FilmClock;
  scrub?: { current: number };
  /** 0 keeps the default framing, 1 uses the full camera moves. */
  choreography: number;
  /** Drag to orbit, hover to light up, click a service to break it. */
  interactive: boolean;
  /** Server-rendered still shown until the canvas takes over, and when there is no JavaScript. */
  poster?: ReactNode;
  label: string;
  className?: string;
  onChapter?: (index: number) => void;
  /** Called every frame with the current film position. Must not set React state. */
  onFrame?: (u: number) => void;
  onPoke?: (id: ServiceId | null) => void;
};

/** The film position shown when motion is reduced: the incident, the most telling moment. */
const STILL_U = 0.86;
const HOLD_SECONDS = 0.4;
const MAX_YAW = 0.7;

export function FilmStage({ mode, clock, scrub, choreography, interactive, poster, label, className, onChapter, onFrame, onPoke }: FilmStageProps) {
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sansRef = useRef<HTMLSpanElement>(null);
  const monoRef = useRef<HTMLSpanElement>(null);

  // Callbacks change identity on every render of the parent; keep the latest in refs so the
  // animation loop is created once.
  const callbacks = useRef({ onChapter, onFrame, onPoke });
  useEffect(() => {
    callbacks.current = { onChapter, onFrame, onPoke };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !sansRef.current || !monoRef.current) return;
    const fonts = {
      sans: getComputedStyle(sansRef.current).fontFamily || "system-ui, sans-serif",
      mono: getComputedStyle(monoRef.current).fontFamily || "ui-monospace, monospace",
    };
    const renderer: FilmRenderer | null = createRenderer(canvas, fonts);
    if (!renderer) return;
    const film: FilmRenderer = renderer;

    let width = 1;
    let height = 1;
    let quality: Quality = "full";
    let visible = true;
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let hold = 0;
    let slow = 0;
    let hintShown = false;
    let pokedOnce = false;
    let shownChapter = -1;
    let lastSavedNodes = 0;

    const view = { yaw: 0, pitch: 0 };
    const viewGoal = { yaw: 0, pitch: 0 };
    let lastTouch = -100;
    const pointer = { x: 0, y: 0, active: false };
    let hover: ServiceId | null = null;
    const drag = { active: false, id: -1, x: 0, y: 0, startX: 0, startY: 0, startTime: 0, moved: false };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (width * height * dpr * dpr > 5_000_000) dpr = Math.sqrt(5_000_000 / (width * height));
      film.resize(width, height, dpr);
      quality = width < 700 ? "lite" : "full";
    };

    const nodeFocus = (id: ServiceId): Vec3 => {
      const [x, z] = film.layout().nodes[id];
      return [x, 20, z];
    };

    const render = (dt: number) => {
      time += dt;
      let u = clock.u;
      let incidentU: number | undefined;
      let failing: ServiceId | undefined;

      if (clock.poke) {
        clock.poke.seconds += dt;
        if (clock.poke.seconds >= POKE_SECONDS) {
          clock.poke = null;
          callbacks.current.onPoke?.(null);
        }
      }

      if (reducedMotion) {
        u = STILL_U;
      } else if (clock.poke) {
        u = REST_U;
        incidentU = pokeToIncidentU(clock.poke.seconds);
        failing = clock.poke.id;
      } else if (mode === "autoplay") {
        if (clock.playing) {
          if (u < 1) {
            u = Math.min(1, u + dt / FILM_SECONDS);
            hold = 0;
          } else {
            hold += dt;
            if (hold > HOLD_SECONDS) u = 0;
          }
        }
      } else if (scrub) {
        u += (scrub.current - u) * Math.min(1, dt * 7);
        if (Math.abs(scrub.current - u) < 0.0005) u = scrub.current;
      }
      if (!clock.poke || reducedMotion) clock.u = u;
      else clock.u = REST_U;

      const timeline = computeTimeline({ u, incidentU, failing });
      if (timeline.chapter !== shownChapter) {
        shownChapter = timeline.chapter;
        callbacks.current.onChapter?.(timeline.chapter);
      }
      callbacks.current.onFrame?.(incidentU !== undefined ? Math.max(u, incidentU) : u);

      if (interactive && !hintShown && !pokedOnce && timeline.savedNodes >= SERVICE_IDS.length && lastSavedNodes < SERVICE_IDS.length) {
        hintShown = true;
        setHint(true);
      }
      lastSavedNodes = timeline.savedNodes;

      // Orbit: follows the visitor, then drifts back to a slow idle sway.
      if (!drag.active && time - lastTouch > 3.5) {
        viewGoal.yaw = Math.sin(time * 0.22) * 0.05;
        viewGoal.pitch = Math.sin(time * 0.17 + 1) * 0.015;
      }
      const k = Math.min(1, dt * 5);
      view.yaw += (viewGoal.yaw - view.yaw) * k;
      view.pitch += (viewGoal.pitch - view.pitch) * k;

      const cameraU = incidentU !== undefined ? Math.max(u, incidentU) : u;
      const choreo = cameraPath(cameraU, film.layout(), choreography, nodeFocus(failing ?? INCIDENT_SERVICE));
      const fade = mode === "autoplay" && !reducedMotion ? Math.min(easeOut(seg(u, 0, 0.025)), 1 - seg(u, 0.975, 1)) : 1;

      film.draw({ timeline, time, view, choreography: choreo, pointer, hover, quality, fade });
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;
      render(dt);
      // If frames stay slow, fall back to the lighter drawing for good.
      if (quality === "full") {
        slow = dt > 0.034 ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 90) quality = "lite";
      }
    };

    resize();
    setReady(true);
    render(0);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reducedMotion || !visible) render(0);
    });
    resizeObserver.observe(wrap);

    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        last = performance.now();
      },
      { threshold: 0 },
    );
    intersection.observe(wrap);

    if (!reducedMotion) raf = requestAnimationFrame(tick);

    /* ---------- pointer ---------- */
    const local = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const setCursor = (value: string) => {
      canvas.dataset.cursor = value;
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const p = local(event);
      drag.active = true;
      drag.id = event.pointerId;
      drag.x = drag.startX = p.x;
      drag.y = drag.startY = p.y;
      drag.startTime = performance.now();
      drag.moved = false;
      canvas.setPointerCapture(event.pointerId);
      setCursor("grabbing");
    };
    const onMove = (event: PointerEvent) => {
      const p = local(event);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = event.pointerType === "mouse" || drag.active;
      if (drag.active && event.pointerId === drag.id) {
        if (Math.hypot(p.x - drag.startX, p.y - drag.startY) > 6) drag.moved = true;
        if (drag.moved) {
          viewGoal.yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, viewGoal.yaw + (p.x - drag.x) * 0.0045));
          viewGoal.pitch = Math.max(-0.4, Math.min(0.45, viewGoal.pitch - (p.y - drag.y) * 0.003));
          lastTouch = time;
        }
        drag.x = p.x;
        drag.y = p.y;
      } else if (event.pointerType === "mouse") {
        hover = film.hitTest(p.x, p.y);
        setCursor(hover ? "pointer" : "grab");
      }
    };
    const onUp = (event: PointerEvent) => {
      if (!drag.active || event.pointerId !== drag.id) return;
      drag.active = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      const p = local(event);
      const quick = performance.now() - drag.startTime < 500;
      if (!drag.moved && quick) {
        const id = film.hitTest(p.x, p.y);
        if (id && clock.u >= 0.64 && !clock.poke) {
          clock.poke = { id, seconds: 0 };
          pokedOnce = true;
          setHint(false);
          callbacks.current.onPoke?.(id);
        }
      }
      lastTouch = time;
      setCursor(hover ? "pointer" : "grab");
    };
    const onLeave = () => {
      pointer.active = false;
      hover = null;
      if (!drag.active) setCursor("grab");
    };

    if (interactive && !reducedMotion) {
      setCursor("grab");
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      canvas.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [mode, clock, scrub, choreography, interactive, reducedMotion]);

  return (
    <div
      ref={wrapRef}
      className={[styles.stage, className].filter(Boolean).join(" ")}
      data-ready={ready}
      role="group"
      aria-label={label}
    >
      <div className={styles.poster} aria-hidden="true">
        {poster}
      </div>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <span ref={sansRef} className={styles.probeSans} aria-hidden="true" />
      <span ref={monoRef} className={styles.probeMono} aria-hidden="true" />
      {interactive && !reducedMotion && (
        <p className={styles.hint} data-visible={hint} aria-hidden="true">
          Drag to orbit. Click a service to break it.
        </p>
      )}
    </div>
  );
}
