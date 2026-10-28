"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { StatusPill } from "@/components/app/Status";
import { Icon } from "@/components/landing/Icon";
import { DiscoveryPreview, getJson, postJson, Project, ProjectMember, RepositoryConnection, RepositoryScan } from "@/lib/api";
import { formatWhen, formatWhenFull } from "@/lib/format";
import type { StatusLook } from "@/lib/status";

type Review = { connectionId: string; preview: DiscoveryPreview };

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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, repositories, members, me] = await Promise.all([
        getJson<Project>(`/api/projects/${projectId}`),
        getJson<RepositoryConnection[]>(`/api/projects/${projectId}/repository-connections`),
        getJson<ProjectMember[]>(`/api/projects/${projectId}/members`), getJson<{ id: string }>("/api/me")
      ]);
      const histories = await Promise.all(repositories.map(async connection => [connection.id,
        await getJson<RepositoryScan[]>(`/api/projects/${projectId}/repository-connections/${connection.id}/scans?limit=25`)] as const));
      setProject(p); setConnections(repositories); setScans(Object.fromEntries(histories));
      setCanManage(members.some(member => member.userId === me.id && member.role === "Owner"));
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load integrations."); }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!Object.values(scans).some(history => history.some(scan => scan.status === "Pending" || scan.status === "Running"))) return;
    const timer = setInterval(() => void load(), 2000);
    return () => clearInterval(timer);
  }, [scans, load]);

  async function connectDemo() {
    setBusy(true); setError("");
    try {
      await postJson(`/api/projects/${projectId}/repository-connections`,
        { provider: "LocalDevelopment", name: "Bundled Commerce System", repositoryUrl: "demo://commerce-system", defaultBranch: "bundled" });
      setMessage("Repository connected. Start a scan to review its architecture."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to connect repository."); }
    finally { setBusy(false); }
  }
  async function action(connectionId: string, operation: "scans" | "disconnect" | "reconnect") {
    setBusy(true); setError("");
    try {
      await postJson(`/api/projects/${projectId}/repository-connections/${connectionId}/${operation}`);
      setMessage(operation === "scans" ? "Scan queued. Review its preview when it completes." :
        operation === "disconnect" ? "Repository disconnected. Imported history and topology remain." : "Repository ready for a new scan.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Repository action failed."); }
    finally { setBusy(false); }
  }
  async function openPreview(connectionId: string, scanId: string) {
    try {
      setReview({ connectionId, preview: await getJson<DiscoveryPreview>(
        `/api/projects/${projectId}/repository-connections/${connectionId}/scans/${scanId}/preview`) });
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load scan preview."); }
  }
  async function applyReview() {
    if (!review) return;
    setBusy(true); setError("");
    try {
      await postJson(`/api/projects/${projectId}/repository-connections/${review.connectionId}/scans/${review.preview.id}/apply`);
      setMessage("Discovery applied. Open topology to inspect the evidence-backed graph.");
      setReview(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to apply scan."); }
    finally { setBusy(false); }
  }

  const when = (value: string) => <time dateTime={value} title={formatWhenFull(value)}>{formatWhen(value)}</time>;
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Connect" title="Integrations" lede="Connect a repository and scan its configuration, read-only. Review what the scan found before it changes the project." />
    {error && <Notice>{error}</Notice>}
    {message && <Notice tone="success">{message}</Notice>}
    <div className="stack">
      {project && connections.length === 0 && <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="plug" size={22} /></span><h2>No repository connected</h2>
        <p>Connect the bundled Commerce System to scan its Docker Compose configuration. The project works without integrations too.</p>
        {canManage && <button className="button primary" disabled={busy} onClick={() => void connectDemo()}><Icon name="plug" />Connect the bundled demo</button>}
      </section>}
      {connections.map(connection => <section className="panel fade-in" key={connection.id}><div className="panel-head"><h2>{connection.name}</h2><span className="chip" data-tone={connection.status === "Disconnected" ? "neutral" : "accent"}>{connection.status}</span></div>
        <p className="connection-meta"><span><Icon name="git-branch" size={14} />{connection.defaultBranch}</span><span className="mono">{connection.repositoryUrl}</span><span>{connection.provider}</span><span><Icon name="clock" size={14} />Last successful scan: {connection.lastSuccessfulSyncAt ? when(connection.lastSuccessfulSyncAt) : "never"}</span></p>
        {connection.lastSyncError && <p className="error">{connection.lastSyncError}</p>}
        {canManage && <div className="inline-form"><button className="button primary" disabled={busy || connection.status === "Disconnected"} onClick={() => void action(connection.id, "scans")}><Icon name="scan-search" />Scan now</button>
          <button className="button" disabled={busy} onClick={() => void action(connection.id, connection.status === "Disconnected" ? "reconnect" : "disconnect")}>{connection.status === "Disconnected" ? "Reconnect" : "Disconnect"}</button></div>}
        <h3>Scan history</h3>{(scans[connection.id] ?? []).length === 0 && <p className="muted">No scans yet.</p>}
        <ol className="feed">{(scans[connection.id] ?? []).map(scan => <li className="feed-item" key={scan.id} style={{ gridTemplateColumns: "150px minmax(0, 1fr) auto" }}><StatusPill look={scanLook(scan.status)} /><div><strong>{when(scan.startedAt)}{scan.appliedAt ? " · applied" : ""}</strong>
          <small>{scan.filesScanned} files · {scan.componentsDiscovered} components · {scan.dependenciesDiscovered} dependencies · {scan.warningsCount} warnings</small>
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
