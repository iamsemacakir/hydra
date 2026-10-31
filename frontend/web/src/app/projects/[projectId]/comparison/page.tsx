"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorNotice, Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { SkeletonRows } from "@/components/app/Skeleton";
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
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    setError(null);
    getJson<Environment[]>(`/api/projects/${projectId}/environments`)
      .then(envs => { setEnvironments(envs); setLeft(current => current || (envs[0]?.id ?? "")); setRight(current => current || (envs[1]?.id ?? "")); setLoaded(true); })
      .catch(setError);
  }, [projectId, attempt]);
  useEffect(() => {
    if (!left || !right || left === right) { setComparison(null); return; }
    let current = true;
    setComparing(true);
    getJson<EnvironmentComparison>(`/api/projects/${projectId}/environment-comparison?leftEnvironmentId=${left}&rightEnvironmentId=${right}`)
      .then(data => { if (current) { setComparison(data); setError(null); } })
      .catch(cause => { if (current) setError(cause); })
      .finally(() => { if (current) setComparing(false); });
    return () => { current = false; };
  }, [projectId, left, right, attempt]);

  const rows = comparison?.components.filter(component => !differencesOnly || component.different) ?? [];
  const differences = comparison?.components.filter(component => component.different).length ?? 0;
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Operate" title="Compare environments" lede="See where recorded versions and health differ between two environments." />
    <ErrorNotice error={error} what="the comparison" onRetry={() => setAttempt(n => n + 1)} />
    {loaded && environments.length < 2 && <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="git-compare-arrows" size={22} /></span><h2>Two environments are needed</h2><p>Add another environment, then come back to compare them.</p><Link className="button primary" href={`/projects/${projectId}/environments`}><Icon name="plus" />Add an environment</Link></section>}
    {environments.length >= 2 && <div className="toolbar">
      <label>Compare <select value={left} onChange={event => setLeft(event.target.value)}>{environments.map(environment => <option value={environment.id} key={environment.id}>{environment.name}</option>)}</select></label>
      <label>with <select value={right} onChange={event => setRight(event.target.value)}>{environments.map(environment => <option value={environment.id} key={environment.id}>{environment.name}</option>)}</select></label>
      <span className="toolbar-spacer" />
      <label className="check-label"><input type="checkbox" checked={differencesOnly} onChange={event => setDifferencesOnly(event.target.checked)} />Differences only</label>
    </div>}
    {left === right && left && <Notice tone="info">Choose two different environments to compare.</Notice>}
    {!comparison && !error && (!loaded || comparing) && <section className="panel table-panel" aria-busy="true" aria-label="Comparing"><table><thead><tr><th>Component</th><th>Left</th><th>Right</th><th>Result</th></tr></thead><SkeletonRows columns={4} rows={6} /></table></section>}
    {comparison && <section className="panel table-panel stack-table fade-in">
      <p className="muted">{differences === 0 ? "No recorded differences." : `${differences} of ${comparison.components.length} components differ.`} A record means a deployment or a runtime report exists; no record does not prove a component is missing. The {comparison.declaredDependencyCount} declared dependencies belong to the whole project, so both environments share them.</p>
      <table><thead><tr><th>Component</th><th>{comparison.leftEnvironmentName}</th><th>{comparison.rightEnvironmentName}</th><th>Result</th></tr></thead>
        <tbody>{rows.map(component => <tr key={component.componentId}><td data-primary><strong>{component.name}</strong></td>
          <td data-label={comparison.leftEnvironmentName}><Side hasData={component.leftHasData} version={component.leftVersion} health={component.leftHealth} /></td>
          <td data-label={comparison.rightEnvironmentName}><Side hasData={component.rightHasData} version={component.rightVersion} health={component.rightHealth} /></td>
          <td data-label="Result">{component.different ? <span className="chip" data-tone="warn">Different</span> : <span className="muted">Same</span>}</td></tr>)}</tbody></table>
      {rows.length === 0 && (differencesOnly
        ? <div className="no-results" role="status"><p className="no-results-title">No recorded differences.</p><p className="no-results-hint">Both environments have the same versions and health on record.</p><button type="button" className="button small" onClick={() => setDifferencesOnly(false)}>Show all components</button></div>
        : <p className="muted">No components yet. Add them on the Components page, then compare again.</p>)}
    </section>}
  </main>;
}
