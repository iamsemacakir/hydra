"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FieldError, useFormErrors } from "@/components/app/FormErrors";
import { ErrorNotice, Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { useToast } from "@/components/app/Toaster";
import { Icon } from "@/components/landing/Icon";
import { ApiError, postJson, Project } from "@/lib/api";
import { clearDraft, hasStringFields, loadDraft, saveDraft } from "@/lib/drafts";

const DRAFT_KEY = "new-project";
const FIELDS = ["name", "slug", "description", "visibility"] as const;
type ProjectDraft = Record<(typeof FIELDS)[number], string>;
const isProjectDraft = (value: unknown): value is ProjectDraft => hasStringFields(value, FIELDS);

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [visibility, setVisibility] = useState<"Private" | "Internal">("Private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [restored, setRestored] = useState(false);
  const [touched, setTouched] = useState(false);
  const form = useFormErrors();
  const toast = useToast();

  // What you typed is kept on this device until the project is created, so an expired session or a
  // reload does not lose it.
  useEffect(() => {
    const draft = loadDraft(DRAFT_KEY, isProjectDraft);
    if (!draft || !Object.values(draft).some(value => value.trim() && value !== "Private")) return;
    setName(draft.name); setSlug(draft.slug); setDescription(draft.description);
    setVisibility(draft.visibility === "Internal" ? "Internal" : "Private");
    setRestored(true);
  }, []);
  useEffect(() => {
    if (touched) saveDraft<ProjectDraft>(DRAFT_KEY, { name, slug, description, visibility });
  }, [touched, name, slug, description, visibility]);

  function startOver() {
    clearDraft(DRAFT_KEY);
    setName(""); setSlug(""); setDescription(""); setVisibility("Private");
    setRestored(false); setTouched(false); form.reset();
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const project = await postJson<Project>("/api/projects", { name, description, slug: slug || null, visibility });
      clearDraft(DRAFT_KEY);
      toast({ title: `${project.name} created`, text: "Next, add an environment such as Production. Its map, deployments and health live there.", action: { label: "Add an environment", href: `/projects/${project.id}/environments` } });
      router.push(`/projects/${project.id}`);
    } catch (cause) {
      // A name or slug that is already taken comes back as a conflict. The API does not say which one,
      // so the message goes under the name, with a hint about the slug when one was typed.
      if (cause instanceof ApiError && cause.kind === "conflict") form.flag("name", `${cause.message} ${slug.trim() ? "Change the name or the slug." : "Choose another name."}`);
      else if (!form.handleApiError(cause, [...FIELDS])) setError(cause);
    } finally { setBusy(false); }
  }

  return <main id="main" className="page form-page">
    <Link href="/projects" className="back-link"><Icon name="arrow-left" />Projects</Link>
    <PageHead eyebrow="New project" title="Create a project" lede="Start with a name. Add environments and components whenever you are ready." />
    {restored && <Notice tone="info" title="Your draft is back" action={<button type="button" className="button small ghost" onClick={startOver}>Start over</button>}>Hydra kept what you typed here last time, on this device.</Notice>}
    <form className="panel form-panel fade-in" noValidate onSubmit={form.onSubmit(submit)} onBlur={form.onBlur} onChange={(event) => { setTouched(true); form.onChange(event); }}>
      <label>Project name<input {...form.field("name")} required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Commerce Platform" /><FieldError form={form} name="name" /></label>
      <label>Slug<input {...form.field("slug")} value={slug} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" data-pattern-hint="Use lowercase letters, numbers and single hyphens, like commerce-platform" onChange={e => setSlug(e.target.value.toLowerCase())} placeholder="Made from the name if you leave it empty" /><FieldError form={form} name="slug" /><small>Lowercase letters, numbers and hyphens. A stable identifier for the project.</small></label>
      <label>Description<textarea {...form.field("description")} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this system do?" /><FieldError form={form} name="description" /></label>
      <label>Visibility<select {...form.field("visibility")} value={visibility} onChange={e => setVisibility(e.target.value as "Private" | "Internal")}><option value="Private">Private</option><option value="Internal">Internal</option></select><small>Recorded with the project. In this version only members can open a project, whichever you choose.</small></label>
      <ErrorNotice error={error} what="the project" />
      <div className="form-actions"><Link className="button" href="/projects">Cancel</Link><button className="button primary" disabled={busy}>{busy ? "Creating…" : "Create project"}</button></div>
    </form>
  </main>;
}
