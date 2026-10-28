import Link from "next/link";
import type { SignInNotice } from "@/lib/authSettings";
import { Brand } from "../landing/Brand";
import { geistMono, geistSans } from "../landing/fonts";
import { Icon } from "../landing/Icon";
import lp from "../landing/landing.module.css";
import m from "../landing/motion/motion.module.css";
import { Orbit } from "../landing/motion/Orbit";
import { StateGlyph } from "../landing/StateGlyph";
import { ThemeToggle } from "../landing/ThemeToggle";
import styles from "./signin.module.css";

type SignInPageProps = {
  /** Server action that starts the Keycloak sign-in. */
  action: (formData: FormData) => void | Promise<void>;
  /** Why the visitor is here again (an error from Auth.js, missing settings), or nothing. */
  notice: SignInNotice | null;
  /** Same-site path to open after signing in. */
  callbackUrl: string;
  /** Sign-in cannot work on this server yet; the notice explains why. */
  disabled: boolean;
};

/**
 * The sign-in page, in the landing page's design language: the form on one side, services
 * orbiting Hydra on the other. The password is entered on Keycloak, never here.
 */
export function SignInPage({ action, notice, callbackUrl, disabled }: SignInPageProps) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} ${lp.landing} ${styles.page}`} data-landing>
      <header className={styles.top}>
        <Brand />
        <ThemeToggle />
      </header>

      <main id="main" className={styles.main}>
        <section className={styles.formSide} aria-labelledby="signin-title">
          <div className={styles.card}>
            <p className={m.pill}>
              <span className={m.pillDot} />
              Hydra workspace
            </p>
            <h1 id="signin-title" className={styles.title}>
              Sign in to Hydra.
            </h1>
            <p className={styles.lede}>Open your projects and their live maps.</p>

            {notice && (
              <div className={styles.notice} data-tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>
                <p className={styles.noticeTitle}>
                  <StateGlyph kind={notice.tone === "error" ? "degraded" : "unknown"} />
                  {notice.title}
                </p>
                <p className={styles.noticeText}>{notice.text}</p>
                {notice.hints.length > 0 && (
                  <ul className={styles.hints}>
                    {notice.hints.map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <form action={action} className={styles.form}>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <button type="submit" className={styles.submit} disabled={disabled}>
                <Icon name="log-in" size={18} />
                Continue with Keycloak
                <Icon name="arrow-right" size={18} className={styles.submitArrow} />
              </button>
            </form>

            <p className={styles.trust}>
              <Icon name="shield-check" size={16} />
              You enter your password on Keycloak. Hydra never sees it.
            </p>
            <p className={styles.help}>No account yet? Your Keycloak administrator can create one.</p>
            <Link href="/" className={styles.back}>
              <Icon name="arrow-right" size={16} className={styles.backArrow} />
              Back to the home page
            </Link>
          </div>
        </section>

        <aside className={styles.visual} aria-hidden="true">
          <p className={styles.visualStatus}>
            <StateGlyph kind="healthy" />
            All services OK
          </p>
          <Orbit className={styles.visualOrbit} />
          <div className={styles.visualCaption}>
            <p className={styles.visualTitle}>Every service, one live map.</p>
            <p className={styles.visualNote}>Sample system</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
