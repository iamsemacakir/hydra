"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NoResults } from "@/components/app/NoResults";
import { ErrorNotice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { SkeletonFeed } from "@/components/app/Skeleton";
import { SeverityPill } from "@/components/app/Status";
import { Icon } from "@/components/landing/Icon";
import { Component, Environment, getJson, OperationalEvent } from "@/lib/api";
import { formatWhen, formatWhenFull } from "@/lib/format";

const SEVERITIES = ["Info", "Warning", "Error", "Critical"];

export default function EventsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [environments, setEnvironments] = useState<Environment[] | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [environmentId, setEnvironmentId] = useState("");
  const [severity, setSeverity] = useState("");
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError(null);
    Promise.all([getJson<Environment[]>(`/api/projects/${projectId}/environments`), getJson<Component[]>(`/api/projects/${projectId}/components`)]).then(([envs, parts]) => {
      setEnvironments(envs); setComponents(parts);
      setEnvironmentId(current => current || (envs.find(e => e.type === "Production")?.id ?? envs[0]?.id ?? ""));
      if (envs.length === 0) setLoaded(true);
    }).catch(setError);
  }, [projectId, attempt]);
  useEffect(() => {
    if (!environmentId) return;
    setLoaded(false);
    getJson<OperationalEvent[]>(`/api/projects/${projectId}/environments/${environmentId}/events?limit=200`).then(list => { setEvents(list); setLoaded(true); }).catch(setError);
  }, [projectId, environmentId, attempt]);
  const componentName = (id: string | null) => components.find(c => c.id === id)?.name ?? "System";
  const environmentName = environments?.find(e => e.id === environmentId)?.name ?? "this environment";
  const shown = events.filter(e => !severity || e.severity === severity);
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Operate" title="Events" lede="Deployments, health changes and other operational events, newest first." />
    {environments && environments.length > 0 && <div className="toolbar">
      <label>Environment <select value={environmentId} onChange={e => setEnvironmentId(e.target.value)}>{environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <label>Severity <select value={severity} onChange={e => setSeverity(e.target.value)}><option value="">All</option>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></label>
      <span className="toolbar-hint">{loaded ? `${shown.length} of ${events.length} events` : "Loading…"}</span>
    </div>}
    <ErrorNotice error={error} what="the events" onRetry={() => setAttempt(n => n + 1)} />
    {environments?.length === 0 && <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="activity" size={22} /></span><h2>No environments yet</h2><p>Events belong to an environment. Add one on the Environments page; its deployments and health changes will show up here.</p></section>}
    {environments && environments.length > 0 && !error && <section className="panel fade-in" aria-busy={!loaded}>
      {!loaded ? <SkeletonFeed rows={5} />
        : shown.length > 0 ? <ol className="feed">{shown.map(e => <li className="feed-item" key={e.id}><SeverityPill severity={e.severity} /><div><strong>{e.title}</strong><small>{componentName(e.componentId)} · <span className="mono">{e.type}</span> · <time dateTime={e.occurredAt} title={formatWhenFull(e.occurredAt)}>{formatWhen(e.occurredAt)}</time></small>{e.description && <p>{e.description}</p>}</div></li>)}</ol>
        : events.length > 0 ? <NoResults what={`${severity.toLowerCase()} events`} onClear={() => setSeverity("")} />
        : <div className="empty-state" style={{ padding: "36px 12px" }}><span className="empty-icon"><Icon name="activity" size={22} /></span><p className="empty-title">No events in {environmentName} yet</p><p>Events appear when a deployment is registered or a component reports a health change.</p></div>}
    </section>}
  </main>;
}
