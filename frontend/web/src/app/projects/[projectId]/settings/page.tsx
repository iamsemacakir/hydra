"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { Icon } from "@/components/landing/Icon";
import { getJson, postJson, Project, ProjectMember, sendJson } from "@/lib/api";
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([getJson<Project>(`/api/projects/${projectId}`), getJson<ProjectMember[]>(`/api/projects/${projectId}/members`),
      getJson<{ id: string }>("/api/me")])
      .then(([p, people, me]) => { setProject(p); setMembers(people); setName(p.name); setDescription(p.description);
        setSlug(p.slug); setVisibility(p.visibility); setCanManage(people.some(member => member.userId === me.id && member.role === "Owner")); })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load settings."));
  }, [projectId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const updated = await sendJson<Project>("PUT", `/api/projects/${projectId}`, { name, description, slug, visibility });
      setProject(updated); setError(""); setMessage("Project settings saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save settings."); }
  }
  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await postJson(`/api/projects/${projectId}/members/by-email`, { email: memberEmail.trim(), role: memberRole });
      setMembers(await getJson<ProjectMember[]>(`/api/projects/${projectId}/members`));
      setMemberEmail(""); setError(""); setMessage("Member added.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add member."); }
  }
  async function archive() {
    try {
      await postJson(`/api/projects/${projectId}/archive`);
      router.push("/projects");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to archive project."); }
  }

  return <main id="main" className="ws-page">
    <PageHead eyebrow="Admin" title="Settings" lede={canManage || !project ? "Rename the project, choose who can open it, or archive it." : "Only an owner can change these settings."} />
    {error && <Notice>{error}</Notice>}
    {message && <Notice tone="success">{message}</Notice>}
    <div className="stack">
      <div className="two-col">
        {project && <section className="panel fade-in"><h2>Project details</h2><form className="form-panel compact-form" onSubmit={save}>
          <label>Name<input required minLength={2} maxLength={120} disabled={!canManage} value={name} onChange={event => setName(event.target.value)} /></label>
          <label>Slug<input required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={!canManage} value={slug} onChange={event => setSlug(event.target.value.toLowerCase())} /><small>Lowercase letters, numbers and hyphens.</small></label>
          <label>Description<textarea maxLength={2000} disabled={!canManage} value={description} onChange={event => setDescription(event.target.value)} /></label>
          <label>Visibility<select disabled={!canManage} value={visibility} onChange={event => setVisibility(event.target.value as "Private" | "Internal")}><option>Private</option><option>Internal</option></select></label>
          {canManage && <div className="form-actions"><button className="button primary">Save settings</button></div>}
        </form></section>}
        <section className="panel fade-in"><div className="panel-head"><h2>Members <span className="muted">{members.length || ""}</span></h2></div>
          <ul>{members.map(member => <li className="member-row" key={member.userId}><span className="avatar" aria-hidden="true">{initials(member.displayName)}</span><div><strong>{member.displayName}</strong><small>{member.email ?? "No email provided"}</small></div><span className="chip" data-tone={member.role === "Owner" ? "accent" : undefined}>{member.role}</span></li>)}</ul>
          {canManage && <><h3>Add a member</h3><p className="panel-note" style={{ marginTop: 0 }}>A person has to sign in once before you can add their email.</p><form className="inline-form" onSubmit={addMember} style={{ marginTop: 12 }}><label>Email<input required type="email" maxLength={320} value={memberEmail} onChange={event => setMemberEmail(event.target.value)} placeholder="teammate@example.com" /></label><label>Role<select value={memberRole} onChange={event => setMemberRole(event.target.value as "Contributor" | "Viewer")}><option>Contributor</option><option>Viewer</option></select></label><button className="button primary"><Icon name="users" />Add member</button></form></>}
        </section>
      </div>
      {canManage && !project?.archivedAt && <section className="panel danger-zone"><h2>Archive this project</h2><p className="panel-note">Archiving hides the project from the active list. Its environments, work, deployments and events stay stored.</p><button className="button danger" onClick={() => void archive()}><Icon name="archive" />Archive project</button></section>}
    </div>
  </main>;
}
