/*
 * The pages of a project, in the order of the tab bar, grouped by what you do there.
 * Pure data and functions, so the tab bar and the page titles cannot drift apart.
 */

export const PROJECT_TABS = [
  { key: "overview", label: "Overview", segment: "", group: "Project" },
  { key: "boards", label: "Boards", segment: "boards", group: "Plan" },
  { key: "components", label: "Components", segment: "components", group: "Model" },
  { key: "environments", label: "Environments", segment: "environments", group: "Model" },
  { key: "topology", label: "Topology", segment: "topology", group: "Operate" },
  { key: "comparison", label: "Compare", segment: "comparison", group: "Operate" },
  { key: "events", label: "Events", segment: "events", group: "Operate" },
  { key: "deployments", label: "Deployments", segment: "deployments", group: "Operate" },
  { key: "integrations", label: "Integrations", segment: "settings/integrations", group: "Connect" },
  { key: "settings", label: "Settings", segment: "settings", group: "Admin" },
] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number];
export type ProjectTabKey = ProjectTab["key"];

export function projectTab(key: ProjectTabKey): ProjectTab {
  return PROJECT_TABS.find((tab) => tab.key === key) ?? PROJECT_TABS[0];
}

export function projectTabHref(projectId: string, tab: ProjectTab): string {
  return tab.segment ? `/projects/${projectId}/${tab.segment}` : `/projects/${projectId}`;
}

/** Which tab a path belongs to. The longest matching segment wins, so settings/integrations beats settings. */
export function activeProjectTab(pathname: string, projectId: string): ProjectTabKey {
  const base = `/projects/${projectId}`;
  if (!pathname.startsWith(base)) return "overview";
  const rest = pathname.slice(base.length).replace(/^\/+|\/+$/g, "");
  let best: ProjectTab | null = null;
  for (const tab of PROJECT_TABS) {
    if (!tab.segment) continue;
    if (rest === tab.segment || rest.startsWith(`${tab.segment}/`)) {
      if (!best || tab.segment.length > best.segment.length) best = tab;
    }
  }
  return best?.key ?? "overview";
}
