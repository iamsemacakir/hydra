import { ButtonLink } from "./ButtonLink";
import { ROUTES } from "./content";
import { Reveal } from "./Reveal";
import styles from "./landing.module.css";

/** The closing call to action. The panel uses the inverse colors so it reads as the end of the page. */
export function FinalCta() {
  return (
    <section className={styles.cta} aria-labelledby="cta-title">
      <div className={styles.wrap}>
        <Reveal>
          <div className={styles.ctaPanel}>
            <span className={styles.ctaGrid} aria-hidden="true" />
            <h2 id="cta-title" className={styles.ctaTitle}>
              Open the workspace and map your first repository.
            </h2>
            <div className={styles.ctaActions}>
              <ButtonLink href={ROUTES.workspace} arrow>
                Open workspace
              </ButtonLink>
              <ButtonLink href={ROUTES.importRepository} variant="secondary">
                Import a repository
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
