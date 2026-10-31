"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Icon } from "../landing/Icon";
import { StatusGlyph } from "./Status";

/*
 * Success messages: confirm what happened, mark it with a small check that pops in, and offer the next
 * step as a link. They stack in the corner, read out politely by screen readers, and leave on their own
 * after a few seconds (not while the pointer or the keyboard focus is on them).
 */

export type ToastInput = {
  tone?: "success" | "info" | "error";
  title: string;
  text?: string;
  /** The natural next step. */
  action?: { label: string; href: string };
};
type Toast = ToastInput & { id: number };

const ToastContext = createContext<(toast: ToastInput) => void>(() => undefined);

/** Shows a toast. Works on every page under /projects (the provider sits in the app shell). */
export function useToast(): (toast: ToastInput) => void {
  return useContext(ToastContext);
}

const SHOWN_MS = 6000;
let nextId = 1;

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((toast: ToastInput) => {
    const id = nextId++;
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held) return;
    const timer = window.setTimeout(() => dismiss(toast.id), SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [held, toast.id, dismiss]);
  const tone = toast.tone ?? "success";
  return (
    <div className="toast" data-tone={tone} role={tone === "error" ? "alert" : undefined}
      onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <span className="toast-icon" aria-hidden="true"><StatusGlyph glyph={tone === "error" ? "triangle" : tone === "info" ? "dot" : "check"} size={14} /></span>
      <div className="toast-body">
        <p className="toast-title">{toast.title}</p>
        {toast.text && <p className="toast-text">{toast.text}</p>}
        {toast.action && <Link className="toast-action" href={toast.action.href} onClick={() => dismiss(toast.id)}>{toast.action.label}<Icon name="arrow-right" size={14} /></Link>}
      </div>
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(toast.id)}><Icon name="x" size={14} /></button>
    </div>
  );
}
