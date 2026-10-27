"use client";

import { useEffect, useRef, type ReactNode } from "react";

type InViewProps = {
  children: ReactNode;
  className?: string;
  /** Keep playing after the first time it is seen (loops), or only start once (one-off entrances). */
  once?: boolean;
  as?: "div" | "section" | "li";
};

/**
 * Marks its box with data-inview="true" while it is on screen. The CSS uses it to start
 * entrance animations and to pause loops that are scrolled away, so nothing animates unseen.
 * Without JavaScript the attribute is never set to "false", so every animation simply runs.
 */
export function InView({ children, className, once = false, as: Tag = "div" }: InViewProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    element.dataset.inview = "false";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.inview = "true";
          if (once) observer.disconnect();
        } else if (!once) {
          element.dataset.inview = "false";
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={className}
    >
      {children}
    </Tag>
  );
}
