"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorNotice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { SkeletonRows } from "@/components/app/Skeleton";
import { DeploymentPill } from "@/components/app/Status";
import { Icon } from "@/components/landing/Icon";
import { Component, Deployment, Environment, getJson } from "@/lib/api";
import { formatWhen, formatWhenFull } from "@/lib/format";

export default function DeploymentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [environments, setEnvironments] = useState<Environment[] | null>(null);
  const [environmentId, setEnvironmentId] = useState("");
  const [components, setComponents] = useState<Component[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError(null);
    Promise.all([getJson<Environment[]>(`/api/projects/${projectId}/environments`), getJson<Component[]>(`/api/projects/${projectId}/components`)]).then(([envs, c]) => {
      setEnvironments(envs); setComponents(c);
      setEnvironmentId(current => current || (envs.find(e => e.type === "Production")?.id ?? envs[0]?.id ?? ""));
      if (envs.length === 0) setLoaded(true);
    }).catch(setError);
  }, [projectId, attempt]);
  useEffect(() => {
    if (!environmentId) return;
    setLoaded(false);
    getJson<Deployment[]>(`/api/projects/${projectId}/environments/${environmentId}/deployments`).then(list => { setDeployments(list); setLoaded(true); }).catch(setError);
  }, [projectId, environmentId, attempt]);
  const time = (value: string | null) => value ? <time dateTime={value} title={formatWhenFull(value)}>{formatWhen(value)}</time> : <span className="muted">—</span>;
  const environmentName = environments?.find(e => e.id === environmentId)?.name ?? "this environment";
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Operate" title="Deployments" lede="Every recorded deployment in an environment: which version of what, when, and how it went." />
    {environments && environments.length > 0 && <div className="toolbar">
      <label>Environment <select value={environmentId} onChange={e => setEnvironmentId(e.target.value)}>{environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <span className="toolbar-hint">{loaded ? `${deployments.length} deployments` : "Loading…"}</span>
    </div>}
    <ErrorNotice error={error} what="the deployments" onRetry={() => setAttempt(n => n + 1)} />
    {environments?.length === 0 && <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="rocket" size={22} /></span><h2>No environments yet</h2><p>Deployments go to an environment. Add one on the Environments page first.</p></section>}
    {environments && environments.length > 0 && !error && (loaded && deployments.length === 0
      ? <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="rocket" size={22} /></span><h2>No deployments in {environmentName} yet</h2><p>They appear here when your pipeline registers them through Hydra&apos;s API, with the version, the status and the times.</p></section>
      : <section className="panel table-panel stack-table fade-in" aria-busy={!loaded}><table><thead><tr><th>Component</th><th>Version</th><th>Status</th><th>Started</th><th>Completed</th></tr></thead>
        {!loaded ? <SkeletonRows columns={5} rows={6} />
          : <tbody>{deployments.map(d => <tr key={d.id}><td data-primary><strong>{components.find(c => c.id === d.componentId)?.name ?? d.componentId}</strong></td><td data-label="Version"><span className="version">{d.version}</span></td><td data-label="Status"><DeploymentPill status={d.status} /></td><td data-label="Started">{time(d.startedAt)}</td><td data-label="Completed">{time(d.completedAt)}</td></tr>)}</tbody>}
      </table></section>)}
  </main>;
}
