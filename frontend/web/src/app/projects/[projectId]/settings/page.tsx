"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FieldError, useFormErrors } from "@/components/app/FormErrors";
import { ErrorNotice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { ViewOnly } from "@/components/app/ProjectContext";
import { SkeletonBar } from "@/components/app/Skeleton";
import { useToast } from "@/components/app/Toaster";
import { Icon } from "@/components/landing/Icon";
import { ApiError, getJson, postJson, Project, ProjectMember, sendJson } from "@/lib/api";
import { initials } from "@/lib/format";

export default function SettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [visibility, setVisibility] = useState<"Private" | "Internal">("Private");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"Contributor" | "Viewer">("Contributor");
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const detailsForm = useFormErrors();
  const memberForm = useFormErrors();
  const toast = useToast();

  useEffect(() => {
    setError(null);
    Promise.all([getJson<Project>(`/api/projects/${projectId}`), getJson<ProjectMember[]>(`/api/projects/${projectId}/members`),
      getJson<{ id: string }>("/api/me")])
      .then(([p, people, me]) => { setProject(p); setMembers(people); setName(p.name); setDescription(p.description);
        setSlug(p.slug); setVisibility(p.visibility); setCanManage(people.some(member => member.userId === me.id && member.role === "Owner")); })
      .catch(setError);
  }, [projectId, attempt]);

  async function save() {
    try {
      const updated = await sendJson<Project>("PUT", `/api/projects/${projectId}`, { name, description, slug, visibility });
      setProject(updated); setError(null);
      toast({ title: "Settings saved", text: `${updated.name} now uses these details everywhere in Hydra.` });
    } catch (cause) {
      // A taken name or slug comes back as a conflict. The API does not say which one, so the
      // message goes under the name.
      if (cause instanceof ApiError && cause.kind === "conflict") detailsForm.flag("name", `${cause.message} Change the name or the slug.`);
      else if (!detailsForm.handleApiError(cause, ["name", "slug", "description", "visibility"])) setError(cause);
    }
  }
  async function addMember() {
    try {
      const email = memberEmail.trim();
      await postJson(`/api/projects/${projectId}/members/by-email`, { email, role: memberRole });
      const people = await getJson<ProjectMember[]>(`/api/projects/${projectId}/members`);
      setMembers(people); setMemberEmail(""); setError(null); memberForm.reset();
      const added = people.find(member => member.email?.toLowerCase() === email.toLowerCase());
      toast({ title: `${added?.displayName ?? email} added`, text: `As ${memberRole.toLowerCase()}. They can open the project the next time they load Hydra.` });
    } catch (cause) {
      // The API answers 404 when nobody with that email has signed in yet: say so under the field.
      if (cause instanceof ApiError && (cause.kind === "notFound" || cause.kind === "conflict")) memberForm.flag("email", cause.message);
      else if (!memberForm.handleApiError(cause, ["email", "role"])) setError(cause);
    }
  }
  async function archive() {
    try {
      await postJson(`/api/projects/${projectId}/archive`);
      toast({ title: `${project?.name ?? "The project"} archived`, text: "It no longer shows in your projects. Its history stays stored." });
      router.push("/projects");
    } catch (cause) { setError(cause); setConfirmArchive(false); }
  }

  return <main id="main" className="ws-page">
    <PageHead eyebrow="Admin" title="Settings" lede={canManage || !project ? "Rename the project, choose who can open it, or archive it." : "Only an owner can change these settings."} actions={<ViewOnly need="Owner" />} />
    <ErrorNotice error={error} what="the settings" onRetry={() => setAttempt(n => n + 1)} />
    <div className="stack">
      <div className="two-col">
        {!project && !error && <section className="panel" aria-busy="true" aria-label="Loading the settings"><div className="panel-skeleton"><SkeletonBar width="40%" height={18} />{[0, 1, 2].map(i => <div key={i} className="panel-skeleton" style={{ gap: 8, marginTop: 6 }}><SkeletonBar width={90} height={12} /><SkeletonBar height={40} style={{ borderRadius: 12 }} /></div>)}</div></section>}
        {project && <section className="panel fade-in"><h2>Project details</h2><form className="form-panel compact-form" noValidate onSubmit={detailsForm.onSubmit(save)} onBlur={detailsForm.onBlur} onChange={detailsForm.onChange}>
          <label>Name<input {...detailsForm.field("name")} required minLength={2} maxLength={120} disabled={!canManage} value={name} onChange={event => setName(event.target.value)} /><FieldError form={detailsForm} name="name" /></label>
          <label>Slug<input {...detailsForm.field("slug")} required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" data-pattern-hint="Use lowercase letters, numbers and single hyphens, like commerce-demo" disabled={!canManage} value={slug} onChange={event => setSlug(event.target.value.toLowerCase())} /><FieldError form={detailsForm} name="slug" /><small>Lowercase letters, numbers and hyphens.</small></label>
          <label>Description<textarea {...detailsForm.field("description")} maxLength={2000} disabled={!canManage} value={description} onChange={event => setDescription(event.target.value)} /><FieldError form={detailsForm} name="description" /></label>
          <label>Visibility<select {...detailsForm.field("visibility")} disabled={!canManage} value={visibility} onChange={event => setVisibility(event.target.value as "Private" | "Internal")}><option>Private</option><option>Internal</option></select></label>
          {canManage && <div className="form-actions"><button className="button primary">Save settings</button></div>}
        </form></section>}
        <section className="panel fade-in"><div className="panel-head"><h2>Members <span className="muted">{members.length || ""}</span></h2></div>
          <ul>{members.map(member => <li className="member-row" key={member.userId}><span className="avatar" aria-hidden="true">{initials(member.displayName)}</span><div><strong>{member.displayName}</strong><small>{member.email ?? "No email provided"}</small></div><span className="chip" data-tone={member.role === "Owner" ? "accent" : undefined}>{member.role}</span></li>)}</ul>
          {canManage && <><h3>Add a member</h3><p className="panel-note" style={{ marginTop: 0 }}>A person has to sign in once before you can add their email.</p><form className="inline-form" noValidate onSubmit={memberForm.onSubmit(addMember)} onBlur={memberForm.onBlur} onChange={memberForm.onChange} style={{ marginTop: 12 }}><label>Email<input {...memberForm.field("email")} required type="email" maxLength={320} value={memberEmail} onChange={event => setMemberEmail(event.target.value)} placeholder="teammate@example.com" /><FieldError form={memberForm} name="email" /></label><label>Role<select {...memberForm.field("role")} value={memberRole} onChange={event => setMemberRole(event.target.value as "Contributor" | "Viewer")}><option>Contributor</option><option>Viewer</option></select></label><button className="button primary"><Icon name="users" />Add member</button></form></>}
        </section>
      </div>
      {canManage && !project?.archivedAt && <section className="panel danger-zone"><h2>Archive this project</h2><p className="panel-note">Archiving hides the project from the active list. Its environments, work, deployments and events stay stored.</p>{confirmArchive
        ? <div className="confirm-row" role="group" aria-label="Confirm archiving"><p><strong>Archive {project?.name}?</strong> It disappears from the project list for everyone.</p><button className="button danger" onClick={() => void archive()}><Icon name="archive" />Archive it</button><button className="button" onClick={() => setConfirmArchive(false)}>Keep it</button></div>
        : <button className="button danger" onClick={() => setConfirmArchive(true)}><Icon name="archive" />Archive project</button>}</section>}
    </div>
  </main>;
}
