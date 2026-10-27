"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SECTION_IDS } from "../content";
import { INCIDENT_SERVICE } from "../graph";
import lp from "../landing.module.css";
import { SectionHeader } from "../SectionHeader";
import { EditorScene, IncidentScene, MapScene, SaveScene } from "./scenes";
import styles from "./motion.module.css";

type Step = { id: string; label: string; title: string; text: string; scene: ReactNode };

const STEPS: readonly Step[] = [
  {
    id: "write",
    label: "Write",
    title: "It starts with a file you already have.",
    text: "Services and their depends_on lines already live in compose.yaml. Hydra reads the file as text. Nothing in your repository is executed.",
    scene: <EditorScene />,
  },
  {
    id: "save",
    label: "Save",
    title: "Review what was found, then save it.",
    text: "The scan lists every service and dependency it found. Apply the list and it is saved to your project, one row at a time.",
    scene: <SaveScene />,
  },
  {
    id: "map",
    label: "Map",
    title: "Each service becomes a point on one map.",
    text: "Lines show what depends on what. Every service carries its own status, so a glance tells you everything is OK.",
    scene: <MapScene />,
  },
  {
    id: "incident",
    label: "Fail",
    title: "When one fails, the red follows the lines.",
    text: `When ${INCIDENT_SERVICE} degrades, the services that depend on it are marked potentially affected, hop by hop. When it recovers, the map turns back to OK.`,
    scene: <IncidentScene />,
  },
];

/**
 * "How it works": four steps on the left, one window on the right that stays in view and plays
 * the scene of the step being read. On narrow screens each step shows its own scene below it.
 */
export function Story() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement>(null);

  // Loops in the window pause while the section is off screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      section.dataset.inview = String(entry.isIntersecting);
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActive(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    stepRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id={SECTION_IDS.film} className={styles.story} aria-labelledby="story-title">
      <div className={lp.wrap}>
        <SectionHeader
          id="story-title"
          eyebrow="How it works"
          title="From a file to a live map, in four moves."
          lede="Scroll through the steps. The window plays each one with a sample system."
        />
        <div className={styles.storyGrid}>
          <ol className={styles.storySteps}>
            {STEPS.map((step, i) => (
              <li
                key={step.id}
                ref={(element) => {
                  stepRefs.current[i] = element;
                }}
                data-index={i}
                data-active={i === active}
                className={styles.storyStep}
              >
                <span className={styles.storyNumber}>{String(i + 1).padStart(2, "0")}</span>
                <h3 className={styles.storyTitle}>{step.title}</h3>
                <p className={styles.storyText}>{step.text}</p>
                <div className={styles.storyInline} aria-hidden="true">
                  <div className={`${styles.window} ${styles.sceneHost}`} data-active={i === active}>
                    {step.scene}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className={styles.storySticky} aria-hidden="true">
            <div className={styles.window}>
              <div className={styles.windowBar}>
                <span className={styles.windowDots}>
                  <i />
                  <i />
                  <i />
                </span>
                <ol className={styles.windowTabs}>
                  {STEPS.map((step, i) => (
                    <li key={step.id} data-active={i === active} data-done={i < active}>
                      {step.label}
                    </li>
                  ))}
                </ol>
              </div>
              <div className={styles.windowBody}>
                {STEPS.map((step, i) => (
                  <div key={step.id} className={`${styles.scene} ${styles.sceneHost}`} data-active={i === active}>
                    {step.scene}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
