"use client";

import { useEffect, useState, type ComponentType, type MouseEvent, type SVGProps } from "react";
import s from "./Landing.module.css";
import { AutoIcon, MoonIcon, SunIcon } from "./icons";
import { readStoredMode, resolveTheme, THEME_STORAGE_KEY, type ThemeMode } from "./theme";

const MODE_EVENT = "hydra-theme-mode";

const OPTIONS: { mode: ThemeMode; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { mode: "auto", label: "Automatic: light by day, dark at night", Icon: AutoIcon },
  { mode: "light", label: "Light", Icon: SunIcon },
  { mode: "dark", label: "Dark", Icon: MoonIcon },
];

/** Applies a theme to <html>. With `origin`, the new theme grows as a circle from that point. */
function applyTheme(mode: ThemeMode, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  const theme = resolveTheme(mode);
  root.dataset.themeMode = mode;
  if (root.dataset.theme === theme) return;
  const swap = () => {
    root.dataset.theme = theme;
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!origin || reduceMotion || typeof document.startViewTransition !== "function") {
    swap();
    return;
  }
  const radius = Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y));
  const transition = document.startViewTransition(swap);
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 560, easing: "cubic-bezier(0.23, 1, 0.32, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {
      /* The swap already happened; only the reveal was skipped. */
    });
}

/** Auto, light or dark. Auto follows the time of day and re-checks every minute. */
export function ThemeSwitch() {
  // Unknown until mounted: the stored choice only exists in the browser.
  const [mode, setMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    setMode(readStoredMode());
    // Keeps every switch on the page in step if more than one is rendered.
    const sync = (event: Event) => setMode((event as CustomEvent<ThemeMode>).detail);
    window.addEventListener(MODE_EVENT, sync);
    return () => window.removeEventListener(MODE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (mode !== "auto") return;
    const follow = () => applyTheme("auto");
    follow();
    const timer = window.setInterval(follow, 60_000);
    document.addEventListener("visibilitychange", follow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", follow);
    };
  }, [mode]);

  function choose(next: ThemeMode, event: MouseEvent<HTMLButtonElement>) {
    window.dispatchEvent(new CustomEvent<ThemeMode>(MODE_EVENT, { detail: next }));
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Storage can be blocked; the choice then lasts for this visit only. */
    }
    const box = event.currentTarget.getBoundingClientRect();
    const fromPointer = event.detail > 0;
    applyTheme(next, fromPointer ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : undefined);
  }

  return (
    <div className={s.themeSwitch} role="group" aria-label="Colour theme">
      <span className={s.themeThumb} aria-hidden="true" />
      {OPTIONS.map(({ mode: option, label, Icon }) => (
        <button
          key={option}
          type="button"
          className={s.themeOption}
          data-mode={option}
          aria-pressed={mode === option}
          aria-label={label}
          title={label}
          onClick={(event) => choose(option, event)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
