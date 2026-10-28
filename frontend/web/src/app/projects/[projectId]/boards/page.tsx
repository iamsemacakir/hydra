"use client";

import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Notice } from "@/components/app/Notice";
import { PageHead } from "@/components/app/PageHead";
import { StatusGlyph, StatusText } from "@/components/app/Status";
import { Icon, type IconName } from "@/components/landing/Icon";
import { Component, getJson, Iteration, postJson, Project, ProjectMember, sendJson, Tag, WorkItem, WorkItemActivity, WorkItemComponentLink, WorkItemPriority, WorkItemState, WorkItemTag, WorkItemType } from "@/lib/api";
import { formatWhen, formatWhenFull, initials } from "@/lib/format";
import { priorityTone, workStateLook } from "@/lib/status";

type Draft = { type: WorkItemType; title: string; description: string; priority: WorkItemPriority; assignedToUserId: string; parentId: string; storyPoints: string; originalEstimateHours: string; remainingWorkHours: string; iterationId: string; area: string; tagIds: string[]; componentIds: string[] };
const states: WorkItemState[] = ["New", "Active", "Resolved", "Closed"];
const types: WorkItemType[] = ["UserStory", "Task", "Bug"];
const priorities: WorkItemPriority[] = ["Critical", "High", "Medium", "Low"];
const emptyDraft = (): Draft => ({ type: "Task", title: "", description: "", priority: "Medium", assignedToUserId: "", parentId: "", storyPoints: "", originalEstimateHours: "", remainingWorkHours: "", iterationId: "", area: "", tagIds: [], componentIds: [] });
const numberOrNull = (value: string) => value.trim() === "" ? null : Number(value);
const TYPE_ICONS: Record<WorkItemType, IconName> = { UserStory: "bookmark", Task: "square-check", Bug: "bug" };
const typeLabel = (type: WorkItemType) => type === "UserStory" ? "Story" : type;

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [links, setLinks] = useState<WorkItemTag[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [componentLinks, setComponentLinks] = useState<WorkItemComponentLink[]>([]);
  const [meId, setMeId] = useState("");
  const [view, setView] = useState<"board" | "backlog">("board");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [iterationFilter, setIterationFilter] = useState("");
  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [activity, setActivity] = useState<WorkItemActivity[]>([]);
  const [newTag, setNewTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropState, setDropState] = useState<WorkItemState | null>(null);
  const [moveAnnouncement, setMoveAnnouncement] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const itemQuery = view === "backlog" && stateFilter === "Removed" ? "?state=Removed" : "";
      const [p, work, people, cycles, labels, attached, systemComponents, attachedComponents, me] = await Promise.all([
        getJson<Project>(`/api/projects/${projectId}`), getJson<WorkItem[]>(`/api/projects/${projectId}/work-items${itemQuery}`),
        getJson<ProjectMember[]>(`/api/projects/${projectId}/members`), getJson<Iteration[]>(`/api/projects/${projectId}/iterations`),
        getJson<Tag[]>(`/api/projects/${projectId}/tags`), getJson<WorkItemTag[]>(`/api/projects/${projectId}/work-item-tags`),
        getJson<Component[]>(`/api/projects/${projectId}/components`), getJson<WorkItemComponentLink[]>(`/api/projects/${projectId}/work-item-component-links`),
        getJson<{ id: string }>("/api/me")
      ]);
      setProject(p); setItems(work); setMembers(people); setIterations(cycles); setTags(labels); setLinks(attached);
      setComponents(systemComponents); setComponentLinks(attachedComponents); setMeId(me.id); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load board."); }
    finally { setLoading(false); }
  }, [projectId, stateFilter, view]);
  useEffect(() => { void load(); }, [load]);

  const canEdit = members.some(member => member.userId === meId && member.role !== "Viewer");
  const memberName = (id: string | null) => members.find(member => member.userId === id)?.displayName ?? "Unassigned";
  const tagIdsFor = (itemId: string) => links.filter(link => link.workItemId === itemId).map(link => link.tagId);
  const componentIdsFor = (itemId: string) => componentLinks.filter(link => link.workItemId === itemId).map(link => link.componentId);
  const tagNamesFor = (itemId: string) => tags.filter(tag => tagIdsFor(itemId).includes(tag.id));
  const filtered = useMemo(() => items.filter(item => {
    if (search && !`${item.title} ${item.description} ${item.sequenceNumber}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && item.type !== typeFilter) return false;
    if (priorityFilter && item.priority !== priorityFilter) return false;
    if (view === "backlog" && stateFilter && item.state !== stateFilter) return false;
    if (assigneeFilter === "me" && item.assignedToUserId !== meId) return false;
    if (assigneeFilter === "unassigned" && item.assignedToUserId !== null) return false;
    if (assigneeFilter && !["me", "unassigned"].includes(assigneeFilter) && item.assignedToUserId !== assigneeFilter) return false;
    if (iterationFilter === "backlog" && item.iterationId !== null) return false;
    if (iterationFilter === "current" && !iterations.some(iteration => iteration.id === item.iterationId && iteration.state === "Current")) return false;
    if (iterationFilter && !["backlog", "current"].includes(iterationFilter) && item.iterationId !== iterationFilter) return false;
    return true;
  }), [items, search, typeFilter, priorityFilter, view, stateFilter, assigneeFilter, meId, iterationFilter, iterations]);

  function openNew() { setEditing(null); setDraft(emptyDraft()); setActivity([]); setDrawerOpen(true); }
  function openItem(item: WorkItem) {
    setEditing(item);
    setDraft({ type: item.type, title: item.title, description: item.description, priority: item.priority,
      assignedToUserId: item.assignedToUserId ?? "", parentId: item.parentId ?? "", storyPoints: item.storyPoints?.toString() ?? "",
      originalEstimateHours: item.originalEstimateHours?.toString() ?? "", remainingWorkHours: item.remainingWorkHours?.toString() ?? "",
      iterationId: item.iterationId ?? "", area: item.area ?? "", tagIds: tagIdsFor(item.id), componentIds: componentIdsFor(item.id) });
    setActivity([]); setDrawerOpen(true);
    void getJson<WorkItemActivity[]>(`/api/work-items/${item.id}/activity`).then(setActivity).catch(() => setActivity([]));
  }
  function changeDraft<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(current => ({ ...current, [key]: value })); }
  async function syncTags(itemId: string, desired: string[]) {
    const current = tagIdsFor(itemId);
    for (const id of desired.filter(id => !current.includes(id))) await sendJson<void>("POST", `/api/work-items/${itemId}/tags/${id}`);
    for (const id of current.filter(id => !desired.includes(id))) await sendJson<void>("DELETE", `/api/work-items/${itemId}/tags/${id}`);
  }
  async function syncComponents(itemId: string, desired: string[]) {
    const current = componentIdsFor(itemId);
    for (const id of desired.filter(id => !current.includes(id))) await sendJson<void>("POST", `/api/work-items/${itemId}/components/${id}`);
    for (const id of current.filter(id => !desired.includes(id))) await sendJson<void>("DELETE", `/api/work-items/${itemId}/components/${id}`);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const payload = { type: draft.type, title: draft.title, description: draft.description, priority: draft.priority,
      assignedToUserId: draft.assignedToUserId || null, parentId: draft.parentId || null, storyPoints: numberOrNull(draft.storyPoints),
      originalEstimateHours: numberOrNull(draft.originalEstimateHours), remainingWorkHours: numberOrNull(draft.remainingWorkHours),
      iterationId: draft.iterationId || null, area: draft.area || null };
    try {
      const saved = editing ? await sendJson<WorkItem>("PUT", `/api/work-items/${editing.id}`, payload)
        : await postJson<WorkItem>(`/api/projects/${projectId}/work-items`, payload);
      await syncTags(saved.id, draft.tagIds);
      await syncComponents(saved.id, draft.componentIds);
      setDrawerOpen(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save work item."); }
    finally { setBusy(false); }
  }
  async function move(item: WorkItem, state: WorkItemState) {
    if (!canEdit || movingId || item.state === state) return;
    setMovingId(item.id);
    setError("");
    setMoveAnnouncement("");
    setItems(current => current.map(candidate => candidate.id === item.id ? { ...candidate, state } : candidate));
    try {
      await sendJson<WorkItem>("PATCH", `/api/work-items/${item.id}/state`, { state });
      setMoveAnnouncement(`Moved ${item.title} to ${state}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to move work item.");
      await load();
    } finally { setMovingId(null); }
  }
  function dropOn(state: WorkItemState) {
    const item = items.find(candidate => candidate.id === draggedId);
    setDraggedId(null);
    setDropState(null);
    if (item) void move(item, state);
  }
  async function addTag() {
    if (!newTag.trim()) return;
    try {
      const tag = await postJson<Tag>(`/api/projects/${projectId}/tags`, { name: newTag.trim(), colorToken: "blue" });
      setTags(current => [...current, tag]); changeDraft("tagIds", [...draft.tagIds, tag.id]); setNewTag("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add tag."); }
  }
  const badge = (item: WorkItem) => <><span className={`work-type ${item.type.toLowerCase()}`}><Icon name={TYPE_ICONS[item.type]} size={14} />{typeLabel(item.type)}</span><span className="work-number">#{item.sequenceNumber}</span></>;
  const itemTags = (item: WorkItem) => <div className="work-tags">{tagNamesFor(item.id).map(tag => <span className={`work-tag tag-${tag.colorToken ?? "slate"}`} key={tag.id}>{tag.name}</span>)}</div>;
  const activityValue = (field: string | null, value: string | null) =>
    field === "Tag" ? tags.find(tag => tag.id === value)?.name ?? value :
    field === "Component" ? components.find(component => component.id === value)?.name ?? value : value;
  const assignee = (id: string | null) => <span className="assignee">{id ? <span className="avatar" data-size="sm" aria-hidden="true">{initials(memberName(id))}</span> : null}<span>{memberName(id)}</span></span>;

  return <main id="main" className="ws-page">
    <PageHead eyebrow="Plan" title="Boards" lede="Plan work next to the system it changes. Link a work item to a component and it shows up on the topology."
      actions={canEdit && <button className="button primary" onClick={openNew}><Icon name="plus" />New work item</button>} />
    <div className="board-toolbar">
      <div className="seg" role="group" aria-label="View"><button className="seg-option" aria-pressed={view === "board"} onClick={() => setView("board")}><Icon name="square-kanban" size={15} />Board</button><button className="seg-option" aria-pressed={view === "backlog"} onClick={() => setView("backlog")}><Icon name="layers" size={15} />Backlog</button></div>
      <div className="search-field"><Icon name="search" /><input type="search" aria-label="Search work items" placeholder="Search work items" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <select aria-label="Filter type" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="">All types</option>{types.map(type => <option key={type} value={type}>{typeLabel(type)}</option>)}</select>
      {view === "backlog" && <select aria-label="Filter state" value={stateFilter} onChange={event => setStateFilter(event.target.value)}><option value="">All states</option>{[...states, "Removed"].map(state => <option key={state}>{state}</option>)}</select>}
      <select aria-label="Filter priority" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}><option value="">All priorities</option>{priorities.map(priority => <option key={priority}>{priority}</option>)}</select>
      <select aria-label="Filter assignee" value={assigneeFilter} onChange={event => setAssigneeFilter(event.target.value)}><option value="">All assignees</option><option value="me">Assigned to me</option><option value="unassigned">Unassigned</option>{members.map(member => <option value={member.userId} key={member.userId}>{member.displayName}</option>)}</select>
      <select aria-label="Filter iteration" value={iterationFilter} onChange={event => setIterationFilter(event.target.value)}><option value="">All iterations</option><option value="current">Current</option><option value="backlog">Backlog</option>{iterations.map(iteration => <option value={iteration.id} key={iteration.id}>{iteration.name}</option>)}</select>
    </div>
    {error && !drawerOpen && <Notice>{error}</Notice>}
    <p className="sr-only" role="status">{moveAnnouncement}</p>
    {loading && <div className="board-columns" aria-busy="true" aria-label="Loading work items">{states.map(state => <section className="board-column" key={state}><h2>{state}</h2><div className="board-cards"><div className="work-card"><span className="skeleton" style={{ display: "block", height: 14, width: "40%" }} /><span className="skeleton" style={{ display: "block", height: 16, width: "90%", marginTop: 12 }} /></div></div></section>)}</div>}
    {!loading && project && view === "board" && items.length > 0 && <><p className="board-hint">{canEdit ? <><Icon name="grip-vertical" size={14} />Drag a card to another column, or use its Move menu.</> : "You can view this board. Ask an owner for contributor access to change it."}</p><div className="board-columns fade-in">{states.map(state => { const look = workStateLook(state); const inColumn = filtered.filter(item => item.state === state); return <section className={`board-column${dropState === state ? " drop-target" : ""}`} key={state} aria-label={`${state}, ${inColumn.length} items`}
      onDragOver={event => { if (canEdit && draggedId) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; if (dropState !== state) setDropState(state); } }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null) && dropState === state) setDropState(null); }}
      onDrop={event => { event.preventDefault(); dropOn(state); }}>
      <h2 data-tone={look.tone}><StatusGlyph glyph={look.glyph} />{state}<span className="count">{inColumn.length}</span></h2><div className="board-cards">{inColumn.map(item => <article className={`work-card${draggedId === item.id ? " dragging" : ""}`} key={item.id}
        draggable={canEdit && !movingId}
        onDragStart={event => { if (!canEdit || movingId) return; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); setDraggedId(item.id); }}
        onDragEnd={() => { setDraggedId(null); setDropState(null); }}>
        <div className="work-card-head">{badge(item)}<span className="priority" data-tone={priorityTone(item.priority)}>{item.priority}</span>{canEdit && <span className="drag-grip" aria-hidden="true" title="Drag to move"><Icon name="grip-vertical" size={14} /></span>}</div><button className="work-title" onClick={() => openItem(item)}>{item.title}</button>{tagNamesFor(item.id).length > 0 && itemTags(item)}<div className="work-card-foot">{assignee(item.assignedToUserId)}{item.storyPoints !== null && <span className="mono">{item.storyPoints} pts</span>}</div>{canEdit && <select aria-label={`Move ${item.title}`} disabled={movingId === item.id} value={item.state} onChange={event => void move(item, event.target.value as WorkItemState)}>{[...states, "Removed"].map(option => <option key={option} value={option}>{option === item.state ? `In ${option}` : `Move to ${option}`}</option>)}</select>}</article>)}{inColumn.length === 0 && <p className="board-empty">{draggedId ? "Drop here" : "No items"}</p>}</div></section>; })}</div></>}
    {!loading && project && view === "backlog" && <div className="panel table-panel fade-in"><table><thead><tr><th>ID</th><th>Type</th><th>Title</th><th>State</th><th>Priority</th><th>Assignee</th><th>Iteration</th><th>Tags</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td className="mono">#{item.sequenceNumber}</td><td><span className={`work-type ${item.type.toLowerCase()}`}><Icon name={TYPE_ICONS[item.type]} size={14} />{typeLabel(item.type)}</span></td><td><button className="table-link" onClick={() => openItem(item)}>{item.title}</button></td><td><StatusText look={workStateLook(item.state)} /></td><td><span className="priority" data-tone={priorityTone(item.priority)}>{item.priority}</span></td><td>{assignee(item.assignedToUserId)}</td><td>{iterations.find(iteration => iteration.id === item.iterationId)?.name ?? "Backlog"}</td><td>{itemTags(item)}</td></tr>)}</tbody></table>{filtered.length === 0 && <p className="muted">No work items match these filters.</p>}</div>}
    {!loading && project && items.length === 0 && view === "board" && <section className="tile empty-state fade-in"><span className="empty-icon"><Icon name="square-kanban" size={22} /></span><h2>No work items yet</h2><p>Create a story, a task or a bug to start the board.</p>{canEdit && <button className="button primary" onClick={openNew}><Icon name="plus" />Create work item</button>}</section>}
    {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}><aside className="work-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") setDrawerOpen(false); }}><div className="drawer-heading"><div><p className="eyebrow">{editing ? `Work item #${editing.sequenceNumber}` : "New work item"}</p><h2 id="drawer-title">{editing ? editing.title : "Create a work item"}</h2></div><button className="button ghost icon-only" autoFocus aria-label="Close" onClick={() => setDrawerOpen(false)}><Icon name="x" size={18} /></button></div><form onSubmit={submit} className="form-panel drawer-form"><fieldset disabled={!canEdit || busy}><div className="form-row"><label>Type<select value={draft.type} onChange={event => changeDraft("type", event.target.value as WorkItemType)}>{types.map(type => <option key={type} value={type}>{typeLabel(type)}</option>)}</select></label><label>Priority<select value={draft.priority} onChange={event => changeDraft("priority", event.target.value as WorkItemPriority)}>{priorities.map(priority => <option key={priority}>{priority}</option>)}</select></label></div><label>Title<input required minLength={2} maxLength={240} value={draft.title} onChange={event => changeDraft("title", event.target.value)} placeholder="What needs to happen?" /></label><label>Description<textarea maxLength={10000} value={draft.description} onChange={event => changeDraft("description", event.target.value)} /></label><div className="form-row"><label>Assignee<select value={draft.assignedToUserId} onChange={event => changeDraft("assignedToUserId", event.target.value)}><option value="">Unassigned</option>{members.map(member => <option value={member.userId} key={member.userId}>{member.displayName}</option>)}</select></label><label>Iteration<select value={draft.iterationId} onChange={event => changeDraft("iterationId", event.target.value)}><option value="">Backlog</option>{iterations.map(iteration => <option value={iteration.id} key={iteration.id}>{iteration.name}</option>)}</select></label></div><div className="form-row"><label>Story points<input type="number" min="0" value={draft.storyPoints} onChange={event => changeDraft("storyPoints", event.target.value)} /></label><label>Area<input maxLength={120} value={draft.area} onChange={event => changeDraft("area", event.target.value)} /></label></div><div className="form-row"><label>Original estimate (hours)<input type="number" min="0" step="0.25" value={draft.originalEstimateHours} onChange={event => changeDraft("originalEstimateHours", event.target.value)} /></label><label>Remaining work (hours)<input type="number" min="0" step="0.25" value={draft.remainingWorkHours} onChange={event => changeDraft("remainingWorkHours", event.target.value)} /></label></div><label>Parent work item<select value={draft.parentId} onChange={event => changeDraft("parentId", event.target.value)}><option value="">None</option>{items.filter(item => item.id !== editing?.id).map(item => <option value={item.id} key={item.id}>#{item.sequenceNumber} {item.title}</option>)}</select></label><div className="tag-picker"><strong>Tags</strong><div>{tags.map(tag => <label key={tag.id}><input type="checkbox" checked={draft.tagIds.includes(tag.id)} onChange={event => changeDraft("tagIds", event.target.checked ? [...draft.tagIds, tag.id] : draft.tagIds.filter(id => id !== tag.id))} /><span className={`work-tag tag-${tag.colorToken ?? "slate"}`}>{tag.name}</span></label>)}</div><div className="inline-form"><input aria-label="New tag name" maxLength={60} placeholder="New tag" value={newTag} onChange={event => setNewTag(event.target.value)} /><button className="button" type="button" onClick={() => void addTag()}><Icon name="plus" size={14} />Add tag</button></div></div><div className="tag-picker"><strong>Linked components</strong><div>{components.map(component => <label key={component.id}><input type="checkbox" checked={draft.componentIds.includes(component.id)} onChange={event => changeDraft("componentIds", event.target.checked ? [...draft.componentIds, component.id] : draft.componentIds.filter(id => id !== component.id))} /><span>{component.name}</span></label>)}</div>{components.length === 0 && <small>Add a component to the project to link work with operations.</small>}</div></fieldset>{error && <p className="error" role="alert">{error}</p>}{canEdit && <div className="form-actions"><button className="button" type="button" onClick={() => setDrawerOpen(false)}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create work item"}</button></div>}</form>{editing && <section className="activity-list"><h3>Activity</h3>{activity.map(entry => <p key={entry.id}><strong>{entry.type}</strong> {entry.fieldName && `${entry.fieldName}: `}{entry.oldValue && `${activityValue(entry.fieldName, entry.oldValue)} → `}{activityValue(entry.fieldName, entry.newValue)} <small><time dateTime={entry.occurredAt} title={formatWhenFull(entry.occurredAt)}>{formatWhen(entry.occurredAt)}</time></small></p>)}{activity.length === 0 && <p>No activity yet.</p>}</section>}</aside></div>}
  </main>;
}
