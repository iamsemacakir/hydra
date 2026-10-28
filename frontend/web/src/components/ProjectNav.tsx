import Link from "next/link";
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
 */
export function ProjectNav({ projectId, active }: { projectId: string; active: ProjectTabKey }) {
  return (
    <nav className="project-nav" aria-label="Project pages">
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
