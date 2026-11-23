"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import type { Project, ProjectMember } from "@/lib/api";
import { Icon } from "../landing/Icon";

/*
 * What the project frame (app/projects/[projectId]/layout.tsx) knows about the project, shared with its
 * pages: the project and your role in it. Loaded once per project, not once per tab.
 */

export type ProjectRole = ProjectMember["role"];
/** null while loading; "none" when you are not a member (the API answers 403). */
export type ProjectAccessState = { project: Project | null; role: ProjectRole | "none" | null };

export const ProjectContext = createContext<ProjectAccessState>({ project: null, role: null });

export function useProjectAccess(): ProjectAccessState {
  return useContext(ProjectContext);
}

/**
 * A quiet chip in the page head when you can look but not change. `need` is the role the page's
 * changes require: contributors can change work and the model, only owners settings and integrations.
 */
export function ViewOnly({ need = "Contributor" }: { need?: "Contributor" | "Owner" }) {
  const { role } = useProjectAccess();
  const allowed = role === "Owner" || (need === "Contributor" && role === "Contributor");
  if (role === null || role === "none" || allowed) return null;
  const why = need === "Owner" ? "Only project owners can change this." : "Viewers can look but not change. Ask a project owner for contributor access.";
  return <span className="chip view-only" title={why}><Icon name="lock" size={12} />View only</span>;
}

/** Shown instead of a project's pages when you may not open it, or it does not exist. Always offers a way back. */
export function AccessDenied({ reason }: { reason: "forbidden" | "notFound" }) {
  return (
    <main id="main" className="ws-page">
      <section className="tile empty-state access-denied fade-in">
        <span className="empty-icon" aria-hidden="true"><Icon name={reason === "forbidden" ? "lock" : "search-x"} size={22} /></span>
        <h1>{reason === "forbidden" ? "You don't have access to this project" : "This project wasn't found"}</h1>
        <p>{reason === "forbidden"
          ? "Projects are visible to their members only. Ask a project owner to add you: Settings, Members. You need to have signed in to Hydra once before they can."
          : "It may have been archived, or the link is out of date."}</p>
        <div className="empty-actions"><Link className="button primary" href="/projects"><Icon name="arrow-left" />Back to your projects</Link></div>
      </section>
    </main>
  );
}
