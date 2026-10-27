"use client";

import { useEffect, useRef, useState } from "react";
import { cssVars } from "../cssVars";
import { ROUTES, SECTION_IDS } from "../content";
import { analyzeImpact, summarizeImpact, type ServiceId } from "../graph";
import { Icon } from "../Icon";
import { FilmLink } from "./FilmLink";
import { FilmStage, createClock } from "./FilmStage";
import { clamp01 } from "./math";
import { CHAPTERS } from "./model";
import { useReducedMotion } from "./useReducedMotion";
import styles from "./film.module.css";

const TITLE = ["Know", "what", "a", "failure", "reaches."];

/**
 * The first screen: the promise on top, and under it the whole product as a short film that
 * loops. The film is real-time 3D drawn on a canvas; the headline, buttons and captions are
 * ordinary page text, so the message is complete without it.
 */
export function HeroFilm() {
  const reducedMotion = useReducedMotion();
  const [clock] = useState(createClock);
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [poked, setPoked] = useState<ServiceId | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);

  // The chapter buttons and the pause button do nothing without JavaScript, so they appear with it.
  useEffect(() => {
    setHydrated(true);
  }, []);

  const active = CHAPTERS[reducedMotion ? 4 : chapter];

  const onFrame = (u: number) => {
    CHAPTERS.forEach((entry, i) => {
      const fill = fills.current[i];
      if (fill) fill.style.transform = `scaleX(${clamp01((u - entry.from) / (entry.to - entry.from))})`;
    });
  };

  const seek = (index: number) => {
    clock.poke = null;
    clock.u = CHAPTERS[index].from + 0.002;
    setPoked(null);
  };

  const togglePlaying = () => {
    clock.playing = !clock.playing;
    setPlaying(clock.playing);
  };

  const caption = poked
    ? { title: `You broke ${poked}.`, text: summarizeImpact(analyzeImpact(poked)) }
    : { title: active.title, text: active.text };

  return (
    <section className={`${styles.film} ${styles.hero}`} aria-labelledby="hero-title">
      <div className={styles.copy}>
        <h1 id="hero-title" className={styles.title}>
          {TITLE.map((word, i) => (
            <span key={word}>
              <span className={styles.word}>
                <span className={styles.wordIn} style={cssVars({ "--i": i })}>
                  {word}
                </span>
              </span>
              {i < TITLE.length - 1 ? " " : null}
            </span>
          ))}
        </h1>
        <p className={styles.lede}>Import a repository. Get one live map of its services, dependencies and health.</p>
        <div className={styles.actions}>
          <FilmLink href={ROUTES.workspace} arrow>
            Open workspace
          </FilmLink>
          <FilmLink href={`#${SECTION_IDS.explorer}`} variant="secondary">
            Explore the demo
          </FilmLink>
        </div>
        <p className={styles.trust}>
          <Icon name="shield-check" size={16} />
          Read-only analysis. Your code is never executed.
        </p>
      </div>

      <div className={styles.heroStage}>
        <FilmStage
          mode="autoplay"
          clock={clock}
          choreography={0.8}
          interactive
          label="Animated 3D demo: code is read, saved as a map of services, and a failing service shows what it reaches"
          onChapter={setChapter}
          onFrame={onFrame}
          onPoke={setPoked}
        />
        <p className={styles.sampleTag}>Sample data</p>

        <div className={styles.dock}>
          <div className={styles.caption}>
            <div key={`${poked ?? chapter}`} className={styles.captionIn}>
              <p className={styles.captionTitle}>{caption.title}</p>
              <p className={styles.captionText}>{caption.text}</p>
            </div>
          </div>
          <div className={styles.controls} data-hidden={reducedMotion || !hydrated}>
            <nav aria-label="Demo chapters">
              <ol className={styles.steps}>
                {CHAPTERS.map((entry, i) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={styles.step}
                      aria-label={entry.label}
                      aria-current={i === chapter && !poked ? "step" : undefined}
                      data-incident={entry.id === "incident"}
                      onClick={() => seek(i)}
                    >
                      <span className={styles.stepLabel}>{entry.label}</span>
                      <span className={styles.stepTrack}>
                        <span
                          className={styles.stepFill}
                          ref={(element) => {
                            fills.current[i] = element;
                          }}
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <button
              type="button"
              className={styles.pause}
              aria-label={playing ? "Pause the animation" : "Play the animation"}
              onClick={togglePlaying}
            >
              <Icon name={playing ? "pause" : "play"} size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
