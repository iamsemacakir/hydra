"use client";

import { useCallback, useId, useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { ApiError } from "@/lib/api";
import { matchFieldErrors, validationMessage, type FieldConstraints } from "@/lib/validation";
import { StatusGlyph } from "./Status";

/*
 * Form validation that flags a mistake right where it happens.
 * - The browser checks the constraints written on each field (required, minLength, pattern, type="email").
 *   Forms set noValidate, so instead of the browser's bubble the message appears under the field.
 * - Leaving a field shows its mistake at once; an empty required field is only flagged after a first
 *   submit, so tabbing through a fresh form does not turn it red.
 * - The message disappears as soon as the field is fixed.
 * - On submit, the first wrong field gets the focus, and its message is read out with it.
 * - Validation errors from the API are shown on the matching fields too, and so is a conflict
 *   ("Environment name already exists.") on the field it is about.
 */

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isField(target: EventTarget | null): target is Field {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

/** The field's name as people read it: aria-label, data-label, or the text of the label around it. */
function fieldLabel(field: Field): string {
  const own = field.getAttribute("aria-label") ?? field.dataset.label;
  if (own) return own;
  const label = field.closest("label");
  const text = label ? Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())?.textContent?.trim() : null;
  return text || "This field";
}

function constraintsOf(field: Field): FieldConstraints {
  const input = field instanceof HTMLInputElement ? field : null;
  const textual = input ?? (field instanceof HTMLTextAreaElement ? field : null);
  return {
    label: fieldLabel(field),
    kind: field instanceof HTMLSelectElement ? "select" : "text",
    type: input?.type,
    minLength: textual?.minLength,
    maxLength: textual?.maxLength,
    min: input?.min || undefined,
    max: input?.max || undefined,
    step: input?.step || undefined,
    patternHint: field.dataset.patternHint,
  };
}

function messageFor(field: Field): string | null {
  return field.validity.valid ? null : validationMessage(field.validity, constraintsOf(field));
}

export type FormErrors = ReturnType<typeof useFormErrors>;

export function useFormErrors() {
  const prefix = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitted = useRef(false);
  const lastForm = useRef<HTMLFormElement | null>(null);

  /**
   * Shows the messages at once (flushSync), then moves the focus to the field, so it is announced
   * together with its message.
   */
  const show = useCallback((update: (current: Record<string, string>) => Record<string, string>, focusName?: string) => {
    flushSync(() => setErrors(update));
    if (!focusName) return;
    const field = lastForm.current?.elements.namedItem(focusName);
    if (field instanceof HTMLElement) field.focus();
  }, []);

  const clear = useCallback((name: string) => setErrors((current) => {
    if (!(name in current)) return current;
    const next = { ...current };
    delete next[name];
    return next;
  }), []);

  const validate = useCallback((form: HTMLFormElement): boolean => {
    const next: Record<string, string> = {};
    let first: Field | null = null;
    for (const element of Array.from(form.elements)) {
      if (!isField(element) || !element.name || element.disabled) continue;
      const message = messageFor(element);
      if (message) {
        next[element.name] = message;
        first ??= element;
      }
    }
    submitted.current = true;
    lastForm.current = form;
    flushSync(() => setErrors(next));
    first?.focus();
    return first === null;
  }, []);

  return {
    errors,
    /** Wraps a submit handler: the form is checked first, and the handler only runs when it is valid. */
    onSubmit: (handler: (event: FormEvent<HTMLFormElement>) => unknown) => (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (validate(event.currentTarget)) void handler(event);
    },
    onBlur: (event: FocusEvent<HTMLFormElement>) => {
      const field = event.target;
      if (!isField(field) || !field.name) return;
      const message = messageFor(field);
      if (!message) clear(field.name);
      else if (!field.validity.valueMissing || submitted.current) setErrors((current) => ({ ...current, [field.name]: message }));
    },
    onChange: (event: ChangeEvent<HTMLFormElement>) => {
      const field = event.target;
      if (isField(field) && field.name && field.validity.valid) clear(field.name);
    },
    /**
     * Puts the API's validation errors on the matching fields, and a conflict on `conflictField`.
     * Returns true when every message found its field; otherwise the caller shows the error as a
     * whole (ErrorNotice) as well.
     */
    handleApiError: (error: unknown, fieldNames: string[], conflictField?: string): boolean => {
      if (!(error instanceof ApiError)) return false;
      if (conflictField && error.kind === "conflict") {
        show((current) => ({ ...current, [conflictField]: error.message }), conflictField);
        return true;
      }
      if (Object.keys(error.fieldErrors).length === 0) return false;
      const { byField, other } = matchFieldErrors(error.fieldErrors, fieldNames);
      show((current) => ({ ...current, ...byField }), Object.keys(byField)[0]);
      return other.length === 0 && Object.keys(byField).length > 0;
    },
    /** Flags a mistake the browser cannot see (such as a component depending on itself), and focuses that field. */
    flag: (name: string, message: string) => show((current) => ({ ...current, [name]: message }), name),
    /** Props for a field: its name, and aria-invalid / aria-describedby when it has a message. */
    field: (name: string) => ({
      name,
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? `${prefix}-${name}` : undefined,
    }),
    errorId: (name: string) => `${prefix}-${name}`,
    reset: () => { submitted.current = false; setErrors({}); },
  };
}

/** The message under a field, if it has one. */
export function FieldError({ form, name }: { form: FormErrors; name: string }) {
  const message = form.errors[name];
  if (!message) return null;
  return <span className="field-error" id={form.errorId(name)}><StatusGlyph glyph="triangle" size={11} />{message}</span>;
}
