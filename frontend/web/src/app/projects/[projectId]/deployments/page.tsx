"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { DeploymentPill } from "@/components/app/Status";
import { Component, Deployment, Environment, getJson } from "@/lib/api";
import { formatWhen, formatWhenFull } from "@/lib/format";

export default function DeploymentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentId, setEnvironmentId] = useState("");
  const [components, setComponents] = useState<Component[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([getJson<Environment[]>(`/api/projects/${projectId}/environments`), getJson<Component[]>(`/api/projects/${projectId}/components`)]).then(([envs, c]) => {
    setEnvironments(envs); setComponents(c); setEnvironmentId(envs.find(e => e.type === "Production")?.id ?? envs[0]?.id ?? ""); if (envs.length === 0) setLoaded(true);
  }).catch(e => setError(e.message)); }, [projectId]);
  useEffect(() => { if (environmentId) getJson<Deployment[]>(`/api/projects/${projectId}/environments/${environmentId}/deployments`).then(setDeployments).catch(e => setError(e.message)).finally(() => setLoaded(true)); }, [projectId, environmentId]);
  const time = (value: string | null) => value ? <time dateTime={value} title={formatWhenFull(value)}>{formatWhen(value)}</time> : <span className="muted">—</span>;
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Operate" title="Deployments" lede="Every recorded deployment in an environment: which version of what, when, and how it went." />
    <div className="toolbar">
      <label>Environment <select value={environmentId} onChange={e => setEnvironmentId(e.target.value)}>{environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <span className="toolbar-hint">{loaded ? `${deployments.length} deployments` : ""}</span>
    </div>
    {error && <Notice>{error}</Notice>}
    <section className="panel table-panel stack-table fade-in"><table><thead><tr><th>Component</th><th>Version</th><th>Status</th><th>Started</th><th>Completed</th></tr></thead>
      <tbody>{deployments.map(d => <tr key={d.id}><td data-primary><strong>{components.find(c => c.id === d.componentId)?.name ?? d.componentId}</strong></td><td data-label="Version"><span className="version">{d.version}</span></td><td data-label="Status"><DeploymentPill status={d.status} /></td><td data-label="Started">{time(d.startedAt)}</td><td data-label="Completed">{time(d.completedAt)}</td></tr>)}</tbody></table>
      {deployments.length === 0 && <p className="muted">{loaded ? "No deployments recorded in this environment yet." : "Loading deployments…"}</p>}</section>
  </main>;
}
