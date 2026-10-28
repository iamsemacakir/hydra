import Link from "next/link";
import styles from "./landing.module.css";

/** Brand mark: a small dependency tree on a rounded square. Colors come from the landing tokens. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg className={styles.logoMark} width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">
      <rect className={styles.logoPlate} width="28" height="28" rx="8" />
      <path className={styles.logoStroke} d="M14 20.5V15M14 15 8.6 9.6M14 15l5.4-5.4M14 15V8.6" strokeWidth="1.7" strokeLinecap="round" />
      <circle className={styles.logoDot} cx="14" cy="20.5" r="2.1" />
      <circle className={styles.logoDot} cx="8.6" cy="8.8" r="1.9" />
      <circle className={styles.logoDot} cx="14" cy="7.6" r="1.9" />
      <circle className={styles.logoDot} cx="19.4" cy="8.8" r="1.9" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={[styles.brand, className].filter(Boolean).join(" ")}>
      <LogoMark />
      <span className={styles.brandName}>Hydra</span>
    </Link>
  );
}
