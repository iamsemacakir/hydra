import { Brand } from "./Brand";
import { ButtonLink } from "./ButtonLink";
import { NAV_LINKS, ROUTES } from "./content";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./landing.module.css";

export function LandingNav() {
  return (
    <header className={styles.nav}>
      <div className={`${styles.wrap} ${styles.navInner}`}>
        <Brand />
        <nav className={styles.navLinks} aria-label="Sections">
          {NAV_LINKS.map((link) => (
            <a key={link.href} className={styles.navLink} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.navActions}>
          <ThemeToggle />
          <ButtonLink href={ROUTES.workspace} className={styles.navCta}>
            Open workspace
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
