"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProjectNav } from "@/components/ProjectNav";
import { getJson, type Project } from "@/lib/api";
import { activeProjectTab } from "@/lib/projectNav";

/*
 * Every page of a project shares this frame: where you are (Projects / project) and the tab bar.
 * It stays mounted while you switch tabs, so the bar does not jump. Each page renders its own
 * head (PageHead) and content inside it. Errors loading the project are shown by the page itself.
 */
export default function ProjectLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const [project, setProject] = useState<Project | null>(null);
  useEffect(() => {
    let current = true;
    getJson<Project>(`/api/projects/${projectId}`).then((p) => { if (current) setProject(p); }).catch(() => undefined);
    return () => { current = false; };
  }, [projectId]);
  const active = activeProjectTab(pathname, projectId);
  return (
    <div className="ws">
      <div className="ws-context">
        <nav aria-label="Breadcrumb" className="crumbs">
          <ol>
            <li><Link href="/projects">Projects</Link></li>
            <li>
              <span className="project-mark" data-size="sm" aria-hidden="true">{project?.name.slice(0, 1) ?? ""}</span>
              {active === "overview"
                ? <span aria-current="page">{project?.name ?? "Project"}</span>
                : <Link href={`/projects/${projectId}`}>{project?.name ?? "Project"}</Link>}
            </li>
          </ol>
        </nav>
        {project && <span className="chip" title="Who can see this project">{project.visibility}</span>}
        {project?.archivedAt && <span className="chip" data-tone="warn">Archived</span>}
      </div>
      <ProjectNav projectId={projectId} active={active} />
      {children}
    </div>
  );
}
