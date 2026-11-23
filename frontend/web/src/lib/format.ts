/* Small, pure formatting helpers shared by the signed-in pages. */

const SHORT = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const FULL = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "22 Sep, 10:05" in the visitor's locale and time zone, or a dash. */
export function formatWhen(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? SHORT.format(date) : "—";
}

/** The full date and time, for tooltips. */
export function formatWhenFull(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? FULL.format(date) : "";
}

/** "SC" for "Sema Cakir", "A" for "admin", "?" for nothing. */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/[\s@._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 1) : words[0].slice(0, 1) + words[words.length - 1].slice(0, 1);
  return letters.toUpperCase();
}

export function formatMetric(value: number | null | undefined, unit: string): string {
  if (value == null) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}${unit}`;
}

/** "1 component", "3 components". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
