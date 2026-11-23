"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FieldError, useFormErrors } from "@/components/app/FormErrors";
import { ErrorNotice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { ViewOnly } from "@/components/app/ProjectContext";
import { SkeletonBar } from "@/components/app/Skeleton";
import { useToast } from "@/components/app/Toaster";
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
  const [error, setError] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrideName, setOverrideName] = useState("");
  const [overrideType, setOverrideType] = useState("Service");
  const componentForm = useFormErrors();
  const dependencyForm = useFormErrors();
  const overrideForm = useFormErrors();
  const toast = useToast();
  const mapHref = `/projects/${projectId}/topology`;

  useEffect(() => {
    setError(null);
    Promise.all([getJson<Project>(`/api/projects/${projectId}`), getJson<Component[]>(`/api/projects/${projectId}/components`),
      getJson<Dependency[]>(`/api/projects/${projectId}/dependencies`), getJson<ProjectMember[]>(`/api/projects/${projectId}/members`),
      getJson<{ id: string }>("/api/me")])
      .then(([p, nodes, edges, members, me]) => { setProject(p); setComponents(nodes); setDependencies(edges);
        setCanEdit(members.some(member => member.userId === me.id && member.role !== "Viewer")); setLoaded(true); })
      .catch(setError);
  }, [projectId, attempt]);
  const componentName = (id: string) => components.find(component => component.id === id)?.name ?? "Unknown component";

  async function createComponent() {
    try {
      const component = await postJson<Component>(`/api/projects/${projectId}/components`,
        { name, description, type, owner: owner || null, repositoryUrl: repositoryUrl || null });
      setComponents(current => [...current, component].sort((a, b) => a.name.localeCompare(b.name)));
      setName(""); setDescription(""); setOwner(""); setRepositoryUrl(""); setError(null); componentForm.reset();
      toast({ title: `${component.name} added`, text: components.length >= 1 ? "Declare what it depends on, so it joins the map." : "Add one more component, then declare how they depend on each other.", action: { label: "View on the map", href: mapHref } });
    } catch (cause) { if (!componentForm.handleApiError(cause, ["name", "type", "description", "owner", "repositoryUrl"], "name")) setError(cause); }
  }
  async function createDependency() {
    if (sourceId === targetId) { dependencyForm.flag("targetComponentId", "A component cannot depend on itself. Choose another one."); return; }
    try {
      const dependency = await postJson<Dependency>(`/api/projects/${projectId}/dependencies`,
        { sourceComponentId: sourceId, targetComponentId: targetId, type: dependencyType, source: "Declared" });
      setDependencies(current => [...current, dependency]); setSourceId(""); setTargetId(""); setError(null); dependencyForm.reset();
      toast({ title: "Dependency declared", text: `${componentName(dependency.sourceComponentId)} depends on ${componentName(dependency.targetComponentId)}.`, action: { label: "View on the map", href: mapHref } });
    } catch (cause) { if (!dependencyForm.handleApiError(cause, ["sourceComponentId", "targetComponentId", "type"], "targetComponentId")) setError(cause); }
  }
  async function saveOverride() {
    if (!editingId) return;
    try {
      const updated = await sendJson<Component>("PATCH", `/api/components/${editingId}/discovery-override`,
        { name: overrideName, type: overrideType });
      setComponents(current => current.map(component => component.id === updated.id ? updated : component));
      setEditingId(null); setError(null); overrideForm.reset();
      toast({ title: "Correction saved", text: `${updated.name} keeps this name and type, even after later scans.` });
    } catch (cause) { if (!overrideForm.handleApiError(cause, ["name", "type"], "name")) setError(cause); }
  }
  return <main id="main" className="ws-page">
    <PageHead eyebrow="Model" title="Components" lede="Register the parts of your system and declare what each one depends on."
      actions={<><ViewOnly /><Link className="button" href={mapHref}><Icon name="network" />View on the map</Link></>} />
    <ErrorNotice error={error} what="the components" onRetry={() => setAttempt(n => n + 1)} />
    <div className="stack">
      <div className="two-col">
        <section className="panel fade-in"><div className="panel-head"><h2>Components <span className="muted">{components.length || ""}</span></h2></div>
          {!loaded && !error && <ul className="component-list" aria-busy="true" aria-label="Loading components">{[0, 1, 2, 3].map(i => <li className="component-row" key={i}><span className="skeleton" style={{ width: 36, height: 36, borderRadius: 11 }} /><div><SkeletonBar width={`${46 + (i % 2) * 18}%`} height={15} /><SkeletonBar width="34%" height={20} style={{ marginTop: 8, borderRadius: 999 }} /></div></li>)}</ul>}
          <ul className="component-list">{components.map(component => <li className="component-row" key={component.id}>
            <span className="component-icon" aria-hidden="true"><Icon name={COMPONENT_TYPE_ICONS[component.type] ?? "box"} size={17} /></span>
            <div><strong>{component.name}</strong>
              <div className="component-meta"><span className="chip">{component.type}</span>{component.origin !== "Manual" && <span className="chip">{component.origin}</span>}{component.discoveryStatus && component.discoveryStatus !== "Active" && <span className="chip" data-tone="warn">{component.discoveryStatus}</span>}{(component.isNameOverridden || component.isTypeOverridden) && <span className="chip" data-tone="accent">Manual override</span>}</div>
              {(component.owner || component.description) && <small>{[component.owner, component.description].filter(Boolean).join(" · ")}</small>}
              {component.externalIdentifier && <small className="mono">{component.externalIdentifier}</small>}
            </div>
            {canEdit && component.origin === "Discovered" && <button className="button small" aria-label={`Correct the discovered name or type of ${component.name}`} onClick={() => { setEditingId(component.id); setOverrideName(component.name); setOverrideType(component.type); }}>Correct</button>}
          </li>)}</ul>
          {project && components.length === 0 && <div className="empty-state" style={{ padding: "28px 8px 12px" }}><span className="empty-icon"><Icon name="box" size={22} /></span><p className="empty-title">No components yet</p><p>{canEdit ? "Add a service, a database or a frontend below, or let a scan find them for you." : "When contributors add components, or a repository scan finds them, they appear here."}</p>{canEdit && <Link className="button" href={`/projects/${projectId}/settings/integrations`}><Icon name="scan-search" />Scan a repository</Link>}</div>}
        </section>
        <section className="panel fade-in"><div className="panel-head"><h2>Dependencies <span className="muted">{dependencies.length || ""}</span></h2></div>
          <p className="panel-note" style={{ marginTop: -6, marginBottom: 10 }}>An arrow from A to B means A depends on B.</p>
          <ul>{dependencies.map(dependency => <li className="dep-row" key={dependency.id}>
            <span className="dep-path">{componentName(dependency.sourceComponentId)}<Icon name="arrow-right" size={14} />{componentName(dependency.targetComponentId)}</span>
            <span className="dep-tags"><span className="chip">{dependency.type}</span><span className="chip">{dependency.source}</span></span>
          </li>)}</ul>
          {!loaded && !error && <ul aria-busy="true" aria-label="Loading dependencies">{[0, 1, 2].map(i => <li className="dep-row" key={i}><SkeletonBar width={`${52 + (i % 2) * 16}%`} height={15} /><SkeletonBar width={110} height={22} style={{ borderRadius: 999 }} /></li>)}</ul>}
          {project && dependencies.length === 0 && <p className="empty-line">No dependencies recorded yet. {components.length >= 2 ? "Declare one below: which component needs which." : "They come after the components."}</p>}
        </section>
      </div>

      {editingId && <section className="panel fade-in"><h2>Correct a discovered component</h2><p className="panel-note">Your name and type win over later scans of the repository.</p>
        <form className="inline-form" noValidate onSubmit={overrideForm.onSubmit(saveOverride)} onBlur={overrideForm.onBlur} onChange={overrideForm.onChange} style={{ marginTop: 14 }}><label>Name<input {...overrideForm.field("name")} required minLength={2} maxLength={120} value={overrideName} onChange={event => setOverrideName(event.target.value)} /><FieldError form={overrideForm} name="name" /></label>
          <label>Type<select {...overrideForm.field("type")} value={overrideType} onChange={event => setOverrideType(event.target.value)}>{componentTypes.map(option => <option key={option}>{option}</option>)}</select></label>
          <button className="button primary">Save correction</button><button className="button" type="button" onClick={() => { setEditingId(null); overrideForm.reset(); }}>Cancel</button></form></section>}

      {canEdit && <div className="two-col">
        <section className="panel"><h2>Add a component</h2><form className="form-panel compact-form" noValidate onSubmit={componentForm.onSubmit(createComponent)} onBlur={componentForm.onBlur} onChange={componentForm.onChange}>
          <div className="form-row"><label>Name<input {...componentForm.field("name")} required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Payment Service" /><FieldError form={componentForm} name="name" /></label><label>Type<select {...componentForm.field("type")} value={type} onChange={event => setType(event.target.value)}>{componentTypes.map(option => <option key={option}>{option}</option>)}</select></label></div>
          <label>Description<textarea {...componentForm.field("description")} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} placeholder="What does it do?" /><FieldError form={componentForm} name="description" /></label>
          <div className="form-row"><label>Owner<input {...componentForm.field("owner")} maxLength={120} value={owner} onChange={event => setOwner(event.target.value)} placeholder="Team or person" /><FieldError form={componentForm} name="owner" /></label><label>Repository URL<input {...componentForm.field("repositoryUrl")} type="url" maxLength={500} value={repositoryUrl} onChange={event => setRepositoryUrl(event.target.value)} placeholder="https://…" /><FieldError form={componentForm} name="repositoryUrl" /></label></div>
          <div className="form-actions"><button className="button primary"><Icon name="plus" />Add component</button></div></form></section>
        {components.length >= 2 ? <section className="panel"><h2>Declare a dependency</h2><p className="panel-note">The source depends on the target. Observed dependencies come from real observations, so this form only declares.</p><form className="form-panel compact-form" noValidate onSubmit={dependencyForm.onSubmit(createDependency)} onBlur={dependencyForm.onBlur} onChange={dependencyForm.onChange} style={{ marginTop: 14 }}>
          <label>Source<select {...dependencyForm.field("sourceComponentId")} data-label="The source component" required value={sourceId} onChange={event => setSourceId(event.target.value)}><option value="">Choose a component</option>{components.map(component => <option key={component.id} value={component.id}>{component.name}</option>)}</select><FieldError form={dependencyForm} name="sourceComponentId" /></label>
          <label>Depends on<select {...dependencyForm.field("targetComponentId")} data-label="The component it depends on" required value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Choose a component</option>{components.map(component => <option key={component.id} value={component.id}>{component.name}</option>)}</select><FieldError form={dependencyForm} name="targetComponentId" /></label>
          <label>Type<select {...dependencyForm.field("type")} value={dependencyType} onChange={event => setDependencyType(event.target.value)}>{dependencyTypes.map(option => <option key={option}>{option}</option>)}</select></label>
          <div className="form-actions"><button className="button primary"><Icon name="plus" />Add dependency</button></div></form></section>
          : <section className="panel"><h2>Declare a dependency</h2><p className="panel-note">Add at least two components first.</p></section>}
      </div>}
    </div>
  </main>;
}
