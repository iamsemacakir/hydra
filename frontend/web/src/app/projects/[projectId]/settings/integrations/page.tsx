"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ErrorNotice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { ViewOnly } from "@/components/app/ProjectContext";
import { ScanWork } from "@/components/app/ScanWork";
import { SkeletonFeed } from "@/components/app/Skeleton";
import { StatusPill } from "@/components/app/Status";
import { useToast } from "@/components/app/Toaster";
import { Icon } from "@/components/landing/Icon";
import { DiscoveryPreview, getJson, postJson, Project, ProjectMember, RepositoryConnection, RepositoryScan } from "@/lib/api";
import { formatWhen, formatWhenFull, plural } from "@/lib/format";
import type { StatusLook } from "@/lib/status";

type Review = { connectionId: string; preview: DiscoveryPreview };

/** Where a repository comes from, in words. */
function providerLabel(provider: string): string {
  return provider === "LocalDevelopment" ? "Bundled demo" : provider;
}

/** "4 files · 8 components · 7 dependencies · 1 warning" */
function scanSummary(scan: RepositoryScan): string {
  return [plural(scan.filesScanned, "file"), plural(scan.componentsDiscovered, "component"),
    plural(scan.dependenciesDiscovered, "dependency", "dependencies"), plural(scan.warningsCount, "warning")].join(" · ");
}

function scanLook(status: RepositoryScan["status"]): StatusLook {
  switch (status) {
    case "Succeeded": return { tone: "ok", glyph: "check", label: "Succeeded" };
    case "PartiallySucceeded": return { tone: "warn", glyph: "triangle", label: "Partly succeeded" };
    case "Failed": return { tone: "bad", glyph: "cross", label: "Failed" };
    case "Running": return { tone: "accent", glyph: "dot", label: "Running" };
    default: return { tone: "neutral", glyph: "ring", label: "Pending" };
  }
}

export default function IntegrationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [connections, setConnections] = useState<RepositoryConnection[]>([]);
  const [scans, setScans] = useState<Record<string, RepositoryScan[]>>({});
  const [canManage, setCanManage] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const toast = useToast();

  /** Polls pass quiet: true, so the loading bar does not flash every two seconds while a scan runs. */
  const load = useCallback(async (quiet = false) => {
    try {
      const [p, repositories, members, me] = await Promise.all([
        getJson<Project>(`/api/projects/${projectId}`, { quiet }),
        getJson<RepositoryConnection[]>(`/api/projects/${projectId}/repository-connections`, { quiet }),
        getJson<ProjectMember[]>(`/api/projects/${projectId}/members`, { quiet }), getJson<{ id: string }>("/api/me", { quiet })
      ]);
      const histories = await Promise.all(repositories.map(async connection => [connection.id,
        await getJson<RepositoryScan[]>(`/api/projects/${projectId}/repository-connections/${connection.id}/scans?limit=25`, { quiet })] as const));
      setProject(p); setConnections(repositories); setScans(Object.fromEntries(histories));
      setCanManage(members.some(member => member.userId === me.id && member.role === "Owner"));
      setError(null);
    } catch (cause) { setError(cause); }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!Object.values(scans).some(history => history.some(scan => scan.status === "Pending" || scan.status === "Running"))) return;
    const timer = setInterval(() => void load(true), 2000);
    return () => clearInterval(timer);
  }, [scans, load]);

  async function connectDemo() {
    setBusy(true); setError(null);
    try {
      await postJson(`/api/projects/${projectId}/repository-connections`,
        { provider: "LocalDevelopment", name: "Bundled Commerce System", repositoryUrl: "demo://commerce-system", defaultBranch: "bundled" });
      await load();
      toast({ title: "Repository connected", text: "Scan it to see the components and dependencies its configuration describes." });
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  async function action(connectionId: string, operation: "scans" | "disconnect" | "reconnect") {
    setBusy(true); setError(null);
    try {
      await postJson(`/api/projects/${projectId}/repository-connections/${connectionId}/${operation}`);
      await load();
      toast(operation === "scans" ? { tone: "info", title: "Scan started", text: "Hydra is reading the repository's configuration. Review what it found when it finishes." }
        : operation === "disconnect" ? { title: "Repository disconnected", text: "What was imported stays in the project." }
        : { title: "Repository reconnected", text: "You can scan it again." });
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  async function openPreview(connectionId: string, scanId: string) {
    try {
      setReview({ connectionId, preview: await getJson<DiscoveryPreview>(
        `/api/projects/${projectId}/repository-connections/${connectionId}/scans/${scanId}/preview`) });
      setError(null);
    } catch (cause) { setError(cause); }
  }
  async function applyReview() {
    if (!review) return;
    setBusy(true); setError(null);
    try {
      await postJson(`/api/projects/${projectId}/repository-connections/${review.connectionId}/scans/${review.preview.id}/apply`);
      const { components, dependencies } = review.preview;
      setReview(null); await load();
      toast({ title: "Discovery applied", text: `${plural(components.length, "component")} and ${plural(dependencies.length, "dependency", "dependencies")} are on the map, each with the evidence it came from.`, action: { label: "Open topology", href: `/projects/${projectId}/topology` } });
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }

  const when = (value: string) => <time dateTime={value} title={formatWhenFull(value)}>{formatWhen(value)}</time>;
  // One scan at a time per repository: the API refuses a second one while the first is queued or running.
  const scanInProgress = (connectionId: string) => (scans[connectionId] ?? []).some(scan => scan.status === "Pending" || scan.status === "Running");
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Connect" title="Integrations" lede="Connect a repository and scan its configuration, read-only. Review what the scan found before it changes the project." actions={<ViewOnly need="Owner" />} />
    <ErrorNotice error={error} what="the integrations" onRetry={() => void load()} />
    <div className="stack">
      {!project && !error && <section className="panel" aria-busy="true" aria-label="Loading the integrations"><SkeletonFeed rows={3} /></section>}
      {project && connections.length === 0 && <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="plug" size={22} /></span><h2>No repository connected</h2>
        <p>Connect the bundled Commerce System to scan its Docker Compose configuration. The project works without integrations too.</p>
        {canManage && <button className="button primary" disabled={busy} onClick={() => void connectDemo()}><Icon name="plug" />Connect the bundled demo</button>}
      </section>}
      {connections.map(connection => <section className="panel fade-in" key={connection.id}><div className="panel-head"><h2>{connection.name}</h2><span className="chip" data-tone={connection.status === "Disconnected" ? "neutral" : "accent"}>{connection.status}</span></div>
        <p className="connection-meta"><span><Icon name="git-branch" size={14} />{connection.defaultBranch}</span><span className="mono">{connection.repositoryUrl}</span><span>{providerLabel(connection.provider)}</span><span><Icon name="clock" size={14} />Last successful scan: {connection.lastSuccessfulSyncAt ? when(connection.lastSuccessfulSyncAt) : "never"}</span></p>
        {connection.lastSyncError && <p className="error">{connection.lastSyncError}</p>}
        {canManage && <div className="inline-form"><button className="button primary" disabled={busy || connection.status === "Disconnected" || scanInProgress(connection.id)} onClick={() => void action(connection.id, "scans")}><Icon name="scan-search" />{scanInProgress(connection.id) ? "Scanning…" : "Scan now"}</button>
          <button className="button" disabled={busy} onClick={() => void action(connection.id, connection.status === "Disconnected" ? "reconnect" : "disconnect")}>{connection.status === "Disconnected" ? "Reconnect" : "Disconnect"}</button></div>}
        <h3>Scan history</h3>{(scans[connection.id] ?? []).length === 0 && <p className="muted">No scans yet.</p>}
        <ol className="feed">{(scans[connection.id] ?? []).map(scan => <li className="feed-item scan-item" key={scan.id}><StatusPill look={scanLook(scan.status)} /><div><strong>{when(scan.startedAt)}{scan.appliedAt ? " · applied" : ""}</strong>
          {scan.status === "Running" || scan.status === "Pending" ? <ScanWork startedAt={scan.startedAt} queued={scan.status === "Pending"} /> : <small>{scanSummary(scan)}</small>}
          {scan.errorMessage && <small>{scan.errorMessage}</small>}</div>
          {scan.status === "Succeeded" || scan.status === "PartiallySucceeded" ? <button className="button small" onClick={() => void openPreview(connection.id, scan.id)}>Review</button> : <span />}</li>)}</ol>
      </section>)}
      {review && <section className="panel fade-in"><div className="panel-head"><h2>What the scan found</h2><button className="button ghost small" onClick={() => setReview(null)}><Icon name="x" size={14} />Close</button></div>
        <div className="drift-summary"><span><strong>{review.preview.newComponents.length}</strong>new</span><span><strong>{review.preview.changedComponents.length}</strong>changed</span><span><strong>{review.preview.missingComponents.length}</strong>missing</span><span><strong>{review.preview.conflicts.length}</strong>conflicts</span></div>
        {review.preview.components.map(component => <div className="list-row" key={`${component.sourcePath}:${component.externalKey}`}><span className="chip">{component.type}</span><div><strong>{component.name}</strong><small className="mono">{component.sourcePath} · {component.sourceLocation}</small></div></div>)}
        <p className="panel-note">{review.preview.dependencies.length} dependency candidates. Applying a scan keeps your manual name and type corrections.</p>
        {review.preview.warnings.map((warning, index) => <p className="error" key={index}>{warning.sourcePath}: {warning.message}</p>)}
        {review.preview.conflicts.map(component => <p className="error" key={component.externalKey}>Name conflict: {component.name}. It will be skipped.</p>)}
        {!review.preview.appliedAt && canManage && <div className="form-actions"><button className="button primary" disabled={busy} onClick={() => void applyReview()}>{busy ? "Applying…" : "Apply scan"}</button></div>}
        {review.preview.appliedAt && <p className="panel-note">Applied {when(review.preview.appliedAt)}. <Link className="panel-link" href={`/projects/${projectId}/topology`}>Open topology<Icon name="arrow-right" size={14} /></Link></p>}
      </section>}
    </div>
  </main>;
}
