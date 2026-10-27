"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cssVars } from "./cssVars";
import styles from "./landing.module.css";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger in milliseconds. */
  delay?: number;
};

/**
 * Fades content in as it scrolls into view. Content is visible in the server HTML, so
 * nothing is hidden without JavaScript. Elements that are already on screen when the page
 * hydrates are left alone, and reduced-motion visitors never see the effect.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    element.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={[styles.reveal, className].filter(Boolean).join(" ")} style={cssVars({ "--reveal-delay": `${delay}ms` })}>
      {children}
    </div>
  );
}
