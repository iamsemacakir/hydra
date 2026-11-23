import type { Health, WorkItemPriority, WorkItemState } from "./api";

/*
 * How a status looks. A status is never shown by color alone: the glyph gives it a shape
 * and the label gives it a word. The tone picks the color token (see docs/design-system.md).
 */

export type Tone = "ok" | "warn" | "bad" | "accent" | "neutral";
export type Glyph = "dot" | "ring" | "triangle" | "triangle-outline" | "cross" | "check" | "octagon";
export type StatusLook = { tone: Tone; glyph: Glyph; label: string };

export function healthLook(health: Health | null | undefined): StatusLook {
  switch (health) {
    case "Healthy":
      return { tone: "ok", glyph: "dot", label: "Healthy" };
    case "Degraded":
      return { tone: "warn", glyph: "triangle", label: "Degraded" };
    case "Unhealthy":
      return { tone: "bad", glyph: "cross", label: "Unhealthy" };
    default:
      return { tone: "neutral", glyph: "ring", label: "Unknown" };
  }
}

/** Impact analysis never predicts a failure; it marks components that may be affected. */
export const POTENTIALLY_AFFECTED: StatusLook = { tone: "bad", glyph: "triangle-outline", label: "Potentially affected" };

export function severityLook(severity: string): StatusLook {
  switch (severity) {
    case "Warning":
      return { tone: "warn", glyph: "triangle", label: "Warning" };
    case "Error":
      return { tone: "bad", glyph: "cross", label: "Error" };
    case "Critical":
      return { tone: "bad", glyph: "octagon", label: "Critical" };
    default:
      return { tone: "accent", glyph: "dot", label: severity || "Info" };
  }
}

export function deploymentLook(status: string): StatusLook {
  switch (status) {
    case "Succeeded":
      return { tone: "ok", glyph: "check", label: "Succeeded" };
    case "Failed":
      return { tone: "bad", glyph: "cross", label: "Failed" };
    case "RolledBack":
      return { tone: "warn", glyph: "triangle-outline", label: "Rolled back" };
    case "Running":
      return { tone: "accent", glyph: "dot", label: "Running" };
    default:
      return { tone: "neutral", glyph: "ring", label: status || "Pending" };
  }
}

export function workStateLook(state: WorkItemState): StatusLook {
  switch (state) {
    case "Active":
      return { tone: "accent", glyph: "dot", label: "Active" };
    case "Resolved":
      return { tone: "ok", glyph: "check", label: "Resolved" };
    case "Closed":
      return { tone: "neutral", glyph: "check", label: "Closed" };
    case "Removed":
      return { tone: "neutral", glyph: "cross", label: "Removed" };
    default:
      return { tone: "neutral", glyph: "ring", label: "New" };
  }
}

export function priorityTone(priority: WorkItemPriority): Tone {
  return priority === "Critical" ? "bad" : priority === "High" ? "warn" : "neutral";
}

export type HealthCounts = Record<Health, number>;

export const HEALTH_ORDER: readonly Health[] = ["Healthy", "Degraded", "Unhealthy", "Unknown"];

export function countHealth(items: ReadonlyArray<{ health: Health }>): HealthCounts {
  const counts: HealthCounts = { Healthy: 0, Degraded: 0, Unhealthy: 0, Unknown: 0 };
  for (const item of items) counts[item.health] += 1;
  return counts;
}

/** One sentence about the recorded health of an environment. It describes records, never predicts. */
export function healthHeadline(counts: HealthCounts): string {
  const total = counts.Healthy + counts.Degraded + counts.Unhealthy + counts.Unknown;
  const attention = counts.Degraded + counts.Unhealthy;
  if (total === 0) return "No components yet.";
  if (attention > 0) return attention === 1 ? "1 component needs attention." : `${attention} components need attention.`;
  if (counts.Unknown === total) return "No health reports yet.";
  if (counts.Unknown > 0) return `${counts.Healthy} of ${total} components report healthy.`;
  return total === 1 ? "The component is healthy." : `All ${total} components are healthy.`;
}
