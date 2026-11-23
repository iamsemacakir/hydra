import { StateGlyph, type GlyphKind } from "./StateGlyph";
import styles from "./landing.module.css";

const ITEMS: ReadonlyArray<readonly [GlyphKind, string]> = [
  ["unknown", "unknown"],
  ["healthy", "healthy"],
  ["degraded", "degraded"],
  ["affected", "potentially affected"],
];

type LegendProps = {
  /** Show the "A → B means A depends on B" reading rule above the items. */
  rule?: boolean;
  className?: string;
};

export function Legend({ rule = true, className }: LegendProps) {
  return (
    <div className={[styles.legend, className].filter(Boolean).join(" ")}>
      {rule && <p className={styles.legendRule}>A → B means A depends on B</p>}
      <ul className={styles.legendItems}>
        {ITEMS.map(([kind, label]) => (
          <li key={label}>
            <StateGlyph kind={kind} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
