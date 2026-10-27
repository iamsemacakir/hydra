import styles from "./landing.module.css";

type SectionHeaderProps = {
  /** id of the heading, referenced by the section's aria-labelledby. */
  id: string;
  eyebrow: string;
  title: string;
  lede?: string;
};

export function SectionHeader({ id, eyebrow, title, lede }: SectionHeaderProps) {
  return (
    <div className={styles.sectionHeader}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {lede && <p className={styles.sectionLede}>{lede}</p>}
    </div>
  );
}
