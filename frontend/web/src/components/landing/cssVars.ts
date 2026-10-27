import type { CSSProperties } from "react";

/** Typed helper for passing CSS custom properties through the style prop. */
export function cssVars(vars: Record<`--${string}`, string | number>): CSSProperties {
  return vars as CSSProperties;
}
