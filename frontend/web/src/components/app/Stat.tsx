import type { Tone } from "@/lib/status";
import { Icon, type IconName } from "../landing/Icon";

/** One number with its label, as a small tile. A tone tints the icon when the number needs attention. */
export function Stat({ icon, value, label, tone }: { icon: IconName; value: number | string; label: string; tone?: Tone }) {
  return (
    <div className="stat" data-tone={tone}>
      <span className="stat-icon" aria-hidden="true"><Icon name={icon} size={16} /></span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
