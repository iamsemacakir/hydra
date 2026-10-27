import { Icon, type IconName } from "../Icon";
import styles from "./motion.module.css";

/** What one project holds. Every item is something the workspace shows today. */
const ROW_A: ReadonlyArray<{ icon: IconName; label: string }> = [
  { icon: "file-code", label: "compose.yaml" },
  { icon: "network", label: "Services" },
  { icon: "git-branch", label: "Dependencies" },
  { icon: "shield-check", label: "Runtime health" },
  { icon: "rotate-ccw", label: "Deployments" },
  { icon: "git-compare-arrows", label: "Environments" },
];

const ROW_B: readonly string[] = [
  "Operational events",
  "Impact analysis",
  "Live updates",
  "Boards",
  "Declared, discovered and observed dependencies",
  "Read-only scan",
];

/**
 * Two slow ribbons drifting in opposite directions. Each list is rendered twice so the loop
 * is seamless; the copy is hidden from assistive technology so nothing is read twice.
 */
export function Marquee() {
  return (
    <section className={styles.marquee} aria-label="What one project brings together">
      <div className={styles.ribbon}>
        {[0, 1].map((copy) => (
          <ul key={copy} className={styles.ribbonTrack} aria-hidden={copy === 1 ? true : undefined}>
            {ROW_A.map((item) => (
              <li key={item.label} className={styles.ribbonItem}>
                <Icon name={item.icon} size={18} />
                {item.label}
              </li>
            ))}
          </ul>
        ))}
      </div>
      <div className={`${styles.ribbon} ${styles.ribbonReverse}`}>
        {[0, 1].map((copy) => (
          <ul key={copy} className={styles.ribbonTrack} aria-hidden={copy === 1 ? true : undefined}>
            {ROW_B.map((label) => (
              <li key={label} className={`${styles.ribbonItem} ${styles.ribbonQuiet}`}>
                <span className={styles.ribbonStar} aria-hidden="true">✦</span>
                {label}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
