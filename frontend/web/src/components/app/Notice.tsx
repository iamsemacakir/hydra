import type { ReactNode } from "react";
import { StatusGlyph } from "./Status";

type NoticeProps = { tone?: "error" | "info" | "success"; title?: string; children?: ReactNode; className?: string };

/** A message box: an error the visitor should act on (announced at once), or quiet information. */
export function Notice({ tone = "error", title, children, className }: NoticeProps) {
  const glyph = tone === "error" ? "triangle" : tone === "success" ? "check" : "dot";
  return (
    <div className={["notice", className].filter(Boolean).join(" ")} data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <StatusGlyph glyph={glyph} />
      <div className="notice-body">
        {title && <p className="notice-title">{title}</p>}
        {children && <div className="notice-text">{children}</div>}
      </div>
    </div>
  );
}
