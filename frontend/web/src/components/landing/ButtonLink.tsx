import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./landing.module.css";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  ghost: styles.btnGhost,
};

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  /** Adds a trailing arrow that nudges on hover. */
  arrow?: boolean;
  className?: string;
  children: ReactNode;
};

/** A link that looks like a button. In-page anchors use a plain <a>, routes use next/link. */
export function ButtonLink({ href, variant = "primary", arrow = false, className, children }: ButtonLinkProps) {
  const classes = [styles.btn, VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  const content = (
    <>
      {children}
      {arrow && <Icon name="arrow-right" size={16} className={styles.btnArrow} />}
    </>
  );
  if (href.startsWith("#")) {
    return (
      <a className={classes} href={href}>
        {content}
      </a>
    );
  }
  return (
    <Link className={classes} href={href}>
      {content}
    </Link>
  );
}
