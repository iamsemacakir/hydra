"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { Icon } from "@/components/landing/Icon";
import { postJson, Project } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [visibility, setVisibility] = useState<"Private" | "Internal">("Private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const project = await postJson<Project>("/api/projects", { name, description, slug: slug || null, visibility });
      router.push(`/projects/${project.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create project.");
    } finally { setBusy(false); }
  }
  return <main id="main" className="page form-page">
    <Link href="/projects" className="back-link"><Icon name="arrow-left" />Projects</Link>
    <PageHead eyebrow="New project" title="Create a project" lede="Start with a name. Add environments and components whenever you are ready." />
    <form className="panel form-panel fade-in" onSubmit={submit}>
      <label>Project name<input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Commerce Platform" /></label>
      <label>Slug<input value={slug} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={e => setSlug(e.target.value.toLowerCase())} placeholder="Made from the name if you leave it empty" /><small>Lowercase letters, numbers and hyphens. A stable identifier for the project.</small></label>
      <label>Description<textarea maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this system do?" /></label>
      <label>Visibility<select value={visibility} onChange={e => setVisibility(e.target.value as "Private" | "Internal")}><option value="Private">Private</option><option value="Internal">Internal</option></select></label>
      {error && <Notice>{error}</Notice>}
      <div className="form-actions"><Link className="button" href="/projects">Cancel</Link><button className="button primary" disabled={busy}>{busy ? "Creating…" : "Create project"}</button></div>
    </form>
  </main>;
}
