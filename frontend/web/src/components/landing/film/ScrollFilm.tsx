"use client";

import { useEffect, useRef, useState } from "react";
import { SECTION_IDS } from "../content";
import { FilmStage, createClock } from "./FilmStage";
import { clamp01, seg } from "./math";
import { CHAPTERS } from "./model";
import { useReducedMotion } from "./useReducedMotion";
import styles from "./film.module.css";

const LABEL = "Animated 3D demo: scroll to play the story from code to incident to recovery";

/**
 * The same story again, but the scrollbar is the playhead. A tall section pins the scene to the
 * screen; how far the visitor has scrolled through it decides the film position. Scrolling back
 * rewinds. With reduced motion the pin is replaced by a still frame and the six chapters as a list.
 */
export function ScrollFilm() {
  const reducedMotion = useReducedMotion();
  const [clock] = useState(createClock);
  const [chapter, setChapter] = useState(0);
  const [scrub] = useState(() => ({ current: 0 }));
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, rect.height - pin.offsetHeight);
      scrub.current = clamp01(-rect.top / travel);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const onFrame = (u: number) => {
    if (barRef.current) barRef.current.style.transform = `scaleX(${u})`;
    if (introRef.current) introRef.current.style.opacity = String(1 - seg(u, 0.06, 0.14));
    if (hintRef.current) hintRef.current.style.opacity = String(1 - seg(u, 0.005, 0.03));
  };

  if (reducedMotion) {
    return (
      <section id={SECTION_IDS.film} className={`${styles.film} ${styles.still}`} aria-labelledby="film-title">
        <div className={styles.stillIntro}>
          <p className={styles.eyebrow}>How it works</p>
          <h2 id="film-title" className={styles.scrollTitle}>
            From a file to a map, in six steps.
          </h2>
        </div>
        <div className={styles.stillStage}>
          <FilmStage mode="scrub" clock={clock} scrub={scrub} choreography={0.9} interactive={false} label={LABEL} />
        </div>
        <ol className={styles.stillList}>
          {CHAPTERS.map((entry, i) => (
            <li key={entry.id} className={styles.stillItem}>
              <p className={styles.chapterNo}>{String(i + 1).padStart(2, "0")}</p>
              <h3 className={styles.captionTitle}>{entry.title}</h3>
              <p className={styles.captionText}>{entry.text}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const active = CHAPTERS[chapter];

  return (
    <section id={SECTION_IDS.film} ref={sectionRef} className={`${styles.film} ${styles.scroll}`} aria-labelledby="film-title">
      <div ref={pinRef} className={styles.pin}>
        <div className={styles.pinStage}>
          <FilmStage
            mode="scrub"
            clock={clock}
            scrub={scrub}
            choreography={0.95}
            interactive
            className={styles.scrollStage}
            label={LABEL}
            onChapter={setChapter}
            onFrame={onFrame}
          />
        </div>

        <div ref={introRef} className={styles.scrollIntro}>
          <p className={styles.eyebrow}>How it works</p>
          <h2 id="film-title" className={styles.scrollTitle}>
            From a file to a map, in six steps.
          </h2>
        </div>

        <ol className={styles.rail} aria-hidden="true">
          {CHAPTERS.map((entry, i) => (
            <li
              key={entry.id}
              className={styles.railItem}
              aria-current={i === chapter ? "step" : undefined}
              data-incident={entry.id === "incident"}
              data-recover={entry.id === "recover"}
            >
              {entry.label}
              <span className={styles.railDot} />
            </li>
          ))}
        </ol>

        <div className={styles.scrollCaption} data-chapter={active.id}>
          <div key={active.id} className={styles.captionIn}>
            <p className={styles.chapterNo}>
              {String(chapter + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")} · {active.label}
            </p>
            <h3 className={styles.scrollCaptionTitle}>{active.title}</h3>
            <p className={styles.captionText}>{active.text}</p>
          </div>
        </div>

        <p ref={hintRef} className={styles.scrollHint}>
          Scroll to play
        </p>
        <div className={styles.scrollBar} aria-hidden="true">
          <span ref={barRef} className={styles.scrollBarFill} />
        </div>
      </div>
    </section>
  );
}
