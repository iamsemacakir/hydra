/**
 * Landing page theme: Light, Dark, or Auto (follows the visitor's local time).
 *
 * The preference is stored in localStorage and mirrored onto <html> as
 * data-landing-pref (what the visitor chose) and data-landing-theme (what is
 * shown). The CSS tokens that react to data-landing-theme live in globals.css.
 *
 * This file is pure so it can be imported by the server layout and by client code.
 */

export type ThemePreference = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/** In Auto mode the light theme is shown from 07:00 (inclusive) to 19:00 (exclusive), local time. */
export const LIGHT_FROM_HOUR = 7;
export const LIGHT_UNTIL_HOUR = 19;

export const THEME_STORAGE_KEY = "dp-landing-theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "auto" || value === "light" || value === "dark";
}

export function resolveTheme(preference: ThemePreference, now: Date = new Date()): ResolvedTheme {
  if (preference !== "auto") return preference;
  const hour = now.getHours();
  return hour >= LIGHT_FROM_HOUR && hour < LIGHT_UNTIL_HOUR ? "light" : "dark";
}

const pad = (hour: number) => String(hour).padStart(2, "0");

/** Human-readable description of the Auto rule, used in tooltips. */
export const AUTO_THEME_HINT = `Follows your local time: light from ${pad(LIGHT_FROM_HOUR)}:00 to ${pad(LIGHT_UNTIL_HOUR)}:00, dark otherwise`;

/**
 * Inline script for <head>. It runs before the first paint so the page never
 * flashes the wrong theme. Keep it dependency-free and keep its rule identical
 * to resolveTheme above.
 */
export const themeInitScript = `(function(){var d=document.documentElement,p="auto";try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(s==="light"||s==="dark")p=s}catch(e){}var h=new Date().getHours();d.dataset.landingPref=p;d.dataset.landingTheme=p==="auto"?(h>=${LIGHT_FROM_HOUR}&&h<${LIGHT_UNTIL_HOUR}?"light":"dark"):p})();`;
