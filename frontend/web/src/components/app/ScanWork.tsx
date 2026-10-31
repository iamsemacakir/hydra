"use client";

import { useEffect, useState } from "react";

/**
 * Show the work while a repository scan runs: what it is doing and for how long, counted second by
 * second, instead of a frozen spinner.
 */
export function ScanWork({ startedAt, queued = false }: { startedAt: string; queued?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  return (
    <small className="scan-work" role="status">
      <span className="conn-spinner" aria-hidden="true" />
      {queued ? "Waiting for the background worker" : "Reading configuration files and parsing Docker Compose"} · <span className="mono">{seconds} s</span>
    </small>
  );
}
