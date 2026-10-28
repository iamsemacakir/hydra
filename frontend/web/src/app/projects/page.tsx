"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getJson, Project } from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { getJson<Project[]>("/api/projects").then(setProjects).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <main className="page">
    <div className="eyebrow">HYDRA / SYSTEMS</div>
    <div className="page-heading"><div><h1>Projects</h1><p className="lede">One view of lifecycle metadata, runtime health, and dependency impact.</p></div><div className="inline-form"><Link className="button" href="/projects/import">Import existing project</Link><Link className="button primary" href="/projects/new">New project</Link></div></div>
    {error && <p className="error">{error}. Check that the API is running.</p>}
    <div className="project-grid">{projects.map(project => <Link className="project-card" href={`/projects/${project.id}`} key={project.id}>
      <div className="card-mark">{project.name.slice(0, 1)}</div><div><h2>{project.name}</h2><p>{project.description}</p><span>Open workspace →</span></div>
    </Link>)}</div>
    {loading && <p className="muted">Loading projects…</p>}
    {!loading && !error && projects.length === 0 && <div className="panel empty-state"><h2>No projects yet</h2><p className="muted">Create a project to start organizing environments, components, and work.</p><Link className="button primary" href="/projects/new">Create project</Link></div>}
  </main>;
}
