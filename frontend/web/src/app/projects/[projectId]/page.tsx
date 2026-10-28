"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { HealthBar, HealthLegend } from "@/components/app/HealthBar";
import { MapPreview } from "@/components/app/MapPreview";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { Stat } from "@/components/app/Stat";
import { SeverityPill, StatusGlyph, StatusPill, StatusText } from "@/components/app/Status";
import { Icon } from "@/components/landing/Icon";
import { Deployment, Environment, getJson, OperationalEvent, postJson, Project, ProjectActivity, Topology, WorkItem } from "@/lib/api";
import { formatWhen, formatWhenFull, plural } from "@/lib/format";
import { countHealth, deploymentLook, healthHeadline, healthLook, priorityTone, workStateLook } from "@/lib/status";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentId, setEnvironmentId] = useState("");
  const [topology, setTopology] = useState<Topology | null>(null);
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [error, setError] = useState("");
  const [environmentName, setEnvironmentName] = useState("");
  const [environmentType, setEnvironmentType] = useState("Development");
  async function createEnvironment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const environment = await postJson<Environment>(`/api/projects/${projectId}/environments`, { name: environmentName, type: environmentType });
      setEnvironments(current => [...current, environment]);
      setEnvironmentId(environment.id);
      setEnvironmentName("");
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create environment."); }
  }
  useEffect(() => {
    Promise.all([getJson<Project>(`/api/projects/${projectId}`), getJson<Environment[]>(`/api/projects/${projectId}/environments`),
      getJson<WorkItem[]>(`/api/projects/${projectId}/work-items`), getJson<ProjectActivity[]>(`/api/projects/${projectId}/activity?limit=8`)])
      .then(([p, envs, work, feed]) => { setProject(p); setEnvironments(envs); setWorkItems(work); setActivity(feed);
        setEnvironmentId(envs.find(e => e.type === "Production")?.id ?? envs[0]?.id ?? ""); })
      .catch(e => setError(e.message));
  }, [projectId]);
  useEffect(() => {
    if (!environmentId) return;
    setTopology(null);
    Promise.all([
      getJson<Topology>(`/api/projects/${projectId}/environments/${environmentId}/topology`),
      getJson<OperationalEvent[]>(`/api/projects/${projectId}/environments/${environmentId}/events?limit=5`),
      getJson<Deployment[]>(`/api/projects/${projectId}/environments/${environmentId}/deployments`)
    ]).then(([t, e, d]) => { setTopology(t); setEvents(e); setDeployments(d.slice(0, 5)); }).catch(e => setError(e.message));
  }, [projectId, environmentId]);

  const environment = environments.find(e => e.id === environmentId);
  const counts = countHealth(topology?.nodes ?? []);
  const attentionNodes = topology?.nodes.filter(n => n.health === "Degraded" || n.health === "Unhealthy") ?? [];
  const openWork = workItems.filter(item => item.state !== "Closed" && item.state !== "Removed");
  const activeBugs = openWork.filter(item => item.type === "Bug" && item.state === "Active").length;
  const componentName = (id: string | null) => topology?.nodes.find(n => n.id === id)?.name ?? "System";
  const topologyHref = (componentId?: string) => `/projects/${projectId}/topology?environmentId=${environmentId}${componentId ? `&componentId=${componentId}` : ""}`;
  const total = topology?.nodes.length ?? 0;
  // A project without environments has no health, events or deployments yet: show only what applies.
  const hasEnvironments = !project || environments.length > 0;

  return <main id="main" className="ws-page">
    <PageHead eyebrow="Overview" title={project?.name ?? "Loading…"} lede={project ? (project.description || "No description yet. Add one in Settings.") : undefined}
      actions={environments.length > 0 && <>
        <label className="sr-only" htmlFor="overview-environment">Environment</label>
        <select id="overview-environment" value={environmentId} onChange={e => setEnvironmentId(e.target.value)}>{environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <Link className="button primary" href={topologyHref()}><Icon name="network" />Open topology<Icon name="arrow-right" className="arrow" /></Link>
      </>} />
    {error && <Notice>{error}</Notice>}
    {project && environments.length === 0 && <section className="panel callout fade-in"><div><h2>Add your first environment</h2><p className="panel-note">This project is empty. Add an environment, such as Production, to start tracking its components, deployments and health.</p></div>
      <form className="inline-form" onSubmit={createEnvironment}><label>Name<input required minLength={2} maxLength={120} value={environmentName} onChange={e => setEnvironmentName(e.target.value)} placeholder="e.g. Production" /></label><label>Type<select value={environmentType} onChange={e => setEnvironmentType(e.target.value)}>{["Development", "Testing", "Staging", "Production", "Custom"].map(type => <option key={type}>{type}</option>)}</select></label><button className="button primary"><Icon name="plus" />Add environment</button></form></section>}

    <div className="stack">
      {environmentId && <section className="tile ov-status rise" aria-labelledby="ov-status-title">
        <div className="ov-status-text">
          <p className="eyebrow">{environment?.name ?? "Environment"} · health</p>
          <h2 id="ov-status-title">{topology ? healthHeadline(counts) : "Loading health…"}</h2>
          {topology && <p className="panel-note">{plural(total, "component")} · {plural(topology.edges.length, "dependency", "dependencies")} · updated <time dateTime={topology.generatedAt} title={formatWhenFull(topology.generatedAt)}>{formatWhen(topology.generatedAt)}</time></p>}
          {topology && total > 0 && <>
            {attentionNodes.length > 0
              ? <ul className="attention">{attentionNodes.map(node => { const look = healthLook(node.health); return <li key={node.id}><Link className="attention-item" data-tone={look.tone} href={topologyHref(node.id)}>
                  <StatusPill look={look} /><span><strong>{node.name}</strong><small>{node.type}{node.version ? ` · ${node.version}` : ""}</small></span><Icon name="arrow-right" />
                </Link></li>; })}</ul>
              : <p className="all-clear" data-tone="ok"><StatusGlyph glyph="check" />Nothing needs attention right now.</p>}
            <div className="health-block">
              <HealthBar counts={counts} />
              <HealthLegend counts={counts} />
            </div>
          </>}
        </div>
        <MapPreview topology={topology} href={topologyHref()} environmentName={environment?.name ?? ""} />
      </section>}

      {hasEnvironments && <div className="stats rise" style={{ margin: 0 }}>
        <Stat icon="square-kanban" value={openWork.length} label="Open work items" />
        <Stat icon="bug" value={activeBugs} label="Active bugs" tone={activeBugs > 0 ? "bad" : undefined} />
        <Stat icon="box" value={topology?.nodes.length ?? "—"} label="Components" />
        <Stat icon="git-branch" value={topology?.edges.length ?? "—"} label="Dependencies" />
        <Stat icon="activity" value={topology ? attentionNodes.length : "—"} label="Need attention" tone={!topology ? undefined : counts.Unhealthy > 0 ? "bad" : attentionNodes.length > 0 ? "warn" : "ok"} />
      </div>}

      {hasEnvironments && <div className="two-col">
        <section className="panel"><div className="panel-head"><h2>Recent events</h2><Link className="panel-link" href={`/projects/${projectId}/events`}>All events<Icon name="arrow-right" size={14} /></Link></div>
          {events.length > 0 ? <ol className="feed">{events.map(e => <li className="feed-item" key={e.id}><SeverityPill severity={e.severity} /><div><strong>{e.title}</strong><small>{componentName(e.componentId)} · <time dateTime={e.occurredAt} title={formatWhenFull(e.occurredAt)}>{formatWhen(e.occurredAt)}</time></small></div></li>)}</ol>
            : <p className="empty-line">No events in this environment yet.</p>}
        </section>
        <section className="panel"><div className="panel-head"><h2>Recent deployments</h2><Link className="panel-link" href={`/projects/${projectId}/deployments`}>All deployments<Icon name="arrow-right" size={14} /></Link></div>
          {deployments.length > 0 ? <ol className="feed">{deployments.map(d => <li className="feed-item" key={d.id}><span className="version">{d.version}</span><div><strong>{componentName(d.componentId)}</strong><small><StatusText look={deploymentLook(d.status)} /> · <time dateTime={d.startedAt} title={formatWhenFull(d.startedAt)}>{formatWhen(d.startedAt)}</time></small></div></li>)}</ol>
            : <p className="empty-line">No deployments recorded in this environment yet.</p>}
        </section>
      </div>}

      <div className="two-col">
        <section className="panel"><div className="panel-head"><h2>Open work</h2><Link className="panel-link" href={`/projects/${projectId}/boards`}>Open board<Icon name="arrow-right" size={14} /></Link></div>
          {openWork.length > 0 ? <ol className="feed">{openWork.slice(0, 5).map(item => <li className="feed-item" key={item.id}><span className="version">#{item.sequenceNumber}</span><div><strong>{item.title}</strong><small>{item.type === "UserStory" ? "Story" : item.type} · <StatusText look={workStateLook(item.state)} /> · <span className="priority" data-tone={priorityTone(item.priority)}>{item.priority}</span></small></div></li>)}</ol>
            : <p className="empty-line">No open work items. Create one from the board.</p>}
        </section>
        <section className="panel"><div className="panel-head"><h2>Recent activity</h2></div>
          {activity.length > 0 ? <ol className="feed">{activity.map(entry => <li className="feed-item" key={entry.id}><span className="chip" data-tone={entry.kind === "WorkItem" ? "accent" : "neutral"}>{entry.kind === "WorkItem" ? "Work" : "Operations"}</span><div><strong>{entry.summary}</strong><small>{entry.actorName ? `${entry.actorName} · ` : ""}<time dateTime={entry.occurredAt} title={formatWhenFull(entry.occurredAt)}>{formatWhen(entry.occurredAt)}</time></small></div></li>)}</ol>
            : <p className="empty-line">No project activity yet.</p>}
        </section>
      </div>
    </div>
  </main>;
}
