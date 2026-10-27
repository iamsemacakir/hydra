import { ButtonLink } from "./ButtonLink";
import { ROUTES, SECTION_IDS } from "./content";
import { HeroStage } from "./HeroStage";
import { Icon } from "./Icon";
import styles from "./landing.module.css";

/**
 * Four text elements only: the promise, one supporting sentence, the two actions, and the
 * reassurance that matters to a security-minded visitor. The animated stage does the explaining.
 */
export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`${styles.wrap} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <h1 id="hero-title" className={styles.heroTitle}>
            Know what a failure reaches.
          </h1>
          <p className={styles.heroLede}>Import a repository. Get one live map of its services, dependencies and health.</p>
          <div className={styles.heroActions}>
            <ButtonLink href={ROUTES.workspace} arrow>
              Open workspace
            </ButtonLink>
            <ButtonLink href={`#${SECTION_IDS.explorer}`} variant="secondary">
              Explore the demo
            </ButtonLink>
          </div>
          <p className={styles.heroTrust}>
            <Icon name="shield-check" size={16} />
            Read-only analysis. Your code is never executed.
          </p>
        </div>
        <div className={styles.heroStage}>
          <HeroStage />
        </div>
      </div>
    </section>
  );
}
