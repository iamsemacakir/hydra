import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import styles from "./film.module.css";

type FilmLinkProps = {
  href: string;
  variant?: "primary" | "secondary";
  arrow?: boolean;
  children: ReactNode;
};

/** The hero's buttons, in the dark scene's colours. In-page anchors use a plain <a>, routes use next/link. */
export function FilmLink({ href, variant = "primary", arrow = false, children }: FilmLinkProps) {
  const className = `${styles.btn} ${variant === "primary" ? styles.btnPrimary : styles.btnSecondary}`;
  const content = (
    <>
      {children}
      {arrow && <Icon name="arrow-right" size={16} className={styles.btnArrow} />}
    </>
  );
  if (href.startsWith("#")) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {content}
    </Link>
  );
}
