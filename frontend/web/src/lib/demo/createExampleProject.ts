import { getJson, postJson, sendJson, type Component, type Environment, type Health, type Iteration, type Project, type Tag, type WorkItem } from "@/lib/api";
import {
  COMPONENTS, DEPENDENCIES, deployments, ENVIRONMENTS, HEALTH, ITERATIONS, metricsFor, PROJECT, REPOSITORY_ROOT, TAGS, WORK_ITEMS,
  type EnvironmentName, type ExampleComponent,
} from "./northstar";

/*
 * Creates Northstar Marketplace (northstar.ts) through Hydra's public API, as the person who is signed in,
 * so it is an ordinary project they own. Nothing is seeded in the database directly.
 */

export const EXAMPLE_PROJECT_NAME = PROJECT.name;

export const STEPS = ["Project", "Environments", "Components", "Dependencies", "Deployments", "Health", "Board"] as const;
export type ExampleProgress = { step: (typeof STEPS)[number]; index: number; done: number; total: number };

/** What the example contains, for the text that offers it. */
export const EXAMPLE_SIZE = {
  components: COMPONENTS.length,
  dependencies: DEPENDENCIES.length,
  environments: ENVIRONMENTS.length,
  deployments: deployments().length,
  workItems: WORK_ITEMS.length,
};

/** Runs `task` for every item, a few at a time, in order, and counts each one done. */
async function each<T>(items: readonly T[], task: (item: T) => Promise<unknown>, done: () => void, width = 6): Promise<void> {
  for (let start = 0; start < items.length; start += width) {
    await Promise.all(items.slice(start, start + width).map(async (item) => {
      await task(item);
      done();
    }));
  }
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);
const dayFromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/** A stable, made-up commit hash for a component version. */
function commitFor(name: string, version: string): string {
  let hash = 2166136261;
  const text = `${name}@${version}`;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${(hash >>> 0).toString(16).padStart(8, "0")}${version.replace(/\D/g, "").padEnd(4, "0")}`.slice(0, 12);
}

/** The components that report health in an environment. */
function reporting(environment: EnvironmentName): ExampleComponent[] {
  const plan = HEALTH[environment];
  const silent = new Set(plan.silent ?? []);
  return COMPONENTS.filter((component) => (plan.reporting === "all" || plan.reporting.includes(component.name)) && !silent.has(component.name));
}

/**
 * Creates the example project and everything in it, reporting progress step by step. Throws with the
 * API's message if a request fails; what was created until then stays, and can be archived in Settings.
 */
export async function createExampleProject(report: (progress: ExampleProgress) => void): Promise<Project> {
  let index = 0;
  let done = 0;
  let total = 1;
  const begin = (step: (typeof STEPS)[number], count: number) => {
    index = STEPS.indexOf(step);
    done = 0;
    total = count;
    report({ step, index, done, total });
  };
  const tick = () => {
    done += 1;
    report({ step: STEPS[index], index, done, total });
  };

  begin("Project", 1);
  const me = await getJson<{ id: string }>("/api/me");
  const project = await postJson<Project>("/api/projects", PROJECT);
  const base = `/api/projects/${project.id}`;
  tick();

  begin("Environments", ENVIRONMENTS.length);
  const environments = new Map<string, string>();
  for (const environment of ENVIRONMENTS) {
    const created = await postJson<Environment>(`${base}/environments`, environment);
    environments.set(environment.name, created.id);
    tick();
  }

  begin("Components", COMPONENTS.length);
  const components = new Map<string, string>();
  await each(COMPONENTS, async (component) => {
    const created = await postJson<Component>(`${base}/components`, {
      name: component.name,
      description: component.description,
      type: component.type,
      repositoryUrl: component.repo ? `${REPOSITORY_ROOT}/${component.repo}` : null,
      owner: component.owner,
    });
    components.set(component.name, created.id);
  }, tick);
  const componentId = (name: string) => {
    const id = components.get(name);
    if (!id) throw new Error(`Unknown component in the example: ${name}`);
    return id;
  };

  begin("Dependencies", DEPENDENCIES.length);
  await each(DEPENDENCIES, ([source, target, type, kind]) => postJson(`${base}/dependencies`, {
    sourceComponentId: componentId(source),
    targetComponentId: componentId(target),
    type,
    source: kind ?? "Declared",
  }), tick);

  // Oldest first, so the events read in order.
  const history = deployments();
  begin("Deployments", history.length);
  await each(history, (deployment) => {
    const component = COMPONENTS.find((entry) => entry.name === deployment.component);
    const started = hoursAgo(deployment.hoursAgo);
    return postJson(`${base}/deployments`, {
      environmentId: environments.get(deployment.environment),
      componentId: componentId(deployment.component),
      version: deployment.version,
      commitSha: commitFor(deployment.component, deployment.version),
      artifactReference: `registry.example.com/northstar/${component?.repo ?? "component"}:${deployment.version}`,
      status: deployment.status,
      startedAt: started.toISOString(),
      completedAt: deployment.status === "Running" ? null : new Date(started.getTime() + deployment.minutes * 60_000).toISOString(),
    });
  }, tick, 4);

  // Everything that reports health starts healthy; problems are reported afterwards, as they happened.
  const reports = ENVIRONMENTS.flatMap((environment) => reporting(environment.name).map((component) => ({ environment: environment.name, component })));
  const problems = ENVIRONMENTS.flatMap((environment) => Object.entries(HEALTH[environment.name].problems)
    .map(([name, health]) => ({ environment: environment.name, component: COMPONENTS.find((entry) => entry.name === name), health })));
  begin("Health", reports.length + problems.length);
  const putHealth = (environment: EnvironmentName, component: ExampleComponent, health: Health) =>
    sendJson("PUT", `${base}/environments/${environments.get(environment)}/components/${componentId(component.name)}/runtime`, {
      healthStatus: health,
      ...metricsFor(component, environment, health !== "Healthy"),
    });
  await each(reports, ({ environment, component }) => putHealth(environment, component, "Healthy"), tick);
  await each(problems, ({ environment, component, health }) => (component && health ? putHealth(environment, component, health) : Promise.resolve()), tick);

  const parents = WORK_ITEMS.filter((item) => !item.parent);
  const children = WORK_ITEMS.filter((item) => item.parent);
  const moves = WORK_ITEMS.filter((item) => item.state !== "New");
  const tagLinks = WORK_ITEMS.flatMap((item) => (item.tags ?? []).map((tag) => ({ item: item.key, tag })));
  const componentLinks = WORK_ITEMS.flatMap((item) => (item.components ?? []).map((component) => ({ item: item.key, component })));
  begin("Board", ITERATIONS.length + TAGS.length + WORK_ITEMS.length + moves.length + tagLinks.length + componentLinks.length);
  const iterations = new Map<string, string>();
  for (const iteration of ITERATIONS) {
    const created = await postJson<Iteration>(`${base}/iterations`, { name: iteration.name, startDate: dayFromToday(iteration.startDays), endDate: dayFromToday(iteration.endDays), state: iteration.state });
    iterations.set(iteration.name, created.id);
    tick();
  }
  const tags = new Map<string, string>();
  for (const tag of TAGS) {
    const created = await postJson<Tag>(`${base}/tags`, { name: tag.name, colorToken: tag.color });
    tags.set(tag.name, created.id);
    tick();
  }
  const items = new Map<string, string>();
  for (const group of [parents, children]) {
    await each(group, async (item) => {
      const created = await postJson<WorkItem>(`${base}/work-items`, {
        type: item.type,
        title: item.title,
        description: item.description,
        priority: item.priority,
        assignedToUserId: item.mine ? me.id : null,
        parentId: item.parent ? items.get(item.parent) ?? null : null,
        storyPoints: item.points ?? null,
        originalEstimateHours: item.estimate ?? null,
        remainingWorkHours: item.remaining ?? item.estimate ?? null,
        iterationId: item.iteration ? iterations.get(item.iteration) ?? null : null,
        area: item.area ?? null,
      });
      items.set(item.key, created.id);
    }, tick, 4);
  }
  await each(moves, (item) => sendJson("PATCH", `/api/work-items/${items.get(item.key)}/state`, { state: item.state }), tick);
  await each(tagLinks, ({ item, tag }) => sendJson("POST", `/api/work-items/${items.get(item)}/tags/${tags.get(tag)}`), tick);
  await each(componentLinks, ({ item, component }) => sendJson("POST", `/api/work-items/${items.get(item)}/components/${componentId(component)}`), tick);

  return project;
}
