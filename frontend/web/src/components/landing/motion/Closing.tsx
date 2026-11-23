import { ButtonLink } from "../ButtonLink";
import { ROUTES } from "../content";
import lp from "../landing.module.css";
import { InView } from "./InView";
import { Orbit } from "./Orbit";
import styles from "./motion.module.css";

/** The closing call to action: services slowly orbiting Hydra on a tilted ring. */
export function Closing() {
  return (
    <section className={styles.closing} aria-labelledby="closing-title">
      <div className={lp.wrap}>
        <InView className={styles.closingPanel}>
          <div className={styles.closingCopy}>
            <h2 id="closing-title" className={styles.closingTitle}>
              See your whole system on one map.
            </h2>
            <p className={styles.closingText}>Open the workspace, import a repository and watch Hydra put its services in place. Nothing in it is ever executed.</p>
            <div className={styles.closingActions}>
              <ButtonLink href={ROUTES.workspace} arrow className={styles.closingPrimary}>
                Open workspace
              </ButtonLink>
              <ButtonLink href={ROUTES.importRepository} variant="secondary" className={styles.closingSecondary}>
                Import a repository
              </ButtonLink>
            </div>
          </div>
          <Orbit />
        </InView>
      </div>
    </section>
  );
}
