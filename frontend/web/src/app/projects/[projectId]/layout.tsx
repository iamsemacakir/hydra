"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AccessDenied, ProjectContext, type ProjectAccessState } from "@/components/app/ProjectContext";
import { ProjectNav } from "@/components/ProjectNav";
import { ApiError, getJson, type Project, type ProjectMember } from "@/lib/api";
import { activeProjectTab } from "@/lib/projectNav";

/*
 * Every page of a project shares this frame: where you are (Projects / project) and the tab bar.
 * It stays mounted while you switch tabs, so the bar does not jump. Each page renders its own
 * head (PageHead) and content inside it.
 *
 * The frame also loads the project and your role in it once, and shares them with the pages
 * (ProjectContext). When you may not open the project, or it does not exist, the frame shows why and
 * a way back instead of the pages. Other loading errors are shown by the page itself.
 */
export default function ProjectLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const [access, setAccess] = useState<ProjectAccessState>({ project: null, role: null });
  const [denied, setDenied] = useState<"forbidden" | "notFound" | null>(null);
  useEffect(() => {
    let current = true;
    setAccess({ project: null, role: null });
    setDenied(null);
    const refuse = (cause: unknown) => {
      if (!current || !(cause instanceof ApiError)) return;
      if (cause.kind === "forbidden" || cause.kind === "notFound") {
        setDenied(cause.kind);
        setAccess({ project: null, role: "none" });
      }
    };
    getJson<Project>(`/api/projects/${projectId}`)
      .then((project) => { if (current) setAccess((now) => ({ ...now, project })); })
      .catch(refuse);
    Promise.all([getJson<ProjectMember[]>(`/api/projects/${projectId}/members`), getJson<{ id: string }>("/api/me")])
      .then(([members, me]) => { if (current) setAccess((now) => ({ ...now, role: members.find((member) => member.userId === me.id)?.role ?? "none" })); })
      .catch(refuse);
    return () => { current = false; };
  }, [projectId]);
  const active = activeProjectTab(pathname, projectId);
  const { project } = access;
  return (
    <ProjectContext.Provider value={access}>
      <div className="ws">
        <div className="ws-context">
          <nav aria-label="Breadcrumb" className="crumbs">
            <ol>
              <li><Link href="/projects">Projects</Link></li>
              <li>
                <span className="project-mark" data-size="sm" aria-hidden="true">{project?.name.slice(0, 1) ?? ""}</span>
                {active === "overview" || denied
                  ? <span aria-current="page">{project?.name ?? "Project"}</span>
                  : <Link href={`/projects/${projectId}`}>{project?.name ?? "Project"}</Link>}
              </li>
            </ol>
          </nav>
          {project && <span className="chip" title="Who can see this project">{project.visibility}</span>}
          {project?.archivedAt && <span className="chip" data-tone="warn">Archived</span>}
        </div>
        {denied ? <AccessDenied reason={denied} /> : <>
          <ProjectNav projectId={projectId} active={active} />
          {children}
        </>}
      </div>
    </ProjectContext.Provider>
  );
}
