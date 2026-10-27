import Link from "next/link";
import { ROUTES, SECTION_IDS } from "../content";
import { cssVars } from "../cssVars";
import { Icon, type IconName } from "../Icon";
import lp from "../landing.module.css";
import { SectionHeader } from "../SectionHeader";
import { InView } from "./InView";
import styles from "./motion.module.css";

type Step = { icon: IconName; title: string; text: string; link: { label: string; href: string } };

const STEPS: readonly Step[] = [
  {
    icon: "log-in",
    title: "Sign in",
    text: "Sign in with your account to see the projects you belong to.",
    link: { label: "Sign in", href: ROUTES.signIn },
  },
  {
    icon: "git-branch",
    title: "Import a repository",
    text: "Scan configuration files, review the services and dependencies found, then apply them to a project.",
    link: { label: "Import a repository", href: ROUTES.importRepository },
  },
  {
    icon: "network",
    title: "Open the topology",
    text: "See health, versions and dependencies for each service, and what could be affected if one fails.",
    link: { label: "Open workspace", href: ROUTES.workspace },
  },
];

/** Three steps on a line that draws itself when the section comes into view. */
export function Steps() {
  return (
    <section id={SECTION_IDS.getStarted} className={lp.section} aria-labelledby="get-started-title">
      <div className={lp.wrap}>
        <SectionHeader id="get-started-title" eyebrow="Get started" title="From sign-in to topology in three steps." />
        <InView once className={styles.track}>
          <span className={styles.trackLine} aria-hidden="true">
            <i />
          </span>
          <ol className={styles.trackSteps}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={styles.trackStep} style={cssVars({ "--i": i })}>
                <span className={styles.trackDot} aria-hidden="true">
                  <Icon name={step.icon} size={20} />
                </span>
                <span className={styles.trackNumber}>Step {i + 1}</span>
                <h3 className={styles.trackTitle}>{step.title}</h3>
                <p className={styles.trackText}>{step.text}</p>
                <Link className={styles.trackLink} href={step.link.href}>
                  {step.link.label}
                  <Icon name="arrow-right" size={16} />
                </Link>
              </li>
            ))}
          </ol>
        </InView>
      </div>
    </section>
  );
}
