"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { HealthPill } from "@/components/app/Status";
import { Icon } from "@/components/landing/Icon";
import { Environment, EnvironmentComparison, getJson, type Health } from "@/lib/api";

function Side({ hasData, version, health }: { hasData: boolean; version: string | null; health: Health | null }) {
  if (!hasData) return <span className="muted">No record</span>;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{version ? <span className="version">{version}</span> : <span className="muted">No version</span>}<HealthPill health={health} size="sm" /></span>;
}

export default function ComparisonPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [comparison, setComparison] = useState<EnvironmentComparison | null>(null);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getJson<Environment[]>(`/api/projects/${projectId}/environments`)
      .then(envs => { setEnvironments(envs); setLeft(envs[0]?.id ?? ""); setRight(envs[1]?.id ?? ""); })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load environments."))
      .finally(() => setLoaded(true));
  }, [projectId]);
  useEffect(() => {
    if (!left || !right || left === right) { setComparison(null); return; }
    let current = true;
    getJson<EnvironmentComparison>(`/api/projects/${projectId}/environment-comparison?leftEnvironmentId=${left}&rightEnvironmentId=${right}`)
      .then(data => { if (current) { setComparison(data); setError(""); } })
      .catch(cause => { if (current) setError(cause instanceof Error ? cause.message : "Unable to compare environments."); });
    return () => { current = false; };
  }, [projectId, left, right]);

  const rows = comparison?.components.filter(component => !differencesOnly || component.different) ?? [];
  const differences = comparison?.components.filter(component => component.different).length ?? 0;
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Operate" title="Compare environments" lede="See where recorded versions and health differ between two environments." />
    {error && <Notice>{error}</Notice>}
    {loaded && environments.length < 2 && <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="git-compare-arrows" size={22} /></span><h2>Two environments are needed</h2><p>Add another environment, then come back to compare them.</p><Link className="button primary" href={`/projects/${projectId}/environments`}><Icon name="plus" />Add an environment</Link></section>}
    {environments.length >= 2 && <div className="toolbar">
      <label>Compare <select value={left} onChange={event => setLeft(event.target.value)}>{environments.map(environment => <option value={environment.id} key={environment.id}>{environment.name}</option>)}</select></label>
      <label>with <select value={right} onChange={event => setRight(event.target.value)}>{environments.map(environment => <option value={environment.id} key={environment.id}>{environment.name}</option>)}</select></label>
      <span className="toolbar-spacer" />
      <label className="check-label"><input type="checkbox" checked={differencesOnly} onChange={event => setDifferencesOnly(event.target.checked)} />Differences only</label>
    </div>}
    {left === right && left && <Notice tone="info">Choose two different environments.</Notice>}
    {comparison && <section className="panel table-panel fade-in">
      <p className="muted">{differences === 0 ? "No recorded differences." : `${differences} of ${comparison.components.length} components differ.`} A record means a deployment or a runtime report exists; no record does not prove a component is missing. The {comparison.declaredDependencyCount} declared dependencies belong to the whole project, so both environments share them.</p>
      <table><thead><tr><th>Component</th><th>{comparison.leftEnvironmentName}</th><th>{comparison.rightEnvironmentName}</th><th>Result</th></tr></thead>
        <tbody>{rows.map(component => <tr key={component.componentId}><td><strong>{component.name}</strong></td>
          <td><Side hasData={component.leftHasData} version={component.leftVersion} health={component.leftHealth} /></td>
          <td><Side hasData={component.rightHasData} version={component.rightVersion} health={component.rightHealth} /></td>
          <td>{component.different ? <span className="chip" data-tone="warn">Different</span> : <span className="muted">Same</span>}</td></tr>)}</tbody></table>
      {rows.length === 0 && <p className="muted">{differencesOnly ? "No recorded differences." : "No components yet."}</p>}
    </section>}
  </main>;
}
