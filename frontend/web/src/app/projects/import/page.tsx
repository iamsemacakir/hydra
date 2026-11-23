"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FieldError, useFormErrors } from "@/components/app/FormErrors";
import { ErrorNotice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { ScanWork } from "@/components/app/ScanWork";
import { StatusPill } from "@/components/app/Status";
import { useToast } from "@/components/app/Toaster";
import { Icon } from "@/components/landing/Icon";
import { DiscoveryPreview, getJson, ImportStart, postJson, RepositoryScan } from "@/lib/api";
import { plural } from "@/lib/format";
import type { StatusLook } from "@/lib/status";

function scanLook(status: RepositoryScan["status"] | undefined): StatusLook {
  switch (status) {
    case "Succeeded": return { tone: "ok", glyph: "check", label: "Scan finished" };
    case "PartiallySucceeded": return { tone: "warn", glyph: "triangle", label: "Scan finished with warnings" };
    case "Failed": return { tone: "bad", glyph: "cross", label: "Scan failed" };
    case "Running": return { tone: "accent", glyph: "dot", label: "Scanning" };
    default: return { tone: "neutral", glyph: "ring", label: "Queued" };
  }
}

export default function ImportProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<"demo" | "github">("demo");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [imported, setImported] = useState<ImportStart | null>(null);
  const [scan, setScan] = useState<RepositoryScan | null>(null);
  const [preview, setPreview] = useState<DiscoveryPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const form = useFormErrors();
  const toast = useToast();

  useEffect(() => {
    if (!imported) return;
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    const base = `/api/projects/${imported.projectId}/repository-connections/${imported.connectionId}/scans/${imported.scanId}`;
    async function poll() {
      try {
        // Polls are quiet: the scan's own progress line shows the work, not the loading bar.
        const current = await getJson<RepositoryScan>(base, { quiet: true });
        if (!active) return;
        setScan(current);
        if (current.status === "Succeeded" || current.status === "PartiallySucceeded") {
          setPreview(await getJson<DiscoveryPreview>(`${base}/preview`, { quiet: true }));
          return;
        }
        if (current.status === "Failed") return;
      } catch (cause) { if (active) setError(cause); }
      if (active) timeout = setTimeout(() => void poll(), 1500);
    }
    void poll();
    return () => { active = false; clearTimeout(timeout); };
  }, [imported]);

  async function begin() {
    setBusy(true); setError(null);
    try {
      const result = await postJson<ImportStart>("/api/projects/import",
        { name, description, slug: null, visibility: "Private",
          provider: source === "demo" ? "LocalDevelopment" : "GitHub",
          repositoryUrl: source === "demo" ? "demo://commerce-system" : repositoryUrl, branch });
      setImported(result);
      setStartedAt(new Date().toISOString());
    } catch (cause) { if (!form.handleApiError(cause, ["name", "description", "repositoryUrl", "branch"])) setError(cause); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!imported) return;
    setBusy(true); setError(null);
    try {
      await postJson(`/api/projects/${imported.projectId}/repository-connections/${imported.connectionId}/scans/${imported.scanId}/apply`);
      toast({ title: `${name} is on the map`, text: preview ? `${plural(preview.components.length, "component")} and ${plural(preview.dependencies.length, "dependency", "dependencies")}, each with the file it came from.` : undefined });
      router.push(`/projects/${imported.projectId}/topology?environmentId=${imported.environmentId}`);
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }

  const step = (number: number, title: string) => <h2 className="step-title"><span className="step-num">{number}</span>{title}</h2>;
  return <main id="main" className="page form-page">
    <Link href="/projects" className="back-link"><Icon name="arrow-left" />Projects</Link>
    <PageHead eyebrow="Import" title="Import a repository" lede="Hydra reads the repository's configuration, shows you what it found, and adds it to the project only when you apply it." />
    <div className="stack">
      {!imported && <form className="panel form-panel fade-in" noValidate onSubmit={form.onSubmit(begin)} onBlur={form.onBlur} onChange={form.onChange}>
        {step(1, "Choose the source")}<label>Repository source<select value={source} onChange={event => setSource(event.target.value as "demo" | "github")}><option value="demo">Bundled Commerce System demo</option><option value="github">Public GitHub repository</option></select></label>
        {source === "github" && <><label>Repository URL<input {...form.field("repositoryUrl")} required type="url" value={repositoryUrl} onChange={event => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" /><FieldError form={form} name="repositoryUrl" /></label>
          <label>Branch<input {...form.field("branch")} required value={branch} onChange={event => setBranch(event.target.value)} placeholder="main" /><FieldError form={form} name="branch" /></label></>}
        <p className="panel-note"><Icon name="shield-check" size={14} /> Read-only: repository files are never executed. GitHub import reads public repositories through the GitHub API; private repositories and Azure DevOps come later.</p>
        {step(2, "Name the project")}<label>Project name<input {...form.field("name")} required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Imported Commerce System" /><FieldError form={form} name="name" /></label>
        <label>Description<textarea {...form.field("description")} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} /><FieldError form={form} name="description" /></label>
        <p className="panel-note">Starting the scan creates a private project with an empty Production environment. The topology appears only after you review and apply what the scan found.</p>
        <div className="form-actions"><Link className="button" href="/projects">Cancel</Link><button className="button primary" disabled={busy}><Icon name="scan-search" />{busy ? "Starting…" : "Create and scan"}</button></div>
      </form>}
      {imported && <section className="panel fade-in">{step(3, "Scan the repository")}
        <p className="scan-status"><StatusPill look={scanLook(scan?.status)} /><span className="muted">{source === "demo" ? "Bundled Commerce System" : repositoryUrl}</span></p>
        {(!scan || scan.status === "Pending" || scan.status === "Running") && startedAt ? <ScanWork startedAt={scan?.startedAt ?? startedAt} queued={!scan || scan.status === "Pending"} /> : <p className="panel-note">{scan?.status === "Failed" ? scan.errorMessage : scan?.completedAt ?
            [plural(scan.filesScanned, "file") + " scanned", plural(scan.componentsDiscovered, "component"),
              plural(scan.dependenciesDiscovered, "dependency", "dependencies"), plural(scan.warningsCount, "warning")].join(" · ") : "Waiting for the background worker."}</p>}
        <Link className="panel-link" href={`/projects/${imported.projectId}/settings/integrations`} style={{ marginTop: 10 }}>View scan history<Icon name="arrow-right" size={14} /></Link></section>}
      {preview && <section className="panel fade-in">{step(4, "Review what was found")}
        <div className="drift-summary"><span><strong>{preview.newComponents.length}</strong>new components</span><span><strong>{preview.changedComponents.length}</strong>changed</span><span><strong>{preview.missingComponents.length}</strong>missing</span><span><strong>{preview.conflicts.length}</strong>conflicts</span></div>
        <h3>Components</h3>{preview.components.map(component => <div className="list-row" key={`${component.sourcePath}:${component.externalKey}`}><span className="chip">{component.type}</span><div><strong>{component.name}</strong><small className="mono">{component.sourcePath} · {component.sourceLocation}</small></div></div>)}
        <h3>Dependencies</h3>{preview.dependencies.map((dependency, index) => <div className="list-row" key={`${dependency.sourcePath}:${index}`}><span className="chip">{dependency.type}</span><div><strong>{dependency.sourceExternalKey} → {dependency.targetExternalKey}</strong><small className="mono">{dependency.sourcePath} · {dependency.sourceLocation}</small></div></div>)}
        {preview.missingComponents.map(component => <p className="muted" key={component.id}>Missing from this scan: {component.name}</p>)}
        {preview.conflicts.map(component => <p className="error" key={component.externalKey}>Name conflict: {component.name}. This candidate will be skipped when you apply.</p>)}
        {preview.warnings.length > 0 && <><h3>Parser warnings</h3>{preview.warnings.map((warning, index) => <p className="error" key={index}>{warning.sourcePath}: {warning.message}</p>)}</>}
        <div className="form-actions" style={{ marginTop: 18 }}><Link className="button" href={`/projects/${imported!.projectId}`}>Review later</Link><button className="button primary" disabled={busy} onClick={() => void apply()}>{busy ? "Applying…" : "Apply scan"}</button></div>
      </section>}
      <ErrorNotice error={error} what="the import" />
    </div>
  </main>;
}
