"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Icon, type IconName } from "./Icon";
import {
  AUTO_THEME_HINT,
  THEME_STORAGE_KEY,
  isThemePreference,
  resolveTheme,
  type ThemePreference,
} from "./theme";
import styles from "./landing.module.css";

/*
 * The DOM is the source of truth: the inline script in the root layout writes
 * data-landing-pref / data-landing-theme on <html> before the first paint, and this
 * module keeps them in sync. React reads the preference through useSyncExternalStore.
 */

const listeners = new Set<() => void>();

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "auto";
  } catch {
    return "auto";
  }
}

function getSnapshot(): ThemePreference {
  const value = document.documentElement.dataset.landingPref;
  return isThemePreference(value) ? value : "auto";
}

const getServerSnapshot = (): ThemePreference => "auto";

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown };

/** Writes the preference and the resolved theme onto <html>. Crossfades when the visible theme changes. */
function applyPreference(preference: ThemePreference, animate: boolean) {
  const root = document.documentElement;
  const theme = resolveTheme(preference);
  const commit = () => {
    root.dataset.landingPref = preference;
    root.dataset.landingTheme = theme;
    listeners.forEach((listener) => listener());
  };
  const doc = document as ViewTransitionDocument;
  const canAnimate =
    animate &&
    root.dataset.landingTheme !== theme &&
    typeof doc.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (canAnimate) doc.startViewTransition?.(commit);
  else commit();
}

function choose(preference: ThemePreference) {
  try {
    if (preference === "auto") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked (private mode, policies). The choice then lasts for this visit only.
  }
  applyPreference(preference, true);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    // Another tab changed the preference.
    if (event.key === THEME_STORAGE_KEY || event.key === null) applyPreference(readStoredPreference(), false);
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string; hint: string; icon: IconName }> = [
  { value: "auto", label: "Auto", hint: AUTO_THEME_HINT, icon: "sun-moon" },
  { value: "light", label: "Light", hint: "Always light", icon: "sun" },
  { value: "dark", label: "Dark", hint: "Always dark", icon: "moon" },
];

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    // In Auto mode the theme follows the clock. Re-check on mount (the page may have been
    // client-navigated to long after the first load), every minute, and when the tab returns.
    const refresh = () => {
      if (getSnapshot() === "auto") applyPreference("auto", true);
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <div className={styles.themeToggle} role="group" aria-label="Color theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.themeOption}
          data-value={option.value}
          aria-pressed={preference === option.value}
          title={`${option.label}. ${option.hint}`}
          onClick={() => choose(option.value)}
        >
          <Icon name={option.icon} size={16} />
          <span className={styles.srOnly}>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
