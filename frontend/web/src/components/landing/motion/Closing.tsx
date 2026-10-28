import { ButtonLink } from "../ButtonLink";
import { ROUTES } from "../content";
import { cssVars } from "../cssVars";
import { SERVICE_IDS } from "../graph";
import lp from "../landing.module.css";
import { StateGlyph } from "../StateGlyph";
import { InView } from "./InView";
import styles from "./motion.module.css";

const ORBIT = SERVICE_IDS.slice(0, 6);

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
            <p className={styles.closingText}>Open the workspace, import a repository and watch its services fall into place. Nothing in it is ever executed.</p>
            <div className={styles.closingActions}>
              <ButtonLink href={ROUTES.workspace} arrow className={styles.closingPrimary}>
                Open workspace
              </ButtonLink>
              <ButtonLink href={ROUTES.importRepository} variant="secondary" className={styles.closingSecondary}>
                Import a repository
              </ButtonLink>
            </div>
          </div>
          <div className={styles.orbit} aria-hidden="true">
            <div className={styles.orbitPlane}>
              <div className={styles.orbitSpin}>
                <span className={styles.orbitPath} />
                <span className={`${styles.orbitPath} ${styles.orbitPathInner}`} />
                {ORBIT.map((id, i) => (
                  <span key={id} className={styles.orbitNode} style={cssVars({ "--a": `${(360 / ORBIT.length) * i}deg` })}>
                    <span className={styles.orbitUnspin}>
                      <span className={styles.orbitFace}>
                        <StateGlyph kind="healthy" />
                        {id}
                      </span>
                    </span>
                  </span>
                ))}
              </div>
              <span className={styles.orbitCore}>
                <svg viewBox="0 0 28 28" width="30" height="30" fill="none">
                  <path d="M14 20.5V15M14 15 8.6 9.6M14 15l5.4-5.4M14 15V8.6" strokeWidth="1.7" strokeLinecap="round" />
                  <circle cx="14" cy="20.5" r="2.1" />
                  <circle cx="8.6" cy="8.8" r="1.9" />
                  <circle cx="14" cy="7.6" r="1.9" />
                  <circle cx="19.4" cy="8.8" r="1.9" />
                </svg>
                Hydra
              </span>
            </div>
          </div>
        </InView>
      </div>
    </section>
  );
}
