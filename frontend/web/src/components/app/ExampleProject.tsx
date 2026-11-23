"use client";

import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/lib/api";
import { createExampleProject, EXAMPLE_PROJECT_NAME, EXAMPLE_SIZE, STEPS, type ExampleProgress } from "@/lib/demo/createExampleProject";
import { Icon } from "../landing/Icon";
import { Notice } from "./Notice";

type State =
  | { kind: "idle" }
  | { kind: "working"; progress: ExampleProgress }
  | { kind: "done"; project: Project }
  | { kind: "failed"; message: string };

/**
 * Demo mode only (NEXT_PUBLIC_ENABLE_DEMO=true): offers to create Northstar Marketplace, a large example
 * project, through the API, and shows how far it has got. Hidden once the example exists.
 */
export function ExampleProject({ exists, onCreated }: { exists: boolean; onCreated: () => void }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  if (exists && state.kind === "idle") return null;

  async function create() {
    setState({ kind: "working", progress: { step: STEPS[0], index: 0, done: 0, total: 1 } });
    try {
      const project = await createExampleProject((progress) => setState({ kind: "working", progress }));
      setState({ kind: "done", project });
      onCreated();
    } catch (error) {
      setState({ kind: "failed", message: error instanceof Error ? error.message : "The API did not answer" });
    }
  }

  const progress = state.kind === "working" ? state.progress : null;
  const share = progress ? Math.round(((progress.index + progress.done / Math.max(1, progress.total)) / STEPS.length) * 100) : 0;
  return (
    <section className="panel example-panel fade-in" aria-labelledby="example-title">
      <span className="example-icon" aria-hidden="true"><Icon name="layers" size={20} /></span>
      <div className="example-text">
        <p className="eyebrow">Demo data</p>
        <h2 id="example-title">Try Hydra with a large example</h2>
        <p>
          {EXAMPLE_PROJECT_NAME}: an online marketplace with {EXAMPLE_SIZE.components} components, {EXAMPLE_SIZE.dependencies} dependencies,{" "}
          {EXAMPLE_SIZE.environments} environments, {EXAMPLE_SIZE.deployments} deployments, recorded health with problems in Production,
          and {EXAMPLE_SIZE.workItems} work items on its board. It is created through the API like any other project, with you as its owner.
        </p>
      </div>
      <div className="example-action">
        {state.kind === "idle" && <button type="button" className="button primary" onClick={create}><Icon name="plus" />Create the example</button>}
        {progress && (
          <div className="example-progress" role="status" aria-live="polite">
            <p><span>{progress.step}</span><span className="mono">{progress.done} of {progress.total}</span></p>
            <div className="example-track" role="progressbar" aria-label="Creating the example" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}>
              <span style={{ width: `${share}%` }} />
            </div>
          </div>
        )}
        {state.kind === "done" && (
          <Link className="button primary" href={`/projects/${state.project.id}`}>Open {state.project.name}<Icon name="arrow-right" className="arrow" /></Link>
        )}
      </div>
      {state.kind === "failed" && (
        <Notice className="example-notice" title="The example stopped">
          {state.message}. What was created until then stays in your projects; you can archive it in its settings.
        </Notice>
      )}
    </section>
  );
}
