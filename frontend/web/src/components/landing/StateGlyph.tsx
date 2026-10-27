import styles from "./landing.module.css";

/**
 * Status is always paired with a shape and a text label, never color alone:
 * hollow circle = unknown, filled circle = healthy, filled triangle = degraded,
 * cross = unhealthy, hollow triangle = potentially affected.
 */
export type GlyphKind = "unknown" | "healthy" | "degraded" | "unhealthy" | "affected";

export function StateGlyph({ kind }: { kind: GlyphKind }) {
  return (
    <svg className={styles.stateGlyph} data-kind={kind} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      {kind === "unknown" && <circle cx="6" cy="6" r="4.25" />}
      {kind === "healthy" && <circle cx="6" cy="6" r="4" />}
      {(kind === "degraded" || kind === "affected") && <path d="M6 1.5 10.8 10.2H1.2Z" />}
      {kind === "unhealthy" && <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />}
    </svg>
  );
}
