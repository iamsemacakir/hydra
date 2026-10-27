"use client";

import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import styles from "./motion.module.css";

/**
 * Pauses and resumes every animation on the landing page at once (WCAG 2.2.2).
 * It sets data-motion on the page root; one CSS rule does the rest.
 */
export function MotionToggle() {
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const toggle = () => {
    const root = document.querySelector<HTMLElement>("[data-landing]");
    const next = !paused;
    if (root) root.dataset.motion = next ? "paused" : "running";
    setPaused(next);
  };

  return (
    <button
      type="button"
      className={styles.motionToggle}
      data-ready={ready}
      aria-pressed={paused}
      onClick={toggle}
    >
      <Icon name={paused ? "play" : "pause"} size={14} />
      {paused ? "Play animations" : "Pause animations"}
    </button>
  );
}
