import Link from "next/link";
import { ROUTES, SECTION_IDS } from "./content";
import { Icon, type IconName } from "./Icon";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";
import styles from "./landing.module.css";

type Step = {
  number: string;
  icon: IconName;
  title: string;
  text: string;
  link: { label: string; href: string };
};

const STEPS: readonly Step[] = [
  {
    number: "01",
    icon: "log-in",
    title: "Sign in",
    text: "Sign in with your account to see the projects you belong to.",
    link: { label: "Sign in", href: ROUTES.signIn },
  },
  {
    number: "02",
    icon: "git-branch",
    title: "Import a repository",
    text: "Scan configuration files, review the services and dependencies found, then apply them to a project.",
    link: { label: "Import a repository", href: ROUTES.importRepository },
  },
  {
    number: "03",
    icon: "network",
    title: "Open the topology",
    text: "See health, versions and dependencies for each service, and what could be affected if one fails.",
    link: { label: "Open workspace", href: ROUTES.workspace },
  },
];

export function GetStarted() {
  return (
    <section id={SECTION_IDS.getStarted} className={styles.section} aria-labelledby="get-started-title">
      <div className={styles.wrap}>
        <SectionHeader
          id="get-started-title"
          eyebrow="Get started"
          title="From sign-in to topology in three steps."
          lede="Each card goes straight to its page."
        />
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.number}>
              <Reveal delay={index * 80} className={styles.stretch}>
                <article className={styles.step}>
                  <div className={styles.stepTop}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <span className={styles.stepIcon}>
                      <Icon name={step.icon} size={20} />
                    </span>
                  </div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                  <Link className={styles.stepLink} href={step.link.href}>
                    {step.link.label}
                    <Icon name="arrow-right" size={16} className={styles.stepArrow} />
                  </Link>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
