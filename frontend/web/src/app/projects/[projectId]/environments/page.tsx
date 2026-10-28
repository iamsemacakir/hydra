"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { HealthBar, HealthLegend } from "@/components/app/HealthBar";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { StatusPill } from "@/components/app/Status";
import { Icon } from "@/components/landing/Icon";
import { Environment, getJson, postJson, Project, ProjectMember, Topology } from "@/lib/api";
import { countHealth, healthHeadline, healthLook } from "@/lib/status";

const types = ["Development", "Testing", "Staging", "Production", "Custom"];

/** The recorded health of one environment, read from its topology. */
type HealthState = { status: "loading" } | { status: "error" } | { status: "loaded"; topology: Topology };

/** How many components needing attention a card names before it says "and N more". */
const ATTENTION_SHOWN = 3;

export default function EnvironmentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [health, setHealth] = useState<Record<string, HealthState>>({});
  const [canEdit, setCanEdit] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Development");
  const [error, setError] = useState("");

  const loadHealth = useCallback((environmentId: string) => {
    setHealth(current => ({ ...current, [environmentId]: { status: "loading" } }));
    getJson<Topology>(`/api/projects/${projectId}/environments/${environmentId}/topology`)
      .then(topology => setHealth(current => ({ ...current, [environmentId]: { status: "loaded", topology } })))
      .catch(() => setHealth(current => ({ ...current, [environmentId]: { status: "error" } })));
  }, [projectId]);

  useEffect(() => {
    Promise.all([getJson<Project>(`/api/projects/${projectId}`), getJson<Environment[]>(`/api/projects/${projectId}/environments`),
      getJson<ProjectMember[]>(`/api/projects/${projectId}/members`), getJson<{ id: string }>("/api/me")])
      .then(([p, envs, members, me]) => { setProject(p); setEnvironments(envs);
        setCanEdit(members.some(member => member.userId === me.id && member.role !== "Viewer"));
        envs.forEach(environment => loadHealth(environment.id)); })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load environments."));
  }, [projectId, loadHealth]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const environment = await postJson<Environment>(`/api/projects/${projectId}/environments`, { name, type });
      setEnvironments(current => [...current, environment].sort((a, b) => a.name.localeCompare(b.name)));
      loadHealth(environment.id);
      setName(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create environment."); }
  }
  const topologyHref = (environmentId: string, componentId?: string) =>
    `/projects/${projectId}/topology?environmentId=${environmentId}${componentId ? `&componentId=${componentId}` : ""}`;

  return <main id="main" className="ws-page">
    <PageHead eyebrow="Model" title="Environments" lede="The places your components run. Each one has its own map, deployments and health."
      actions={environments.length >= 2 && <Link className="button" href={`/projects/${projectId}/comparison`}><Icon name="git-compare-arrows" />Compare two</Link>} />
    {error && <Notice>{error}</Notice>}
    <div className="stack">
      {environments.length > 0 && <ul className="env-grid">{environments.map((environment, index) => <li key={environment.id} className="env-card rise" style={{ "--i": index } as CSSProperties}>
        <span className="chip" data-tone={environment.type === "Production" ? "accent" : undefined}>{environment.type}</span>
        <h2>{environment.name}</h2>
        <EnvironmentHealth state={health[environment.id]} componentHref={componentId => topologyHref(environment.id, componentId)} />
        <Link className="panel-link" href={topologyHref(environment.id)}>Open its topology<Icon name="arrow-right" size={14} /></Link>
      </li>)}</ul>}
      {project && environments.length === 0 && <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="layers" size={22} /></span><h2>No environments yet</h2><p>Add Development, Staging or Production to start tracking where your components run.</p></section>}
      {canEdit && <section className="panel"><h2>Add an environment</h2><form className="inline-form" onSubmit={create}><label>Name<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Production" /></label><label>Type<select value={type} onChange={event => setType(event.target.value)}>{types.map(option => <option key={option}>{option}</option>)}</select></label><button className="button primary"><Icon name="plus" />Add environment</button></form></section>}
    </div>
  </main>;
}

/**
 * One sentence about the environment's recorded health, the health bar, the counts, and the components
 * that need attention (each opens the topology with that component selected). Records only, no prediction.
 */
function EnvironmentHealth({ state, componentHref }: { state: HealthState | undefined; componentHref: (componentId: string) => string }) {
  if (!state || state.status === "loading") {
    return <div className="env-health" aria-busy="true"><p className="env-headline muted">Loading health…</p><span className="skeleton env-skeleton" /></div>;
  }
  if (state.status === "error") return <div className="env-health"><p className="env-headline muted">Health could not be loaded.</p></div>;
  const counts = countHealth(state.topology.nodes);
  const total = state.topology.nodes.length;
  const attention = state.topology.nodes.filter(node => node.health === "Degraded" || node.health === "Unhealthy");
  return <div className="env-health fade-in">
    <p className="env-headline">{healthHeadline(counts)}</p>
    {total > 0 && <><HealthBar counts={counts} /><HealthLegend counts={counts} compact /></>}
    {attention.length > 0 && <ul className="env-attention" aria-label="Components that need attention">
      {attention.slice(0, ATTENTION_SHOWN).map(node => {
        const look = healthLook(node.health);
        return <li key={node.id}><Link href={componentHref(node.id)} title={`Open ${node.name} on the topology`}><StatusPill look={look} label={`${node.name} · ${look.label.toLowerCase()}`} /></Link></li>;
      })}
      {attention.length > ATTENTION_SHOWN && <li className="muted">and {attention.length - ATTENTION_SHOWN} more</li>}
    </ul>}
  </div>;
}
