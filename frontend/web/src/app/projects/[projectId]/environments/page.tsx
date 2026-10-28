"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { FormEvent, useEffect, useState } from "react";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { Icon } from "@/components/landing/Icon";
import { Environment, getJson, postJson, Project, ProjectMember } from "@/lib/api";

const types = ["Development", "Testing", "Staging", "Production", "Custom"];

export default function EnvironmentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Development");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getJson<Project>(`/api/projects/${projectId}`), getJson<Environment[]>(`/api/projects/${projectId}/environments`),
      getJson<ProjectMember[]>(`/api/projects/${projectId}/members`), getJson<{ id: string }>("/api/me")])
      .then(([p, envs, members, me]) => { setProject(p); setEnvironments(envs);
        setCanEdit(members.some(member => member.userId === me.id && member.role !== "Viewer")); })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load environments."));
  }, [projectId]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const environment = await postJson<Environment>(`/api/projects/${projectId}/environments`, { name, type });
      setEnvironments(current => [...current, environment].sort((a, b) => a.name.localeCompare(b.name)));
      setName(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create environment."); }
  }
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Model" title="Environments" lede="The places your components run. Each one has its own map, deployments and health."
      actions={environments.length >= 2 && <Link className="button" href={`/projects/${projectId}/comparison`}><Icon name="git-compare-arrows" />Compare two</Link>} />
    {error && <Notice>{error}</Notice>}
    <div className="stack">
      {environments.length > 0 && <ul className="env-grid">{environments.map((environment, index) => <li key={environment.id} className="env-card rise" style={{ "--i": index } as CSSProperties}>
        <span className="chip" data-tone={environment.type === "Production" ? "accent" : undefined}>{environment.type}</span>
        <h2>{environment.name}</h2>
        <Link className="panel-link" href={`/projects/${projectId}/topology?environmentId=${environment.id}`}>Open its topology<Icon name="arrow-right" size={14} /></Link>
      </li>)}</ul>}
      {project && environments.length === 0 && <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="layers" size={22} /></span><h2>No environments yet</h2><p>Add Development, Staging or Production to start tracking where your components run.</p></section>}
      {canEdit && <section className="panel"><h2>Add an environment</h2><form className="inline-form" onSubmit={create}><label>Name<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Production" /></label><label>Type<select value={type} onChange={event => setType(event.target.value)}>{types.map(option => <option key={option}>{option}</option>)}</select></label><button className="button primary"><Icon name="plus" />Add environment</button></form></section>}
    </div>
  </main>;
}
