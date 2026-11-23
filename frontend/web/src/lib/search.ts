/*
 * "Did you mean …?" for searches that find nothing: the closest name among the candidates, when it is
 * close enough to be a likely typo. Pure, no React.
 */

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function pairs(text: string): string[] {
  const compact = normalize(text).replace(/ /g, "");
  const result: string[] = [];
  for (let i = 0; i < compact.length - 1; i++) result.push(compact.slice(i, i + 2));
  return result;
}

/** Similarity of two strings from 0 to 1 (the Dice coefficient of their letter pairs). */
export function similarity(a: string, b: string): number {
  const left = pairs(a);
  const right = pairs(b);
  if (left.length === 0 || right.length === 0) return normalize(a) === normalize(b) && normalize(a) !== "" ? 1 : 0;
  const counts = new Map<string, number>();
  for (const pair of left) counts.set(pair, (counts.get(pair) ?? 0) + 1);
  let shared = 0;
  for (const pair of right) {
    const count = counts.get(pair) ?? 0;
    if (count > 0) {
      shared += 1;
      counts.set(pair, count - 1);
    }
  }
  return (2 * shared) / (left.length + right.length);
}

/**
 * The candidate that best matches the query, compared with the whole name and with each of its words
 * (so "paymnt" finds "Payment Service"). Null when nothing is close enough.
 */
export function closestMatch(query: string, candidates: readonly string[], threshold = 0.4): string | null {
  const q = normalize(query);
  if (q.length < 2) return null;
  let best: { name: string; score: number } | null = null;
  for (const name of candidates) {
    const words = normalize(name).split(" ");
    const score = Math.max(similarity(q, name), ...words.map((word) => similarity(q, word)));
    if (!best || score > best.score) best = { name, score };
  }
  return best && best.score >= threshold ? best.name : null;
}
