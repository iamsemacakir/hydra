"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { SeverityPill } from "@/components/app/Status";
import { Component, Environment, getJson, OperationalEvent } from "@/lib/api";
import { formatWhen, formatWhenFull } from "@/lib/format";

const SEVERITIES = ["Info", "Warning", "Error", "Critical"];

export default function EventsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [environmentId, setEnvironmentId] = useState("");
  const [severity, setSeverity] = useState("");
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([getJson<Environment[]>(`/api/projects/${projectId}/environments`), getJson<Component[]>(`/api/projects/${projectId}/components`)]).then(([envs, parts]) => {
    setEnvironments(envs); setComponents(parts); setEnvironmentId(envs.find(e => e.type === "Production")?.id ?? envs[0]?.id ?? ""); if (envs.length === 0) setLoaded(true);
  }).catch(e => setError(e.message)); }, [projectId]);
  useEffect(() => { if (environmentId) getJson<OperationalEvent[]>(`/api/projects/${projectId}/environments/${environmentId}/events?limit=200`).then(setEvents).catch(e => setError(e.message)).finally(() => setLoaded(true)); }, [projectId, environmentId]);
  const componentName = (id: string | null) => components.find(c => c.id === id)?.name ?? "System";
  const shown = events.filter(e => !severity || e.severity === severity);
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Operate" title="Events" lede="Deployments, health changes and other operational events, newest first." />
    <div className="toolbar">
      <label>Environment <select value={environmentId} onChange={e => setEnvironmentId(e.target.value)}>{environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <label>Severity <select value={severity} onChange={e => setSeverity(e.target.value)}><option value="">All</option>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></label>
      <span className="toolbar-hint">{loaded ? `${shown.length} of ${events.length} events` : ""}</span>
    </div>
    {error && <Notice>{error}</Notice>}
    <section className="panel fade-in">
      {shown.length > 0 ? <ol className="feed">{shown.map(e => <li className="feed-item" key={e.id}><SeverityPill severity={e.severity} /><div><strong>{e.title}</strong><small>{componentName(e.componentId)} · <span className="mono">{e.type}</span> · <time dateTime={e.occurredAt} title={formatWhenFull(e.occurredAt)}>{formatWhen(e.occurredAt)}</time></small>{e.description && <p>{e.description}</p>}</div></li>)}</ol>
        : <p className="empty-line" style={{ borderTop: 0 }}>{loaded ? (events.length ? "No events with this severity." : "No events in this environment yet.") : "Loading events…"}</p>}
    </section>
  </main>;
}
