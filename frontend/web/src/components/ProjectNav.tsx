"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { PROJECT_TABS, projectTabHref, type ProjectTabKey } from "@/lib/projectNav";
import { Icon, type IconName } from "./landing/Icon";

const TAB_ICONS: Record<ProjectTabKey, IconName> = {
  overview: "layout-dashboard",
  boards: "square-kanban",
  components: "box",
  environments: "layers",
  topology: "network",
  comparison: "git-compare-arrows",
  events: "activity",
  deployments: "rocket",
  integrations: "plug",
  settings: "settings",
};

/**
 * The project's tab bar. Rendered once by app/projects/[projectId]/layout.tsx, so it stays in place
 * while you move between tabs. A thin divider separates the groups (plan, model, operate, connect).
 * On narrow screens the bar scrolls sideways; the current tab is scrolled into view.
 */
export function ProjectNav({ projectId, active }: { projectId: string; active: ProjectTabKey }) {
  const navRef = useRef<HTMLElement>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    const nav = navRef.current;
    const tab = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !tab) return;
    const navBox = nav.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    // Only scroll when the tab is not fully visible, and centre it in the bar.
    if (tabBox.left >= navBox.left && tabBox.right <= navBox.right - 40) {
      firstRun.current = false;
      return;
    }
    const smooth = !firstRun.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollBy({ left: tabBox.left - navBox.left - (navBox.width - tabBox.width) / 2, behavior: smooth ? "smooth" : "auto" });
    firstRun.current = false;
  }, [active]);

  return (
    <nav ref={navRef} className="project-nav" aria-label="Project pages">
      <ul>
        {PROJECT_TABS.map((tab, index) => {
          const groupStart = index > 0 && PROJECT_TABS[index - 1].group !== tab.group;
          return (
            <li key={tab.key} className={groupStart ? "group-start" : undefined}>
              <Link href={projectTabHref(projectId, tab)} className="project-tab" aria-current={tab.key === active ? "page" : undefined}>
                <Icon name={TAB_ICONS[tab.key]} size={16} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
