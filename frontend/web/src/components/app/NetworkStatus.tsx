"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { idleActivity, requestActivity, subscribeRequests } from "@/lib/api";
import { StatusGlyph } from "./Status";

/*
 * How the app tells you about the network, in one place for every page:
 * - a thin loading bar at the top that crawls while the API works and sprints to the end when it is done
 *   (the end of a wait is what people remember, so the speed is saved for the end);
 * - "You're offline" while there is no connection, and "Back online" with a refresh when it returns;
 * - "Still loading…" with a running count of seconds when the API takes longer than usual, so the wait
 *   shows progress instead of a frozen screen.
 */

/** Below this, a wait is not worth announcing; above it, the loading bar shows. */
const BAR_DELAY_MS = 150;
/** From this long, the wait counts as slow and the notice shows the seconds. */
const SLOW_AFTER_MS = 3000;

function subscribeOnline(listener: () => void): () => void {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

function useRequests() {
  return useSyncExternalStore(subscribeRequests, requestActivity, () => idleActivity);
}

export function LoadingBar() {
  const { count } = useRequests();
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  useEffect(() => {
    if (count > 0 && phase !== "running") {
      const timer = window.setTimeout(() => setPhase("running"), BAR_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
    if (count === 0 && phase === "running") setPhase("done");
    if (count === 0 && phase === "done") {
      const timer = window.setTimeout(() => setPhase("idle"), 520);
      return () => window.clearTimeout(timer);
    }
  }, [count, phase]);
  return <div className="loading-bar" data-phase={phase} aria-hidden="true"><span /></div>;
}

export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const { since } = useRequests();
  const [now, setNow] = useState(0);
  const [backOnline, setBackOnline] = useState(false);
  const previous = useRef(online);

  useEffect(() => {
    const wasOnline = previous.current;
    previous.current = online;
    if (!online) setBackOnline(false);
    else if (!wasOnline) setBackOnline(true);
  }, [online]);

  useEffect(() => {
    if (!backOnline) return;
    const timer = window.setTimeout(() => setBackOnline(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [backOnline]);

  useEffect(() => {
    if (since === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [since]);

  if (!online) {
    return <div className="conn-status" data-tone="warn" role="status">
      <StatusGlyph glyph="triangle" />
      <span><strong>You're offline.</strong> You're looking at the last data Hydra loaded. Reconnect to load new data and save changes.</span>
    </div>;
  }
  if (backOnline) {
    return <div className="conn-status" data-tone="ok" role="status">
      <StatusGlyph glyph="check" />
      <span><strong>Back online.</strong></span>
      <button type="button" className="conn-action" onClick={() => window.location.reload()}>Refresh</button>
    </div>;
  }
  const waited = since !== null && now > 0 ? now - since : 0;
  if (waited >= SLOW_AFTER_MS) {
    return <div className="conn-status" data-tone="neutral" role="status">
      <span className="conn-spinner" aria-hidden="true" />
      <span><strong>Still loading…</strong> The server is taking longer than usual · <span className="mono">{Math.floor(waited / 1000)} s</span></span>
    </div>;
  }
  return null;
}
