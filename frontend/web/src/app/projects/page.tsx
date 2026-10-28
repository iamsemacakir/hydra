"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { ExampleProject } from "@/components/app/ExampleProject";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { Icon } from "@/components/landing/Icon";
import { getJson, Project } from "@/lib/api";
import { EXAMPLE_PROJECT_NAME } from "@/lib/demo/createExampleProject";

const demo = process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => getJson<Project[]>("/api/projects").then(setProjects).catch(e => setError(e.message)).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);
  return <main id="main" className="page">
    <PageHead eyebrow="Workspace" title="Projects" lede="Pick a system to see its live map, its work and what changed recently."
      actions={<>
        <Link className="button" href="/projects/import"><Icon name="git-branch" />Import a repository</Link>
        <Link className="button primary" href="/projects/new"><Icon name="plus" />New project</Link>
      </>} />
    {error && <Notice title="Projects could not be loaded">{error}. Check that the API is running.</Notice>}
    {loading && <ul className="project-grid" aria-busy="true" aria-label="Loading projects">{[0, 1, 2].map(i => <li key={i}><div className="project-card skeleton-card">
      <span className="skeleton" style={{ width: 44, height: 44, borderRadius: 13 }} />
      <span className="skeleton" style={{ width: "60%", height: 22, marginTop: 8 }} />
      <span className="skeleton" style={{ width: "90%", height: 14 }} />
      <span className="skeleton" style={{ width: "70%", height: 14 }} />
    </div></li>)}</ul>}
    {!loading && projects.length > 0 && <ul className="project-grid">{projects.map((project, index) => <li key={project.id} className="rise" style={{ "--i": index } as CSSProperties}>
      <Link className="project-card" href={`/projects/${project.id}`}>
        <div className="project-card-top"><span className="project-mark" aria-hidden="true">{project.name.slice(0, 1)}</span><span className="chip">{project.visibility}</span></div>
        <h2>{project.name}</h2>
        <p>{project.description || "No description yet."}</p>
        <div className="project-card-foot"><span className="mono">{project.slug}</span><span className="project-open">Open workspace<Icon name="arrow-right" /></span></div>
      </Link>
    </li>)}</ul>}
    {!loading && !error && projects.length === 0 && <section className="tile empty-state fade-in">
      <span className="empty-icon"><Icon name="layout-dashboard" size={22} /></span>
      <h2>Create your first project</h2>
      <p>Start with an empty project, or import a repository and review what Hydra finds in it.</p>
      <div className="empty-actions"><Link className="button" href="/projects/import"><Icon name="git-branch" />Import a repository</Link><Link className="button primary" href="/projects/new"><Icon name="plus" />New project</Link></div>
    </section>}
    {demo && !loading && !error && <ExampleProject exists={projects.some(project => project.name === EXAMPLE_PROJECT_NAME)} onCreated={load} />}
  </main>;
}
