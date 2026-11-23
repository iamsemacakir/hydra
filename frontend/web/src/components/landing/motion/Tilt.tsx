"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import styles from "./motion.module.css";

type TiltProps = { children: ReactNode; className?: string; max?: number };

/**
 * Leans its content a few degrees towards the pointer, for a light sense of depth.
 * Only fine pointers (a mouse) tilt it; touch and reduced motion leave it flat.
 */
export function Tilt({ children, className, max = 6 }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element || event.pointerType !== "mouse") return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.setProperty("--tilt-x", `${(-y * max).toFixed(2)}deg`);
    element.style.setProperty("--tilt-y", `${(x * max).toFixed(2)}deg`);
    element.style.setProperty("--glare-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    element.style.setProperty("--glare-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  const onLeave = () => {
    const element = ref.current;
    if (!element) return;
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div ref={ref} className={[styles.tilt, className].filter(Boolean).join(" ")} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}
