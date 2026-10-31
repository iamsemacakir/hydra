"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FieldError, useFormErrors } from "@/components/app/FormErrors";
import { HealthBar, HealthLegend } from "@/components/app/HealthBar";
import { MapPreview } from "@/components/app/MapPreview";
import { ErrorNotice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { useProjectAccess } from "@/components/app/ProjectContext";
import { SkeletonBar, SkeletonFeed } from "@/components/app/Skeleton";
import { useToast } from "@/components/app/Toaster";
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
  const [loaded, setLoaded] = useState(false);
  const [environmentLoaded, setEnvironmentLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [environmentName, setEnvironmentName] = useState("");
  const [environmentType, setEnvironmentType] = useState("Development");
  const form = useFormErrors();
  const toast = useToast();
  const { role } = useProjectAccess();
  async function createEnvironment() {
    try {
      const environment = await postJson<Environment>(`/api/projects/${projectId}/environments`, { name: environmentName, type: environmentType });
      setEnvironments(current => [...current, environment]);
      setEnvironmentId(environment.id);
      setEnvironmentName("");
      setError(null);
      toast({ title: `${environment.name} added`, text: "Add components to it, or import a repository, to draw its map.", action: { label: "Add components", href: `/projects/${projectId}/components` } });
    } catch (cause) { if (!form.handleApiError(cause, ["name", "type"], "name")) setError(cause); }
  }
  useEffect(() => {
    setError(null);
    Promise.all([getJson<Project>(`/api/projects/${projectId}`), getJson<Environment[]>(`/api/projects/${projectId}/environments`),
      getJson<WorkItem[]>(`/api/projects/${projectId}/work-items`), getJson<ProjectActivity[]>(`/api/projects/${projectId}/activity?limit=8`)])
      .then(([p, envs, work, feed]) => { setProject(p); setEnvironments(envs); setWorkItems(work); setActivity(feed); setLoaded(true);
        setEnvironmentId(current => current || (envs.find(e => e.type === "Production")?.id ?? envs[0]?.id ?? "")); })
      .catch(setError);
  }, [projectId, attempt]);
  useEffect(() => {
    if (!environmentId) return;
    setTopology(null);
    setEnvironmentLoaded(false);
    Promise.all([
      getJson<Topology>(`/api/projects/${projectId}/environments/${environmentId}/topology`),
      getJson<OperationalEvent[]>(`/api/projects/${projectId}/environments/${environmentId}/events?limit=5`),
      getJson<Deployment[]>(`/api/projects/${projectId}/environments/${environmentId}/deployments`)
    ]).then(([t, e, d]) => { setTopology(t); setEvents(e); setDeployments(d.slice(0, 5)); setEnvironmentLoaded(true); }).catch(setError);
  }, [projectId, environmentId, attempt]);

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
  // When the first load fails there is nothing to wait for: show the error and a way to retry, not placeholders.
  const failed = !!error && !loaded;

  return <main id="main" className="ws-page">
    <PageHead eyebrow="Overview" title={project?.name ?? (failed ? "Project overview" : "Loading…")} lede={project ? (project.description || "No description yet. Add one in Settings.") : undefined}
      actions={environments.length > 0 && <>
        <label className="sr-only" htmlFor="overview-environment">Environment</label>
        <select id="overview-environment" value={environmentId} onChange={e => setEnvironmentId(e.target.value)}>{environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <Link className="button primary" href={topologyHref()}><Icon name="network" />Open topology<Icon name="arrow-right" className="arrow" /></Link>
      </>} />
    <ErrorNotice error={error} what="this project" onRetry={() => setAttempt(n => n + 1)} />
    {project && environments.length === 0 && <section className="panel callout fade-in"><div><h2>Add your first environment</h2><p className="panel-note">{role === "Viewer"
        ? "This project has no environments yet. A contributor can add one, such as Production, to start tracking its components, deployments and health."
        : "This project is empty. Add an environment, such as Production, to start tracking its components, deployments and health."}</p></div>
      {role !== "Viewer" && <form className="inline-form" noValidate onSubmit={form.onSubmit(createEnvironment)} onBlur={form.onBlur} onChange={form.onChange}>
        <label>Name<input {...form.field("name")} required minLength={2} maxLength={120} value={environmentName} onChange={e => setEnvironmentName(e.target.value)} placeholder="e.g. Production" /><FieldError form={form} name="name" /></label>
        <label>Type<select {...form.field("type")} value={environmentType} onChange={e => setEnvironmentType(e.target.value)}>{["Development", "Testing", "Staging", "Production", "Custom"].map(type => <option key={type}>{type}</option>)}</select></label>
        <button className="button primary"><Icon name="plus" />Add environment</button></form>}</section>}

    {!failed && <div className="stack">
      {environmentId && <section className="tile ov-status rise" aria-labelledby="ov-status-title">
        <div className="ov-status-text">
          <p className="eyebrow">{environment?.name ?? "Environment"} · health</p>
          <h2 id="ov-status-title">{topology ? healthHeadline(counts) : <><span className="sr-only">Loading health…</span><SkeletonBar width="62%" height={26} /></>}</h2>
          {!topology && <div className="panel-skeleton" aria-hidden="true" style={{ marginTop: 14 }}><SkeletonBar width="48%" height={13} /><SkeletonBar width="100%" height={46} style={{ marginTop: 12, borderRadius: 14 }} /></div>}
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
        <Stat icon="square-kanban" value={loaded ? openWork.length : "—"} label="Open work items" />
        <Stat icon="bug" value={loaded ? activeBugs : "—"} label="Active bugs" tone={activeBugs > 0 ? "bad" : undefined} />
        <Stat icon="box" value={topology?.nodes.length ?? "—"} label="Components" />
        <Stat icon="git-branch" value={topology?.edges.length ?? "—"} label="Dependencies" />
        <Stat icon="activity" value={topology ? attentionNodes.length : "—"} label="Need attention" tone={!topology ? undefined : counts.Unhealthy > 0 ? "bad" : attentionNodes.length > 0 ? "warn" : "ok"} />
      </div>}

      {hasEnvironments && <div className="two-col">
        <section className="panel"><div className="panel-head"><h2>Recent events</h2><Link className="panel-link" href={`/projects/${projectId}/events`}>All events<Icon name="arrow-right" size={14} /></Link></div>
          {!environmentLoaded ? <SkeletonFeed rows={3} /> : events.length > 0 ? <ol className="feed">{events.map(e => <li className="feed-item" key={e.id}><SeverityPill severity={e.severity} /><div><strong>{e.title}</strong><small>{componentName(e.componentId)} · <time dateTime={e.occurredAt} title={formatWhenFull(e.occurredAt)}>{formatWhen(e.occurredAt)}</time></small></div></li>)}</ol>
            : <p className="empty-line">No events in {environment?.name ?? "this environment"} yet. They appear when a deployment is registered or a health change is reported.</p>}
        </section>
        <section className="panel"><div className="panel-head"><h2>Recent deployments</h2><Link className="panel-link" href={`/projects/${projectId}/deployments`}>All deployments<Icon name="arrow-right" size={14} /></Link></div>
          {!environmentLoaded ? <SkeletonFeed rows={3} /> : deployments.length > 0 ? <ol className="feed">{deployments.map(d => <li className="feed-item" key={d.id}><span className="version">{d.version}</span><div><strong>{componentName(d.componentId)}</strong><small><StatusText look={deploymentLook(d.status)} /> · <time dateTime={d.startedAt} title={formatWhenFull(d.startedAt)}>{formatWhen(d.startedAt)}</time></small></div></li>)}</ol>
            : <p className="empty-line">No deployments in {environment?.name ?? "this environment"} yet. They appear when your pipeline registers them through Hydra's API.</p>}
        </section>
      </div>}

      <div className="two-col">
        <section className="panel"><div className="panel-head"><h2>Open work</h2><Link className="panel-link" href={`/projects/${projectId}/boards`}>Open board<Icon name="arrow-right" size={14} /></Link></div>
          {!loaded ? <SkeletonFeed rows={3} /> : openWork.length > 0 ? <ol className="feed">{openWork.slice(0, 5).map(item => <li className="feed-item" key={item.id}><span className="version">#{item.sequenceNumber}</span><div><strong>{item.title}</strong><small>{item.type === "UserStory" ? "Story" : item.type} · <StatusText look={workStateLook(item.state)} /> · <span className="priority" data-tone={priorityTone(item.priority)}>{item.priority}</span></small></div></li>)}</ol>
            : <p className="empty-line">No open work. <Link className="panel-link" href={`/projects/${projectId}/boards`}>Create a work item on the board</Link></p>}
        </section>
        <section className="panel"><div className="panel-head"><h2>Recent activity</h2></div>
          {!loaded ? <SkeletonFeed rows={3} /> : activity.length > 0 ? <ol className="feed">{activity.map(entry => <li className="feed-item" key={entry.id}><span className="chip" data-tone={entry.kind === "WorkItem" ? "accent" : "neutral"}>{entry.kind === "WorkItem" ? "Work" : "Operations"}</span><div><strong>{entry.summary}</strong><small>{entry.actorName ? `${entry.actorName} · ` : ""}<time dateTime={entry.occurredAt} title={formatWhenFull(entry.occurredAt)}>{formatWhen(entry.occurredAt)}</time></small></div></li>)}</ol>
            : <p className="empty-line">No activity yet. Changes to work items and operational events show up here.</p>}
        </section>
      </div>
    </div>}
  </main>;
}
