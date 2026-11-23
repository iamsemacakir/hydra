import { HEALTH_ORDER, healthLook, type HealthCounts } from "@/lib/status";
import { StatusGlyph } from "./Status";

/** The share of each health state as one bar. The text alternative lists every count. */
export function HealthBar({ counts }: { counts: HealthCounts }) {
  return (
    <div className="health-bar" role="img" aria-label={HEALTH_ORDER.map((h) => `${counts[h]} ${h.toLowerCase()}`).join(", ")}>
      {HEALTH_ORDER.filter((h) => counts[h] > 0).map((h) => (
        <span key={h} data-tone={healthLook(h).tone} style={{ flexGrow: counts[h] }} />
      ))}
    </div>
  );
}

/** Shape, number and word for each health state. `compact` leaves out the states with no components. */
export function HealthLegend({ counts, compact = false }: { counts: HealthCounts; compact?: boolean }) {
  const states = compact ? HEALTH_ORDER.filter((h) => counts[h] > 0) : HEALTH_ORDER;
  return (
    <ul className="health-legend">
      {states.map((h) => {
        const look = healthLook(h);
        return (
          <li key={h} data-tone={look.tone}>
            <StatusGlyph glyph={look.glyph} />
            <strong>{counts[h]}</strong>
            {look.label}
          </li>
        );
      })}
    </ul>
  );
}
