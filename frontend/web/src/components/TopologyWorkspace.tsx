"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ReactFlow, Background, Controls, Handle, MiniMap, Position, type NodeProps, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { apiBase, getJson, postJson, type Drift, type DriftEdge, type Environment, type Impact, type OperationalEvent, type RuntimeState, type Topology, type Deployment, type WorkItem } from "@/lib/api";
import { formatMetric, formatWhen, formatWhenFull, plural } from "@/lib/format";
import { mapTopology, type ComponentNodeData } from "@/lib/graph";
import { errorSentence } from "@/lib/errors";
import { closestMatch } from "@/lib/search";
import { countHealth, deploymentLook, HEALTH_ORDER, healthLook, POTENTIALLY_AFFECTED, workStateLook } from "@/lib/status";
import { NoResults } from "./app/NoResults";
import { ErrorNotice } from "./app/Notice";
import { PageHead } from "./app/PageHead";
import { SkeletonGraph } from "./app/Skeleton";
import { useToast } from "./app/Toaster";
import { HealthPill, SeverityPill, StatusGlyph, StatusPill, StatusText } from "./app/Status";
import { Icon } from "./landing/Icon";

type ComponentGraphNode = Node<ComponentNodeData, "component">;

function ComponentNode({ data }: NodeProps<ComponentGraphNode>) {
  const { component, selected, impactKind, dimmed } = data;
  const look = healthLook(component.health);
  return <div className="graph-node" data-health={component.health.toLowerCase()} data-tone={look.tone} data-selected={selected} data-impact={impactKind || undefined} data-dimmed={dimmed}>
    <Handle type="target" position={Position.Top} />
    <div className="node-top"><span className="node-type">{component.type}</span><span className="node-version">{component.version ?? "no version"}</span></div>
    <strong className="node-name" title={component.name}>{component.name}</strong>
    <div className="node-foot">
      <StatusPill look={look} size="sm" />
      {impactKind && <StatusPill look={POTENTIALLY_AFFECTED} label={impactKind === "direct" ? "Affected · direct" : "Affected · indirect"} size="sm" title="Potentially affected" />}
    </div>
    <Handle type="source" position={Position.Bottom} />
  </div>;
}
const nodeTypes = { component: ComponentNode };

const EDGE_SAMPLES = [["Declared", undefined], ["Discovered", "4 3"], ["Observed", "1 3"]] as const;

/** Up to this many declared-only dependencies are listed; more are folded away (large systems have dozens). */
const DRIFT_ROWS_SHOWN = 8;

function driftRow({ edge, label }: { edge: DriftEdge; label: string }) {
  return <div className="list-row" key={`${label}-${edge.sourceComponentId}-${edge.targetComponentId}-${edge.type}`}><span className="chip">{label}</span><div><strong>{edge.sourceName} → {edge.targetName}</strong><small>{edge.type}</small></div></div>;
}

export function TopologyWorkspace({ projectId }: { projectId: string }) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentId, setEnvironmentId] = useState("");
  const [topology, setTopology] = useState<Topology | null>(null);
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [linkedItems, setLinkedItems] = useState<WorkItem[]>([]);
  const [drift, setDrift] = useState<Drift | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [environmentsLoaded, setEnvironmentsLoaded] = useState(false);
  const [environmentAttempt, setEnvironmentAttempt] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [impactError, setImpactError] = useState<unknown>(null);
  const [linkedError, setLinkedError] = useState(false);
  const toast = useToast();
  const [live, setLive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [requestedComponent, setRequestedComponent] = useState<string | null>(null);
  useEffect(() => {
    getJson<Environment[]>(`/api/projects/${projectId}/environments`)
      .then(envs => { setEnvironments(envs); setEnvironmentsLoaded(true); setError(null);
        const params = new URLSearchParams(window.location.search);
        const requested = params.get("environmentId");
        setRequestedComponent(params.get("componentId"));
        setEnvironmentId(envs.find(e => e.id === requested)?.id ?? envs.find(e => e.type === "Production")?.id ?? envs[0]?.id ?? "");
      }).catch(setError);
  }, [projectId, environmentAttempt]);
  const refresh = useCallback(() => {
    if (!environmentId) return;
    Promise.all([
      getJson<Topology>(`/api/projects/${projectId}/environments/${environmentId}/topology`),
      getJson<OperationalEvent[]>(`/api/projects/${projectId}/environments/${environmentId}/events?limit=8`),
      getJson<Deployment[]>(`/api/projects/${projectId}/environments/${environmentId}/deployments`),
      getJson<Drift>(`/api/projects/${projectId}/environments/${environmentId}/architecture-drift`)
    ]).then(([t, e, d, comparison]) => { setTopology(t); setEvents(e); setDeployments(d); setDrift(comparison); setError(null); }).catch(setError);
  }, [projectId, environmentId]);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  useEffect(() => {
    if (!environmentId) return;
    const source = new EventSource(`${apiBase}/api/projects/${projectId}/environments/${environmentId}/events/stream`);
    source.onopen = () => { setLive(true); refresh(); };
    source.onerror = () => setLive(false);
    source.addEventListener("runtime-state-updated", event => {
      const state = JSON.parse((event as MessageEvent).data) as RuntimeState;
      setTopology(current => current ? { ...current, nodes: current.nodes.map(node => node.id === state.componentId ?
        { ...node, health: state.healthStatus, metrics: { cpuPercent: state.cpuPercent, memoryPercent: state.memoryPercent,
          requestRate: state.requestRate, errorRatePercent: state.errorRatePercent, latencyP95Ms: state.latencyP95Ms } } : node) } : current);
    });
    source.addEventListener("operational-event-created", event => {
      const item = JSON.parse((event as MessageEvent).data) as OperationalEvent;
      setEvents(current => [item, ...current.filter(x => x.id !== item.id)].slice(0, 8));
    });
    source.addEventListener("deployment-updated", () => refresh());
    return () => { source.close(); setLive(false); };
  }, [projectId, environmentId, refresh]);
  useEffect(() => { setSelectedId(null); setSelectedEdgeId(null); setImpact(null); }, [environmentId]);
  useEffect(() => {
    // A link from the overview can ask for a component to be selected once the topology has loaded.
    if (!requestedComponent || !topology) return;
    if (topology.nodes.some(node => node.id === requestedComponent)) setSelectedId(requestedComponent);
    setRequestedComponent(null);
  }, [requestedComponent, topology]);
  useEffect(() => {
    if (!selectedId) { setLinkedItems([]); setLinkedError(false); return; }
    let current = true;
    getJson<WorkItem[]>(`/api/components/${selectedId}/work-items`)
      .then(items => { if (current) { setLinkedItems(items); setLinkedError(false); } })
      .catch(() => { if (current) { setLinkedItems([]); setLinkedError(true); } });
    return () => { current = false; };
  }, [selectedId, refreshKey]);
  const visibleTopology = useMemo(() => {
    if (!topology) return null;
    const nodes = topology.nodes.filter(node => (!typeFilter || node.type === typeFilter) &&
      (!healthFilter || node.health === healthFilter));
    const visibleIds = new Set(nodes.map(node => node.id));
    const edges = topology.edges.filter(edge => (!sourceFilter || edge.sourceKind === sourceFilter) &&
      visibleIds.has(edge.source) && visibleIds.has(edge.target));
    return { ...topology, nodes, edges };
  }, [topology, typeFilter, healthFilter, sourceFilter]);
  const graph = useMemo(() => visibleTopology ? mapTopology(visibleTopology, selectedId, impact, search, selectedEdgeId) : { nodes: [], edges: [] }, [visibleTopology, selectedId, impact, search, selectedEdgeId]);
  const selected = topology?.nodes.find(n => n.id === selectedId);
  const selectedEdge = topology?.edges.find(edge => edge.id === selectedEdgeId);
  const dependencies = topology?.edges.filter(e => e.source === selectedId) ?? [];
  const dependents = topology?.edges.filter(e => e.target === selectedId) ?? [];
  const componentName = (id: string | null) => topology?.nodes.find(n => n.id === id)?.name ?? "System";
  const selectNode = (id: string) => { setSelectedId(id || null); setSelectedEdgeId(null); setImpact(null); setImpactError(null); };
  const clearSelection = () => { setSelectedId(null); setSelectedEdgeId(null); setImpact(null); setImpactError(null); };
  const analyze = async () => {
    if (!selectedId) return;
    setAnalyzing(true); setImpactError(null);
    try { setImpact(await getJson<Impact>(`/api/projects/${projectId}/components/${selectedId}/impact`)); }
    catch (cause) { setImpactError(cause); }
    finally { setAnalyzing(false); }
  };
  const simulate = async (mode: "degradation" | "recovery") => {
    if (!selectedId) return;
    const name = componentName(selectedId);
    try {
      await postJson(`/api/dev/simulate/${mode}/${selectedId}?environmentId=${environmentId}`);
      toast({ tone: "info", title: mode === "degradation" ? `${name}: degradation simulated` : `${name}: health restored`,
        text: live ? "The map and the events update live, without a reload." : "The live connection is down: press Refresh to see the change." });
    }
    catch (cause) { toast({ tone: "error", title: "The simulation didn't run", text: errorSentence(cause) }); }
  };
  const noEnvironments = environmentsLoaded && environments.length === 0;
  const nothingToDraw = noEnvironments || topology?.nodes.length === 0;
  const retry = () => { setError(null); if (!environmentsLoaded) setEnvironmentAttempt(x => x + 1); setRefreshKey(x => x + 1); };
  const clearFilters = () => { setTypeFilter(""); setHealthFilter(""); setSourceFilter(""); };
  const searchMisses = !!topology && !!search.trim() && !(visibleTopology?.nodes ?? []).some(node => node.name.toLowerCase().includes(search.trim().toLowerCase()));
  const counts = countHealth(topology?.nodes ?? []);
  const selectedDeployments = selected ? deployments.filter(d => d.componentId === selected.id).slice(0, 3) : [];
  const selectedEvents = selected ? events.filter(e => e.componentId === selected.id).slice(0, 3) : [];

  return <main id="main" className="ws-page">
    <PageHead eyebrow="Operate" title="Topology" lede="Every component and dependency on one live map. Select a component to see what a failure could reach."
      actions={<>
        {environmentId && <span className="live" data-live={live} role="status"><span className="live-dot" aria-hidden="true" />{live ? "Live" : "Connecting…"}</span>}
        {topology && topology.nodes.length > 0 && <div className="totals" aria-label="Health of the components">{HEALTH_ORDER.filter(h => h !== "Unknown" || counts.Unknown > 0).map(h => <StatusPill key={h} look={healthLook(h)} label={`${counts[h]} ${h.toLowerCase()}`} />)}</div>}
      </>} />
    <div className="workspace-toolbar">
      <label>Environment <select value={environmentId} disabled={noEnvironments} onChange={e => setEnvironmentId(e.target.value)}>{noEnvironments && <option value="">No environments</option>}{environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <div className="search-field"><Icon name="search" /><input type="search" aria-label="Search components" placeholder="Search components" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <select aria-label="Filter by component type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="">All types</option>{[...new Set(topology?.nodes.map(node => node.type) ?? [])].sort().map(type => <option key={type}>{type}</option>)}</select>
      <select aria-label="Filter by health" value={healthFilter} onChange={e => setHealthFilter(e.target.value)}><option value="">All health</option>{HEALTH_ORDER.map(health => <option key={health}>{health}</option>)}</select>
      <select aria-label="Filter by dependency source" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}><option value="">All sources</option>{["Declared", "Discovered", "Observed"].map(source => <option key={source}>{source}</option>)}</select>
      <select className="inspect-select" aria-label="Inspect a component" value={selectedId ?? ""} onChange={e => selectNode(e.target.value)}><option value="">Inspect component</option>{topology?.nodes.map(node => <option value={node.id} key={node.id}>{node.name}</option>)}</select>
      <button className="button ghost icon-only" onClick={() => setRefreshKey(x => x + 1)} aria-label="Refresh" title="Refresh"><Icon name="refresh-cw" /></button>
    </div>
    <ErrorNotice className="workspace-error" error={error} what="the topology" onRetry={retry} />
    <div className="workspace-main fade-in"><div className="graph-area" role="region" aria-label="Interactive dependency topology">
      <ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} onNodeClick={(_, node) => selectNode(node.id)}
        onEdgeClick={(_, edge) => { setSelectedId(null); setImpact(null); setImpactError(null); setSelectedEdgeId(edge.id); }} onPaneClick={clearSelection}
        nodesConnectable={false} fitView fitViewOptions={{ padding: { top: "72px", right: "28px", bottom: "28px", left: "28px" }, maxZoom: 1 }} minZoom={0.3} maxZoom={1.5} proOptions={{ hideAttribution: true }}>
        <Background gap={22} size={1.2} /><Controls showInteractive={false} /><MiniMap pannable zoomable nodeBorderRadius={8} nodeColor={node => {
          // Healthy components stay quiet on the minimap, so the ones that need attention stand out.
          const tone = healthLook((node.data as ComponentNodeData).component.health).tone;
          return tone === "warn" ? "var(--lp-warn)" : tone === "bad" ? "var(--lp-bad)" : tone === "ok" ? "color-mix(in oklab, var(--lp-ok) 38%, var(--lp-surface-2))" : "var(--lp-line-strong)";
        }} /></ReactFlow>
      {!topology && !error && !noEnvironments && <><SkeletonGraph /><span className="sr-only" role="status">Loading the topology…</span></>}
      {noEnvironments && <div className="graph-empty"><span className="empty-icon"><Icon name="layers" size={22} /></span><p className="empty-title">No environments yet</p><p>The map shows one environment at a time, such as Production. Add one, then its components appear here.</p><div className="empty-actions"><Link className="button primary" href={`/projects/${projectId}/environments`}><Icon name="plus" />Add an environment</Link></div></div>}
      {topology && topology.nodes.length === 0 && <div className="graph-empty"><span className="empty-icon"><Icon name="network" size={22} /></span><p className="empty-title">Nothing to draw yet</p><p>Add the components of your system and what they depend on, or let a repository scan find them.</p><div className="empty-actions"><Link className="button primary" href={`/projects/${projectId}/components`}><Icon name="plus" />Add components</Link><Link className="button" href={`/projects/${projectId}/settings/integrations`}><Icon name="scan-search" />Scan a repository</Link></div></div>}
      {topology && topology.nodes.length > 0 && visibleTopology?.nodes.length === 0 && <NoResults what="components" onClear={clearFilters} />}
      {searchMisses && visibleTopology && visibleTopology.nodes.length > 0 && <NoResults query={search} what="components" suggestion={closestMatch(search, visibleTopology.nodes.map(node => node.name))}
        onSuggestion={name => { setSearch(name); const node = visibleTopology.nodes.find(candidate => candidate.name === name); if (node) selectNode(node.id); }} onClear={() => setSearch("")} />}
      <div className="graph-legend" aria-hidden="true">
        {HEALTH_ORDER.map(h => { const look = healthLook(h); return <span key={h} data-tone={look.tone}><StatusGlyph glyph={look.glyph} />{look.label}</span>; })}
        <span data-tone="bad"><StatusGlyph glyph="triangle-outline" />Potentially affected</span>
        <span className="legend-sep legend-edges" />
        {EDGE_SAMPLES.map(([label, dash]) => <span key={label} className="legend-edges"><svg className="edge-sample" viewBox="0 0 22 2" aria-hidden="true"><line x1="1" y1="1" x2="21" y2="1" strokeDasharray={dash} /></svg>{label}</span>)}
      </div>
    </div><aside className="detail-panel" aria-label="Details">
      {selectedEdge ? <div className="fade-in" key={selectedEdge.id}>
        <div className="detail-head"><div><p className="label">Dependency</p><h2>{componentName(selectedEdge.source)} → {componentName(selectedEdge.target)}</h2></div>
          <button className="button ghost small icon-only" onClick={clearSelection} aria-label="Close details"><Icon name="x" /></button></div>
        <div className="detail-badges"><span className="chip">{selectedEdge.type}</span><span className="chip">{selectedEdge.sourceKind}</span></div>
        <p className="detail-intro">{componentName(selectedEdge.source)} depends on {componentName(selectedEdge.target)}. Each record below explains why this dependency is on the map.</p>
        <div className="detail-group"><h3>Evidence</h3>{selectedEdge.evidence.length ? selectedEdge.evidence.map((entry, index) =>
          <div className="relation" key={`${entry.type}-${entry.sourcePath}-${index}`}><strong>{entry.type}</strong>
            <small className="mono">{entry.sourcePath ?? "No source file"}{entry.sourceLocation ? ` · ${entry.sourceLocation}` : ""}</small>
            {entry.description && <small>{entry.description}</small>}
          </div>) : <p className="muted">No detailed evidence was recorded for this dependency.</p>}</div>
      </div> : selected ? <div className="fade-in" key={selected.id}>
        <div className="detail-head"><div><p className="label">{selected.type}</p><h2>{selected.name}</h2></div>
          <button className="button ghost small icon-only" onClick={clearSelection} aria-label="Close details"><Icon name="x" /></button></div>
        <div className="detail-badges"><HealthPill health={selected.health} />{selected.version && <span className="version">{selected.version}</span>}</div>
        {selected.description && <p className="detail-intro">{selected.description}</p>}
        <div className="detail-actions"><button className="button primary full" onClick={analyze} disabled={analyzing} aria-busy={analyzing}><Icon name="zap" />{analyzing ? "Analyzing…" : "Analyze potential impact"}</button></div>
        <ErrorNotice error={impactError} what="the impact analysis" onRetry={analyze} />
        {impact && impact.componentId === selected.id && <div className="impact-results fade-in" role="status">
          <h3><StatusGlyph glyph="triangle-outline" />Potentially affected</h3>
          <p className="impact-sum">{plural(impact.directDependents.length + impact.indirectDependents.length, "component")} depend on {selected.name}, directly or through others. They may be affected if it fails.</p>
          <h4>Direct</h4>{impact.directDependents.length ? <ul>{impact.directDependents.map(x => <li key={x.id}><StatusGlyph glyph="triangle-outline" />{x.name}</li>)}</ul> : <p className="impact-none">None</p>}
          <h4>Indirect</h4>{impact.indirectDependents.length ? <ul>{impact.indirectDependents.map(x => <li key={x.id}><StatusGlyph glyph="triangle-outline" />{x.name}</li>)}</ul> : <p className="impact-none">None</p>}
        </div>}
        {process.env.NEXT_PUBLIC_ENABLE_DEMO === "true" && <div className="detail-group"><h3>Demo</h3><div className="demo-actions"><button className="button small" onClick={() => simulate("degradation")}>Simulate degradation</button><button className="button small" onClick={() => simulate("recovery")}>Restore health</button></div></div>}
        <div className="detail-group"><h3>Metrics</h3><div className="metric-grid">
          <div className="metric"><strong>{formatMetric(selected.metrics.cpuPercent, "%")}</strong><span>CPU</span></div>
          <div className="metric"><strong>{formatMetric(selected.metrics.memoryPercent, "%")}</strong><span>Memory</span></div>
          <div className="metric"><strong>{formatMetric(selected.metrics.requestRate, "/s")}</strong><span>Requests</span></div>
          <div className="metric"><strong>{formatMetric(selected.metrics.errorRatePercent, "%")}</strong><span>Error rate</span></div>
          <div className="metric"><strong>{formatMetric(selected.metrics.latencyP95Ms, " ms")}</strong><span>P95 latency</span></div>
        </div></div>
        <div className="detail-group"><h3>Details</h3><dl><dt>Version</dt><dd>{selected.version ?? "Unknown"}</dd><dt>Owner</dt><dd>{selected.owner ?? "—"}</dd><dt>Repository</dt><dd>{selected.repositoryUrl ? <a href={selected.repositoryUrl} target="_blank" rel="noreferrer">Open repository ↗</a> : "—"}</dd>
          <dt>Origin</dt><dd>{selected.origin}</dd><dt>Discovery</dt><dd>{selected.discoveryStatus}</dd><dt>Last discovered</dt><dd>{selected.lastDiscoveredAt ? formatWhen(selected.lastDiscoveredAt) : "—"}</dd></dl></div>
        <div className="detail-group"><h3>Depends on</h3>{dependencies.length ? dependencies.map(e => <div className="relation" key={e.id}><button className="table-link" onClick={() => selectNode(e.target)}>{componentName(e.target)}</button><small>{e.type} · {e.sourceKind}</small></div>) : <p className="muted">Nothing</p>}
          <h3>Used by</h3>{dependents.length ? dependents.map(e => <div className="relation" key={e.id}><button className="table-link" onClick={() => selectNode(e.source)}>{componentName(e.source)}</button><small>{e.type} · {e.sourceKind}</small></div>) : <p className="muted">Nothing</p>}</div>
        <div className="detail-group"><h3>Recent deployments</h3>{selectedDeployments.length ? selectedDeployments.map(d => <div className="relation relation-row" key={d.id}><span className="version">{d.version}</span><small><StatusText look={deploymentLook(d.status)} /> · <time dateTime={d.startedAt} title={formatWhenFull(d.startedAt)}>{formatWhen(d.startedAt)}</time></small></div>) : <p className="muted">No deployments recorded.</p>}</div>
        <div className="detail-group"><h3>Linked work</h3>{linkedError ? <p className="muted">The linked work items couldn&apos;t be loaded. Press Refresh to try again.</p> : linkedItems.length ? linkedItems.map(item => <div className="relation" key={item.id}>#{item.sequenceNumber} {item.title}<small>{item.type === "UserStory" ? "Story" : item.type} · <StatusText look={workStateLook(item.state)} /> · {item.priority}</small></div>) : <p className="muted">No active work items are linked to this component.</p>}<Link className="panel-link" href={`/projects/${projectId}/boards`}>Open board<Icon name="arrow-right" size={14} /></Link></div>
        <div className="detail-group"><h3>Recent events</h3>{selectedEvents.length ? selectedEvents.map(e => <div className="relation" key={e.id}>{e.title}<small><time dateTime={e.occurredAt} title={formatWhenFull(e.occurredAt)}>{formatWhen(e.occurredAt)}</time></small></div>) : <p className="muted">No recent events.</p>}</div>
      </div> : nothingToDraw ? <div className="empty-detail"><span className="empty-icon"><Icon name="mouse-pointer-click" size={22} /></span><h2>Nothing to inspect yet</h2><p>Once the map has components, select one to see its health, metrics and dependencies.</p></div>
        : <div className="empty-detail"><span className="empty-icon"><Icon name="mouse-pointer-click" size={22} /></span><h2>Select a component</h2><p>See its health, metrics and dependencies, and what a failure could reach. Select a line to see why a dependency exists.</p></div>}
    </aside></div>
    <section className="timeline"><div className="timeline-heading"><h2>Recent events</h2><Link href={`/projects/${projectId}/events`}>All events<Icon name="arrow-right" size={14} /></Link></div>
      {events.length > 0 ? <div className="timeline-items">{events.map(e => <div className="timeline-item" key={e.id}><SeverityPill severity={e.severity} /><div><strong>{e.title}</strong><small>{componentName(e.componentId)} · <time dateTime={e.occurredAt} title={formatWhenFull(e.occurredAt)}>{formatWhen(e.occurredAt)}</time></small></div></div>)}</div>
        : <p className="empty-line">No events in this environment yet.</p>}</section>
    {drift && <section className="timeline"><div className="timeline-heading"><h2>Dependency provenance</h2><span className="chip">Whole project</span></div>
      <p className="panel-note">Declared dependencies compared with observed and discovered ones. This reflects recorded data only: a missing observation can simply mean that no telemetry was sent.</p>
      <div className="drift-summary"><span><strong>{drift.matching.length}</strong>declared and observed</span><span><strong>{drift.declaredOnly.length}</strong>declared only</span><span><strong>{drift.observedOnly.length}</strong>observed only</span><span><strong>{drift.discovered.length}</strong>discovered</span></div>
      {[...drift.observedOnly.map(edge => ({ edge, label: "Observed only" })), ...drift.discovered.map(edge => ({ edge, label: "Discovered" }))].map(driftRow)}
      {drift.declaredOnly.length > 0 && (drift.declaredOnly.length <= DRIFT_ROWS_SHOWN
        ? drift.declaredOnly.map(edge => driftRow({ edge, label: "Declared only" }))
        : <details className="drift-more"><summary>Declared only ({drift.declaredOnly.length})</summary>{drift.declaredOnly.map(edge => driftRow({ edge, label: "Declared only" }))}</details>)}
    </section>}
  </main>;
}
