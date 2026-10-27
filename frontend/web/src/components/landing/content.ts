/** Routes and anchors used by the landing page, kept in one place. */
export const ROUTES = {
  workspace: "/projects",
  signIn: "/signin",
  importRepository: "/projects/import",
} as const;

export const SECTION_IDS = {
  getStarted: "get-started",
  explorer: "impact-explorer",
  capabilities: "capabilities",
} as const;

export const NAV_LINKS = [
  { label: "Get started", href: `#${SECTION_IDS.getStarted}` },
  { label: "Impact explorer", href: `#${SECTION_IDS.explorer}` },
  { label: "Capabilities", href: `#${SECTION_IDS.capabilities}` },
] as const;
