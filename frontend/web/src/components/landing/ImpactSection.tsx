import { SECTION_IDS } from "./content";
import { ImpactExplorer } from "./ImpactExplorer";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";
import styles from "./landing.module.css";

export function ImpactSection() {
  return (
    <section
      id={SECTION_IDS.explorer}
      className={`${styles.section} ${styles.explorerBand}`}
      aria-labelledby="explorer-title"
    >
      <div className={styles.wrap}>
        <SectionHeader
          id="explorer-title"
          eyebrow="Impact explorer"
          title="Click a service. See what it could reach."
          lede="The same sample system, now in your hands. An arrow from A to B means A depends on B, so a failure travels against the arrows."
        />
        <Reveal>
          <ImpactExplorer />
        </Reveal>
      </div>
    </section>
  );
}
