import { ButtonLink } from "../ButtonLink";
import { ROUTES, SECTION_IDS } from "../content";
import { cssVars } from "../cssVars";
import { Icon } from "../Icon";
import lp from "../landing.module.css";
import { HeroScene } from "./HeroScene";
import { MotionToggle } from "./MotionToggle";
import styles from "./motion.module.css";

const WORDS = ["Know", "what", "a", "failure", "reaches."];

/** The first screen: the promise on the left, the 3D stack that shows it on the right. */
export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroBg} aria-hidden="true">
        <span className={styles.blobA} />
        <span className={styles.blobB} />
        <span className={styles.dots} />
      </div>
      <div className={`${lp.wrap} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className={styles.pill}>
            <span className={styles.pillDot} />
            Read-only repository analysis
          </p>
          <h1 id="hero-title" className={styles.heroTitle}>
            {WORDS.map((word, i) => (
              <span key={word}>
                <span className={styles.wordMask}>
                  <span className={word === "failure" ? `${styles.word} ${styles.wordAccent}` : styles.word} style={cssVars({ "--i": i })}>
                    {word}
                    {word === "failure" && (
                      <svg className={styles.underline} viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M3 9C40 3 80 3 110 7S170 12 197 5" />
                      </svg>
                    )}
                  </span>
                </span>
                {i < WORDS.length - 1 ? " " : null}
              </span>
            ))}
          </h1>
          <p className={styles.heroLede}>
            Hydra turns a repository into one live map of its services, what they depend on and how healthy they are. When one
            fails, see which others it could reach.
          </p>
          <div className={styles.heroActions}>
            <ButtonLink href={ROUTES.workspace} arrow>
              Open workspace
            </ButtonLink>
            <ButtonLink href={`#${SECTION_IDS.explorer}`} variant="secondary">
              Explore the demo
            </ButtonLink>
          </div>
          <div className={styles.heroFoot}>
            <p className={styles.heroTrust}>
              <Icon name="shield-check" size={16} />
              Read-only. Your code is never executed.
            </p>
            <MotionToggle />
          </div>
        </div>
        <HeroScene />
      </div>
    </section>
  );
}
