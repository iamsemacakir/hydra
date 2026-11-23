export type Health = "Healthy" | "Degraded" | "Unhealthy" | "Unknown";
export type Project = { id: string; name: string; description: string; slug: string; visibility: "Private" | "Internal"; archivedAt: string | null };
export type Environment = { id: string; projectId: string; name: string; type: string };
export type Component = { id: string; projectId: string; name: string; description: string; type: string; repositoryUrl: string | null; owner: string | null; origin: string; discoveryStatus: string; externalIdentifier: string | null; lastDiscoveredAt: string | null; isNameOverridden: boolean; isTypeOverridden: boolean };
export type Dependency = { id: string; sourceComponentId: string; targetComponentId: string; type: string; source: "Declared" | "Discovered" | "Observed"; lastObservedAt: string | null };
export type Metrics = { cpuPercent: number | null; memoryPercent: number | null; requestRate: number | null; errorRatePercent: number | null; latencyP95Ms: number | null };
export type TopologyNode = { id: string; name: string; type: string; health: Health; version: string | null; description: string | null; repositoryUrl: string | null; owner: string | null; metrics: Metrics; origin: string; discoveryStatus: string; repositoryConnectionId: string | null; lastDiscoveredAt: string | null };
export type TopologyEvidence = { type: string; sourceKind: string; sourcePath: string | null; sourceLocation: string | null; description: string | null; observedAt: string | null; createdAt: string };
export type TopologyEdge = { id: string; source: string; target: string; type: string; sourceKind: string; evidence: TopologyEvidence[] };
export type Topology = { projectId: string; environmentId: string; generatedAt: string; nodes: TopologyNode[]; edges: TopologyEdge[] };
export type RuntimeState = { componentId: string; healthStatus: Health; cpuPercent: number | null; memoryPercent: number | null; requestRate: number | null; errorRatePercent: number | null; latencyP95Ms: number | null };
export type OperationalEvent = { id: string; componentId: string | null; type: string; severity: string; title: string; description: string | null; occurredAt: string };
export type Deployment = { id: string; componentId: string; environmentId: string; version: string; status: string; startedAt: string; completedAt: string | null };
export type ImpactComponent = { id: string; name: string; distance: number };
export type Impact = { componentId: string; directDependents: ImpactComponent[]; indirectDependents: ImpactComponent[]; affectedPaths: { componentIds: string[] }[] };
export type WorkItemType = "UserStory" | "Task" | "Bug";
export type WorkItemState = "New" | "Active" | "Resolved" | "Closed" | "Removed";
export type WorkItemPriority = "Critical" | "High" | "Medium" | "Low";
export type WorkItem = { id: string; projectId: string; sequenceNumber: number; type: WorkItemType; title: string; description: string; state: WorkItemState; priority: WorkItemPriority; assignedToUserId: string | null; createdByUserId: string; parentId: string | null; storyPoints: number | null; originalEstimateHours: number | null; remainingWorkHours: number | null; iterationId: string | null; area: string | null; createdAt: string; updatedAt: string; closedAt: string | null };
export type WorkItemActivity = { id: string; type: string; fieldName: string | null; oldValue: string | null; newValue: string | null; occurredAt: string };
export type ProjectMember = { userId: string; displayName: string; email: string | null; role: "Owner" | "Contributor" | "Viewer" };
export type Iteration = { id: string; name: string; state: "Planned" | "Current" | "Completed" };
export type Tag = { id: string; name: string; colorToken: string | null };
export type WorkItemTag = { workItemId: string; tagId: string };
export type WorkItemComponentLink = { workItemId: string; componentId: string };
export type ProjectActivity = { id: string; occurredAt: string; kind: "Operational" | "WorkItem"; summary: string; actorName: string | null; componentId: string | null; workItemId: string | null; environmentId: string | null };
export type DriftEdge = { sourceComponentId: string; sourceName: string; targetComponentId: string; targetName: string; type: string; lastObservedAt: string | null };
export type Drift = { scope: "Project"; matching: DriftEdge[]; declaredOnly: DriftEdge[]; observedOnly: DriftEdge[]; discovered: DriftEdge[] };
export type ComponentComparison = { componentId: string; name: string; leftHasData: boolean; rightHasData: boolean; leftVersion: string | null; rightVersion: string | null; leftHealth: Health | null; rightHealth: Health | null; different: boolean };
export type EnvironmentComparison = { leftEnvironmentId: string; leftEnvironmentName: string; rightEnvironmentId: string; rightEnvironmentName: string; componentPresenceMeaning: string; dependencyScope: "Project"; declaredDependencyCount: number; components: ComponentComparison[] };
export type RepositoryConnection = { id: string; projectId: string; provider: string; name: string; repositoryUrl: string; defaultBranch: string; status: string; lastSuccessfulSyncAt: string | null; lastSyncAttemptAt: string | null; lastSyncError: string | null };
export type RepositoryScan = { id: string; repositoryConnectionId: string; status: "Pending" | "Running" | "Succeeded" | "PartiallySucceeded" | "Failed"; startedAt: string; completedAt: string | null; filesScanned: number; componentsDiscovered: number; dependenciesDiscovered: number; warningsCount: number; errorMessage: string | null; appliedAt: string | null };
export type DiscoveredComponent = { externalKey: string; name: string; type: string; sourcePath: string; sourceLocation: string };
export type DiscoveredDependency = { sourceExternalKey: string; targetExternalKey: string; type: string; sourcePath: string; sourceLocation: string; description: string };
export type DiscoveryPreview = { id: string; status: string; appliedAt: string | null; components: DiscoveredComponent[]; dependencies: DiscoveredDependency[]; warnings: { sourcePath: string; message: string }[]; newComponents: DiscoveredComponent[]; changedComponents: DiscoveredComponent[]; missingComponents: { id: string; name: string; externalIdentifier: string }[]; conflicts: DiscoveredComponent[] };
export type ImportStart = { projectId: string; environmentId: string; connectionId: string; scanId: string; jobId: string };

export const apiBase = "";

/*
 * Every call to the API goes through `request` below, so all pages get the same behaviour:
 * - a failed call throws an ApiError that says what kind of problem it was (offline, no access, ...);
 * - an expired session sends the visitor to sign in and back to the same page afterwards;
 * - calls in flight are counted for the loading bar and the slow-network notice (background polls are not);
 * - data prefetched on hover is handed to the first page that asks for it.
 */

export type ApiErrorKind = "offline" | "network" | "unauthorized" | "forbidden" | "notFound" | "conflict" | "validation" | "server" | "unknown";

/** An API call that did not succeed: what kind of problem it was, and for validation problems, which fields. */
export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  /** Validation messages by field name, as the API sends them (ASP.NET problem details). */
  readonly fieldErrors: Record<string, string[]>;
  constructor(message: string, status: number, kind: ApiErrorKind, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind;
    this.fieldErrors = fieldErrors;
  }
}

export function errorKind(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation";
  if (status >= 500) return "server";
  return "unknown";
}

type ProblemDetails = { title?: string; detail?: string; errors?: Record<string, string[]> };
type RequestOptions = { quiet?: boolean };

/** Calls in flight and since when the API has been busy. Read by the loading bar and the slow-network notice. */
export type RequestActivity = { count: number; since: number | null };
let activity: RequestActivity = { count: 0, since: null };
const activityListeners = new Set<() => void>();

export function subscribeRequests(listener: () => void): () => void {
  activityListeners.add(listener);
  return () => { activityListeners.delete(listener); };
}
export function requestActivity(): RequestActivity { return activity; }
export const idleActivity: RequestActivity = { count: 0, since: null };

function track(delta: 1 | -1) {
  const count = Math.max(0, activity.count + delta);
  activity = { count, since: count === 0 ? null : activity.since ?? Date.now() };
  activityListeners.forEach((listener) => listener());
}

let leaving = false;

/**
 * The session ended: sign in again and come back to this page. Nothing typed is lost on the way: the
 * forms that keep drafts (new project, work item) save them on this device as you type.
 */
function sessionExpired() {
  if (typeof window === "undefined" || leaving) return;
  leaving = true;
  const back = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/signin?reason=expired&callbackUrl=${encodeURIComponent(back)}`);
}

async function request<T>(method: string, path: string, body: unknown, jsonHeader: boolean, { quiet = false }: RequestOptions = {}): Promise<T> {
  if (!quiet) track(1);
  try {
    let response: Response;
    try {
      response = await fetch(`${apiBase}${path}`, {
        method,
        cache: "no-store",
        headers: jsonHeader ? { "Content-Type": "application/json" } : undefined,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      throw new ApiError(offline ? "You are offline." : "Hydra's server could not be reached.", 0, offline ? "offline" : "network");
    }
    if (response.status === 401) {
      sessionExpired();
      throw new ApiError("Your session expired. Sign in again to continue.", 401, "unauthorized");
    }
    if (!response.ok) {
      const problem = await response.json().catch(() => null) as ProblemDetails | null;
      const message = problem?.detail ?? problem?.title ?? `API request failed (${response.status})`;
      throw new ApiError(message, response.status, errorKind(response.status), problem?.errors ?? {});
    }
    const text = response.status === 204 ? "" : await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } finally {
    if (!quiet) track(-1);
  }
}

/* Start the work before they ask: a page can be fetched on hover and handed over when it is opened. */
const PREFETCH_TTL_MS = 15_000;
const prefetched = new Map<string, { at: number; promise: Promise<unknown> }>();

export function prefetchJson(path: string): void {
  if (typeof window === "undefined") return;
  const hit = prefetched.get(path);
  if (hit && Date.now() - hit.at < PREFETCH_TTL_MS) return;
  const promise = request<unknown>("GET", path, undefined, false, { quiet: true });
  promise.catch(() => prefetched.delete(path));
  prefetched.set(path, { at: Date.now(), promise });
}

export async function getJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const hit = prefetched.get(path);
  if (hit) {
    prefetched.delete(path);
    if (Date.now() - hit.at < PREFETCH_TTL_MS) return hit.promise as Promise<T>;
  }
  return request<T>("GET", path, undefined, false, options);
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body || undefined, true);
}

export async function sendJson<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  return request<T>(method, path, body, body !== undefined);
}
