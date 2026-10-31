import type { ReactNode } from "react";
import { describeError } from "@/lib/errors";
import { Icon } from "../landing/Icon";
import { StatusGlyph } from "./Status";

type NoticeProps = {
  tone?: "error" | "info" | "success";
  title?: string;
  children?: ReactNode;
  /** A way forward, such as a "Try again" button. */
  action?: ReactNode;
  className?: string;
};

/** A message box: an error the visitor should act on (announced at once), or quiet information. */
export function Notice({ tone = "error", title, children, action, className }: NoticeProps) {
  const glyph = tone === "error" ? "triangle" : tone === "success" ? "check" : "dot";
  return (
    <div className={["notice", className].filter(Boolean).join(" ")} data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <StatusGlyph glyph={glyph} />
      <div className="notice-body">
        {title && <p className="notice-title">{title}</p>}
        {children && <div className="notice-text">{children}</div>}
      </div>
      {action && <div className="notice-action">{action}</div>}
    </div>
  );
}

/**
 * An error as people should read it: what went wrong and how to fix it, plus "Try again" when trying
 * again can help. `what` names what failed to load ("the board").
 */
export function ErrorNotice({ error, what, onRetry, className }: { error: unknown; what?: string; onRetry?: () => void; className?: string }) {
  if (!error) return null;
  const { title, hint, retry } = describeError(error, what);
  return (
    <Notice title={title} className={className} action={retry && onRetry ? <button type="button" className="button small" onClick={onRetry}><Icon name="refresh-cw" size={14} />Try again</button> : undefined}>
      {hint}
    </Notice>
  );
}
