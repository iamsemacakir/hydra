import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import "@/components/landing/theme.css";
import s from "@/components/landing/Landing.module.css";
import { codeFont, sansFont } from "@/components/landing/fonts";
import { AffectedIcon, AlertIcon, ArrowRight, CheckIcon, HydraMark, LockIcon } from "@/components/landing/icons";
import { LiveMap } from "@/components/landing/LiveMap";
import { ThemeSwitch } from "@/components/landing/ThemeSwitch";

export const metadata: Metadata = {
  title: "Hydra · Every service, one live map",
  description:
    "Hydra reads your compose.yaml, saves every service and dependency as one live map, and shows which services are potentially affected when one fails.",
};

const WORKSPACE_HREF = "/projects";
/** The seeded Commerce demo (backend DemoSeed.cs). Its topology opens on the Production environment. */
const DEMO_HREF = "/projects/10000000-0000-0000-0000-000000000001/topology";
const SOURCE_HREF = "https://github.com/VikoPiko/hydra";

const HOW_IT_WORKS = [
  {
    title: "Import a repository",
    text: "Point Hydra at a repository. It finds the compose.yaml and reads it as plain text, so nothing in the repository runs.",
  },
  {
    title: "Review, then save",
    text: "See the services and dependencies Hydra found before anything is stored. Apply, and they are saved as one map.",
  },
  {
    title: "Watch the live map",
    text: "Every service shows its health. When one fails, the services that depend on it are marked potentially affected.",
  },
];

type StyleVars = CSSProperties & Record<`--${string}`, string | number>;

export default function LandingPage() {
  return (
    <div className={`${s.root} ${sansFont.variable} ${codeFont.variable}`} data-hydra-landing="" id="top">
      <a className={s.skip} href="#main">
        Skip to content
      </a>

      <header className={s.nav}>
        <div className={`${s.wrap} ${s.navInner}`}>
          <a className={s.brand} href="#top" aria-label="Hydra, back to top">
            <HydraMark className={s.brandMark} />
            Hydra
          </a>
          <nav className={s.navLinks} aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#capabilities">What you get</a>
          </nav>
          <div className={s.navEnd}>
            <ThemeSwitch />
            <Link className={`${s.btn} ${s.btnPrimary} ${s.btnSmall} ${s.navCta}`} href={WORKSPACE_HREF}>
              Open workspace
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={`${s.wrap} ${s.heroGrid}`}>
            <h1 id="hero-title" className={`${s.display} ${s.heroTitle}`}>
              <span className={s.mask}>
                <span className={s.rise}>Every service.</span>
              </span>
              <span className={s.mask}>
                <span className={s.rise}>
                  One live map<span className={s.livePeriod}>.</span>
                </span>
              </span>
            </h1>

            <div className={s.heroMap}>
              <LiveMap />
            </div>

            <p className={s.lead}>
              Hydra reads your <code className={s.inlineCode}>compose.yaml</code>, saves every service and dependency as
              one live map, and shows which services are <strong>potentially affected</strong> when one fails.
            </p>
            <div className={s.heroActions}>
              <div className={s.actions}>
                <Link className={`${s.btn} ${s.btnPrimary}`} href={WORKSPACE_HREF}>
                  Open workspace
                  <ArrowRight />
                </Link>
                <Link className={`${s.btn} ${s.btnSecondary}`} href={DEMO_HREF}>
                  Explore the demo
                </Link>
              </div>
              <p className={s.note}>
                <LockIcon />
                Read-only analysis. Your code is never executed.
              </p>
            </div>
          </div>
        </section>

        <section id="how" className={s.section} aria-labelledby="how-title">
          <div className={s.wrap}>
            <div className={s.sectionHead}>
              <h2 id="how-title" className={s.heading}>
                How it works
              </h2>
              <p className={s.sectionLead}>Three steps from one file to a live map of your system.</p>
            </div>
            <ol className={s.how} role="list">
              {HOW_IT_WORKS.map((step, index) => (
                <li key={step.title} className={s.howStep} style={{ "--i": index } as StyleVars}>
                  <span className={s.howPoint} aria-hidden="true" />
                  <span className={s.howNumber}>Step {index + 1}</span>
                  <h3 className={s.howTitle}>{step.title}</h3>
                  <p className={s.howText}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="capabilities" className={s.section} aria-labelledby="capabilities-title">
          <div className={`${s.wrap} ${s.capsGrid}`}>
            <div className={s.capsHead}>
              <h2 id="capabilities-title" className={s.heading}>
                What you get
              </h2>
              <p className={s.sectionLead}>
                One calm view of your system, and a clear answer when something fails.
              </p>
            </div>
            <dl className={s.caps}>
              <div className={s.cap}>
                <dt className={s.capTitle}>Read-only discovery</dt>
                <dd className={s.capText}>
                  Hydra parses <code>compose.yaml</code> as text. Nothing in your repository is executed, and nothing is
                  saved until you review the preview and apply it.
                </dd>
              </div>
              <div className={s.cap}>
                <dt className={s.capTitle}>One live map</dt>
                <dd className={s.capText}>
                  Every service and dependency in one view, with the health of each service updated live.
                </dd>
              </div>
              <div className={s.cap}>
                <dt className={s.capTitle}>Potential impact</dt>
                <dd className={s.capText}>
                  <span>
                    When a service fails, every service that depends on it, directly or through others, is marked
                    potentially affected. Each state has a word and an icon, not only a colour.
                  </span>
                  <ul className={s.legend} aria-label="Health labels on the map">
                    <li className={s.chip} data-tone="ok">
                      <CheckIcon />
                      OK
                    </li>
                    <li className={s.chip} data-tone="failed">
                      <AlertIcon />
                      Unhealthy
                    </li>
                    <li className={s.chip} data-tone="affected">
                      <AffectedIcon />
                      Potentially affected
                    </li>
                  </ul>
                </dd>
              </div>
              <div className={s.cap}>
                <dt className={s.capTitle}>Evidence for every dependency</dt>
                <dd className={s.capText}>
                  Each dependency remembers where it came from, such as <code>services.orders.depends_on</code> in{" "}
                  <code>compose.yaml</code>, so the map can always be checked against the code.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={s.cta} aria-labelledby="cta-title">
          <div className={s.wrap}>
            <h2 id="cta-title" className={s.ctaTitle}>
              Start with your <span className={s.nowrap}>compose.yaml.</span>
            </h2>
            <div className={s.ctaRow}>
              <p className={s.ctaText}>
                Open your workspace and import a repository, or explore the demo system first.
              </p>
              <div className={s.actions}>
                <Link className={`${s.btn} ${s.btnInverse}`} href={WORKSPACE_HREF}>
                  Open workspace
                  <ArrowRight />
                </Link>
                <Link className={`${s.btn} ${s.btnGhost}`} href={DEMO_HREF}>
                  Explore the demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footerRow}`}>
          <a className={s.brand} href="#top" aria-label="Hydra, back to top">
            <HydraMark className={s.brandMark} />
            Hydra
          </a>
          <nav className={s.footerLinks} aria-label="Footer">
            <Link href={WORKSPACE_HREF}>Open workspace</Link>
            <Link href={DEMO_HREF}>Explore the demo</Link>
            <a href={SOURCE_HREF}>Source on GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
