/**
 * Black-and-white theme for the landing page.
 *
 * "auto" follows the daylight outside: light between sunrise and sunset, dark at night.
 * A visitor can pin "light" or "dark"; the choice is kept in localStorage.
 */
export type ThemeMode = "auto" | "light" | "dark";
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "hydra-theme";

/**
 * Rough daylight check for mid-latitudes (about 43°N, Sofia).
 * Day length swings from about 8.7 h in December to 15.3 h in June and is centred on
 * local solar noon (about 12:15, one hour later while summer time is in effect).
 * It stays self-contained because it is also inlined into the pre-paint script below.
 */
export function isDaylight(date: Date): boolean {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const dayLength = 12 + 3.3 * Math.cos((2 * Math.PI * (dayOfYear - 172)) / 365);
  const januaryOffset = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const julyOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  const summerTime = date.getTimezoneOffset() < Math.max(januaryOffset, julyOffset) ? 1 : 0;
  const solarNoon = 12.25 + summerTime;
  const hour = date.getHours() + date.getMinutes() / 60;
  return Math.abs(hour - solarNoon) < dayLength / 2;
}

export function resolveTheme(mode: ThemeMode, now: Date = new Date()): Theme {
  if (mode === "light" || mode === "dark") return mode;
  return isDaylight(now) ? "light" : "dark";
}

export function readStoredMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "auto";
  } catch {
    return "auto";
  }
}

/** Runs in <head> before the first paint, so the page never flashes the wrong theme. */
export const themeInitScript = `(function(){var m="auto";try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(s==="light"||s==="dark")m=s}catch(e){}try{var isDaylight=${isDaylight.toString()};var t=m==="auto"?(isDaylight(new Date())?"light":"dark"):m;var r=document.documentElement;r.setAttribute("data-theme",t);r.setAttribute("data-theme-mode",m)}catch(e){}})();`;
