"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

/** True while at least `threshold` of the element is on screen, so loops only run when someone can see them. */
export function useInView<T extends Element>(threshold = 0.2): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function mediaQueryStore(query: string) {
  return {
    subscribe(onChange: () => void) {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    snapshot: () => window.matchMedia(query).matches,
  };
}

const reducedMotion = mediaQueryStore("(prefers-reduced-motion: reduce)");
const finePointer = mediaQueryStore("(hover: hover) and (pointer: fine)");

export function useReducedMotion(): boolean {
  return useSyncExternalStore(reducedMotion.subscribe, reducedMotion.snapshot, () => false);
}

/** A mouse or trackpad: the only case where the stage follows the pointer. */
export function useFinePointer(): boolean {
  return useSyncExternalStore(finePointer.subscribe, finePointer.snapshot, () => false);
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** False while the tab is in the background. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribeToVisibility, () => document.visibilityState === "visible", () => true);
}

/** False during the server render and the first client render, true after hydration. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
