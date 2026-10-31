/*
 * Form validation messages: the browser checks the constraints written on each field (required,
 * minLength, pattern, type="email", ...), and these functions turn the result into a sentence shown
 * right under that field. Pure, so the wording can be tested and stays the same on every form.
 */

export type ValidityFlags = Pick<ValidityState,
  "valueMissing" | "tooShort" | "tooLong" | "patternMismatch" | "typeMismatch" | "rangeUnderflow" | "rangeOverflow" | "stepMismatch" | "badInput">;

export type FieldConstraints = {
  /** How the field is called in its label ("Project name"). */
  label: string;
  /** "select" asks to choose instead of to fill in. */
  kind?: "text" | "select";
  type?: string;
  minLength?: number;
  maxLength?: number;
  min?: string;
  max?: string;
  step?: string;
  /** What the pattern expects, in words ("Lowercase letters, numbers and hyphens"). */
  patternHint?: string;
};

export function validationMessage(validity: ValidityFlags, field: FieldConstraints): string | null {
  const { label } = field;
  if (validity.valueMissing) return field.kind === "select" ? `Choose ${lowerFirst(label)}.` : `${label} is required.`;
  if (validity.badInput) return `${label} must be a number.`;
  if (validity.typeMismatch) {
    if (field.type === "email") return "Enter an email address, like name@example.com.";
    if (field.type === "url") return "Enter a full address that starts with https://.";
    return `${label} has the wrong format.`;
  }
  if (validity.tooShort) return `${label} needs at least ${field.minLength} characters.`;
  if (validity.tooLong) return `${label} can have at most ${field.maxLength} characters.`;
  if (validity.patternMismatch) return field.patternHint ? `${field.patternHint}.` : `${label} has the wrong format.`;
  if (validity.rangeUnderflow) return `${label} must be ${field.min} or more.`;
  if (validity.rangeOverflow) return `${label} must be ${field.max} or less.`;
  if (validity.stepMismatch) return field.step && field.step !== "1" && field.step !== "any" ? `${label} must be a multiple of ${field.step}.` : `${label} must be a whole number.`;
  return null;
}

/** "Type" becomes "type" inside a sentence; acronyms such as "URL" keep their capitals. */
function lowerFirst(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/**
 * The API's validation errors (ASP.NET problem details, keyed like "Name", "request.Name" or "$.name")
 * matched to the form's field names, case-insensitively. Unmatched messages are returned separately.
 */
export function matchFieldErrors(apiErrors: Record<string, string[]>, fieldNames: string[]): { byField: Record<string, string>; other: string[] } {
  const byKey = new Map(fieldNames.map((name) => [name.toLowerCase(), name]));
  const byField: Record<string, string> = {};
  const other: string[] = [];
  for (const [key, messages] of Object.entries(apiErrors)) {
    const short = key.replace(/^\$\.?/, "").split(".").pop()?.toLowerCase() ?? "";
    const field = byKey.get(short);
    const message = messages.filter(Boolean).join(" ");
    if (!message) continue;
    if (field) byField[field] = message;
    else other.push(message);
  }
  return { byField, other };
}
