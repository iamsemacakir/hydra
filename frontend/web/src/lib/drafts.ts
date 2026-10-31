/*
 * Unsaved form input kept in sessionStorage, so it survives an expired session (the sign-in round trip
 * happens in the same tab) and a reload. It stays on this device and is cleared when the form is saved
 * or cancelled. Storage can be blocked (private mode, policies); then drafts simply are not kept.
 */

const PREFIX = "hydra:draft:";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Stored<T> = { savedAt: number; value: T };

export function saveDraft<T>(key: string, value: T): void {
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), value } satisfies Stored<T>));
  } catch {
    // Storage is not available; the draft is not kept.
  }
}

/** The saved draft, or null when there is none, it is older than a day, or `isValid` rejects it. */
export function loadDraft<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored<unknown>>;
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > MAX_AGE_MS || !isValid(parsed.value)) {
      window.sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    window.sessionStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clear.
  }
}

/** A plain object whose listed keys all hold strings (the shape most form drafts have). */
export function hasStringFields<K extends string>(value: unknown, keys: readonly K[]): value is Record<K, string> {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return keys.every((key) => typeof record[key] === "string");
}
