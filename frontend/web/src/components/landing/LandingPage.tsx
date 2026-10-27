import { Capabilities } from "./Capabilities";
import { FinalCta } from "./FinalCta";
import { geistMono, geistSans } from "./fonts";
import { GetStarted } from "./GetStarted";
import { Hero } from "./Hero";
import { ImpactSection } from "./ImpactSection";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";
import styles from "./landing.module.css";

/**
 * The public landing page. It is a server component; only the hero demo, the impact
 * explorer, the theme toggle and the scroll reveal run in the browser.
 *
 * `data-landing` marks the page for the rules in globals.css that style <html> (background,
 * color-scheme, smooth anchor scrolling) only while the landing page is on screen.
 */
export function LandingPage() {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} ${styles.landing}`} data-landing>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <LandingNav />
      <main id="main" className={styles.main} tabIndex={-1}>
        <Hero />
        <GetStarted />
        <ImpactSection />
        <Capabilities />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
