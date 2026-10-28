import { cssVars } from "../cssVars";
import { SERVICE_IDS } from "../graph";
import { StateGlyph } from "../StateGlyph";
import styles from "./motion.module.css";

const ORBIT = SERVICE_IDS.slice(0, 6);

/**
 * Services slowly orbiting Hydra on a tilted ring. Decorative, so it is hidden from assistive
 * technology. Made for an inverse panel (the closing call to action, the sign-in page).
 */
export function Orbit({ className }: { className?: string }) {
  return (
    <div className={[styles.orbit, className].filter(Boolean).join(" ")} aria-hidden="true">
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
  );
}
