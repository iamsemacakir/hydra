import { prefetchJson } from "./api";

/*
 * Start the work before they ask: when the pointer rests on a project (or the keyboard focuses it),
 * fetch what its overview and frame will need, so the page opens with data already there.
 * The paths must match the ones the pages request (app/projects/[projectId]/layout.tsx and page.tsx).
 */
export function prefetchProject(projectId: string): void {
  for (const path of [
    `/api/projects/${projectId}`,
    `/api/projects/${projectId}/members`,
    "/api/me",
    `/api/projects/${projectId}/environments`,
    `/api/projects/${projectId}/work-items`,
    `/api/projects/${projectId}/activity?limit=8`,
  ]) prefetchJson(path);
}
