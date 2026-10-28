import Link from "next/link";
import { Brand } from "./Brand";
import { ROUTES } from "./content";
import styles from "./landing.module.css";

const LINKS = [
  { label: "Workspace", href: ROUTES.workspace },
  { label: "Import a repository", href: ROUTES.importRepository },
  { label: "Sign in", href: ROUTES.signIn },
] as const;

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Brand />
            <p className={styles.footerTag}>
              Lifecycle, health and dependency analysis for distributed systems, on one live map.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className={styles.footerLinks}>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link className={styles.footerLink} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className={styles.footerLegal}>© {new Date().getFullYear()} Hydra</p>
      </div>
    </footer>
  );
}
