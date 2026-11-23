import type { Health } from "@/lib/api";
import { deploymentLook, healthLook, severityLook, type Glyph, type StatusLook } from "@/lib/status";

/*
 * Status in the signed-in app: a glyph for the shape, a word for the meaning, a tone for the color.
 * The colors come from app.css ([data-tone] rules), so these components hold no styling decisions.
 */

export function StatusGlyph({ glyph, size = 12 }: { glyph: Glyph; size?: number }) {
  return (
    <svg className="glyph" data-glyph={glyph} width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      {glyph === "dot" && <circle cx="6" cy="6" r="4" />}
      {glyph === "ring" && <circle cx="6" cy="6" r="4.1" />}
      {(glyph === "triangle" || glyph === "triangle-outline") && <path d="M6 1.4 10.9 10.3H1.1Z" />}
      {glyph === "cross" && <path d="M2.6 2.6l6.8 6.8M9.4 2.6l-6.8 6.8" />}
      {glyph === "check" && <path d="M2.2 6.4 4.9 9 9.8 3.2" />}
      {glyph === "octagon" && <path d="M4 1h4l3 3v4l-3 3H4L1 8V4Z" />}
    </svg>
  );
}

type PillProps = { look: StatusLook; label?: string; size?: "sm" | "md"; className?: string; title?: string };

/** A status as a small pill: glyph and word on a soft tint of the tone. */
export function StatusPill({ look, label, size = "md", className, title }: PillProps) {
  return (
    <span className={["status-pill", className].filter(Boolean).join(" ")} data-tone={look.tone} data-size={size} title={title}>
      <StatusGlyph glyph={look.glyph} size={size === "sm" ? 10 : 12} />
      {label ?? look.label}
    </span>
  );
}

/** A status as plain text: glyph and word in the tone's color, without a pill. */
export function StatusText({ look, label }: { look: StatusLook; label?: string }) {
  return (
    <span className="status-text" data-tone={look.tone}>
      <StatusGlyph glyph={look.glyph} />
      {label ?? look.label}
    </span>
  );
}

export function HealthPill({ health, size }: { health: Health | null | undefined; size?: "sm" | "md" }) {
  return <StatusPill look={healthLook(health)} size={size} />;
}

export function SeverityPill({ severity }: { severity: string }) {
  return <StatusPill look={severityLook(severity)} />;
}

export function DeploymentPill({ status }: { status: string }) {
  return <StatusPill look={deploymentLook(status)} />;
}
