"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { Icon } from "@/components/landing/Icon";
import { Component, Dependency, getJson, postJson, Project, ProjectMember, sendJson } from "@/lib/api";
import { COMPONENT_TYPE_ICONS } from "@/lib/componentTypes";

const componentTypes = ["Frontend", "Service", "Database", "MessageBroker", "Cache", "ExternalService", "Gateway", "Worker", "Other"];
const dependencyTypes = ["Http", "Database", "Messaging", "Cache", "Infrastructure", "External", "Other"];

export default function ComponentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Service");
  const [owner, setOwner] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [dependencyType, setDependencyType] = useState("Http");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrideName, setOverrideName] = useState("");
  const [overrideType, setOverrideType] = useState("Service");

  useEffect(() => {
    Promise.all([getJson<Project>(`/api/projects/${projectId}`), getJson<Component[]>(`/api/projects/${projectId}/components`),
      getJson<Dependency[]>(`/api/projects/${projectId}/dependencies`), getJson<ProjectMember[]>(`/api/projects/${projectId}/members`),
      getJson<{ id: string }>("/api/me")])
      .then(([p, nodes, edges, members, me]) => { setProject(p); setComponents(nodes); setDependencies(edges);
        setCanEdit(members.some(member => member.userId === me.id && member.role !== "Viewer")); })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load components."));
  }, [projectId]);
  const componentName = (id: string) => components.find(component => component.id === id)?.name ?? "Unknown component";

  async function createComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const component = await postJson<Component>(`/api/projects/${projectId}/components`,
        { name, description, type, owner: owner || null, repositoryUrl: repositoryUrl || null });
      setComponents(current => [...current, component].sort((a, b) => a.name.localeCompare(b.name)));
      setName(""); setDescription(""); setOwner(""); setRepositoryUrl(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create component."); }
  }
  async function createDependency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const dependency = await postJson<Dependency>(`/api/projects/${projectId}/dependencies`,
        { sourceComponentId: sourceId, targetComponentId: targetId, type: dependencyType, source: "Declared" });
      setDependencies(current => [...current, dependency]); setSourceId(""); setTargetId(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create dependency."); }
  }
  async function saveOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    try {
      const updated = await sendJson<Component>("PATCH", `/api/components/${editingId}/discovery-override`,
        { name: overrideName, type: overrideType });
      setComponents(current => current.map(component => component.id === updated.id ? updated : component));
      setEditingId(null); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save discovery override."); }
  }
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Model" title="Components" lede="Register the parts of your system and declare what each one depends on."
      actions={<Link className="button" href={`/projects/${projectId}/topology`}><Icon name="network" />View on the map</Link>} />
    {error && <Notice>{error}</Notice>}
    <div className="stack">
      <div className="two-col">
        <section className="panel fade-in"><div className="panel-head"><h2>Components <span className="muted">{components.length || ""}</span></h2></div>
          <ul className="component-list">{components.map(component => <li className="component-row" key={component.id}>
            <span className="component-icon" aria-hidden="true"><Icon name={COMPONENT_TYPE_ICONS[component.type] ?? "box"} size={17} /></span>
            <div><strong>{component.name}</strong>
              <div className="component-meta"><span className="chip">{component.type}</span>{component.origin !== "Manual" && <span className="chip">{component.origin}</span>}{component.discoveryStatus && component.discoveryStatus !== "Active" && <span className="chip" data-tone="warn">{component.discoveryStatus}</span>}{(component.isNameOverridden || component.isTypeOverridden) && <span className="chip" data-tone="accent">Manual override</span>}</div>
              {(component.owner || component.description) && <small>{[component.owner, component.description].filter(Boolean).join(" · ")}</small>}
              {component.externalIdentifier && <small className="mono">{component.externalIdentifier}</small>}
            </div>
            {canEdit && component.origin === "Discovered" && <button className="button small" aria-label={`Correct the discovered name or type of ${component.name}`} onClick={() => { setEditingId(component.id); setOverrideName(component.name); setOverrideType(component.type); }}>Correct</button>}
          </li>)}</ul>
          {project && components.length === 0 && <p className="empty-line">No components yet. Add a service, a database, a frontend or anything else your system is made of.</p>}
        </section>
        <section className="panel fade-in"><div className="panel-head"><h2>Dependencies <span className="muted">{dependencies.length || ""}</span></h2></div>
          <p className="panel-note" style={{ marginTop: -6, marginBottom: 10 }}>An arrow from A to B means A depends on B.</p>
          <ul>{dependencies.map(dependency => <li className="dep-row" key={dependency.id}>
            <span className="dep-path">{componentName(dependency.sourceComponentId)}<Icon name="arrow-right" size={14} />{componentName(dependency.targetComponentId)}</span>
            <span className="dep-tags"><span className="chip">{dependency.type}</span><span className="chip">{dependency.source}</span></span>
          </li>)}</ul>
          {project && dependencies.length === 0 && <p className="empty-line">No dependencies recorded yet.</p>}
        </section>
      </div>

      {editingId && <section className="panel fade-in"><h2>Correct a discovered component</h2><p className="panel-note">Your name and type win over later scans of the repository.</p>
        <form className="inline-form" onSubmit={saveOverride} style={{ marginTop: 14 }}><label>Name<input required minLength={2} maxLength={120} value={overrideName} onChange={event => setOverrideName(event.target.value)} /></label>
          <label>Type<select value={overrideType} onChange={event => setOverrideType(event.target.value)}>{componentTypes.map(option => <option key={option}>{option}</option>)}</select></label>
          <button className="button primary">Save correction</button><button className="button" type="button" onClick={() => setEditingId(null)}>Cancel</button></form></section>}

      {canEdit && <div className="two-col">
        <section className="panel"><h2>Add a component</h2><form className="form-panel compact-form" onSubmit={createComponent}>
          <div className="form-row"><label>Name<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Payment Service" /></label><label>Type<select value={type} onChange={event => setType(event.target.value)}>{componentTypes.map(option => <option key={option}>{option}</option>)}</select></label></div>
          <label>Description<textarea maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} placeholder="What does it do?" /></label>
          <div className="form-row"><label>Owner<input maxLength={120} value={owner} onChange={event => setOwner(event.target.value)} placeholder="Team or person" /></label><label>Repository URL<input type="url" maxLength={500} value={repositoryUrl} onChange={event => setRepositoryUrl(event.target.value)} placeholder="https://…" /></label></div>
          <div className="form-actions"><button className="button primary"><Icon name="plus" />Add component</button></div></form></section>
        {components.length >= 2 ? <section className="panel"><h2>Declare a dependency</h2><p className="panel-note">The source depends on the target. Observed dependencies come from real observations, so this form only declares.</p><form className="form-panel compact-form" onSubmit={createDependency} style={{ marginTop: 14 }}>
          <label>Source<select required value={sourceId} onChange={event => setSourceId(event.target.value)}><option value="">Choose a component</option>{components.map(component => <option key={component.id} value={component.id}>{component.name}</option>)}</select></label>
          <label>Depends on<select required value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Choose a component</option>{components.map(component => <option key={component.id} value={component.id}>{component.name}</option>)}</select></label>
          <label>Type<select value={dependencyType} onChange={event => setDependencyType(event.target.value)}>{dependencyTypes.map(option => <option key={option}>{option}</option>)}</select></label>
          <div className="form-actions"><button className="button primary"><Icon name="plus" />Add dependency</button></div></form></section>
          : <section className="panel"><h2>Declare a dependency</h2><p className="panel-note">Add at least two components first.</p></section>}
      </div>}
    </div>
  </main>;
}
