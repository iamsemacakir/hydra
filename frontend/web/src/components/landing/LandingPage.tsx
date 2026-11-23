import { geistMono, geistSans } from "./fonts";
import { ImpactSection } from "./ImpactSection";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";
import { Bento } from "./motion/Bento";
import { Closing } from "./motion/Closing";
import { Hero } from "./motion/Hero";
import { Marquee } from "./motion/Marquee";
import { Steps } from "./motion/Steps";
import { Story } from "./motion/Story";
import styles from "./landing.module.css";

/**
 * The public landing page. It is a server component; only the small interactive parts (the hero
 * tilt, the story steps, the impact explorer, the theme toggle, the in-view flags) run in the browser.
 * Every animation is HTML, SVG and CSS, in ./motion.
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
        <Marquee />
        <Story />
        <Bento />
        <ImpactSection />
        <Steps />
        <Closing />
      </main>
      <LandingFooter />
    </div>
  );
}
