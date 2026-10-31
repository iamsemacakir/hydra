import { ApiError } from "./api";

/*
 * What to tell people when something fails: what went wrong, in their words, and how to fix it.
 * Pure, so every page says the same thing for the same problem.
 */

export type ErrorDescription = {
  title: string;
  /** How to fix it, or the server's own explanation. */
  hint: string;
  /** Whether trying again can help (it cannot when access is missing or the item is gone). */
  retry: boolean;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * @param what what was being loaded or saved, as it reads in a sentence ("the board", "this project").
 * @param development whether to add hints only a developer can act on (the API's Docker container, logs).
 */
export function describeError(error: unknown, what = "this page", development = process.env.NODE_ENV !== "production"): ErrorDescription {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case "offline":
        return { title: "You're offline", hint: "Connect to the internet, then try again.", retry: true };
      case "network":
        return {
          title: "Hydra's server can't be reached",
          hint: development ? "Check that the API is running (docker compose up -d backend), then try again." : "It may be restarting. Try again in a moment.",
          retry: true,
        };
      case "unauthorized":
        return { title: "Your session expired", hint: "Sign in again to continue. Unsaved drafts stay on this device.", retry: false };
      case "forbidden":
        return { title: "You don't have access", hint: "Only project members can see this, and only contributors can change it. Ask a project owner to add you in Settings, Members.", retry: false };
      case "notFound":
        return { title: `${capitalize(what)} wasn't found`, hint: "It may have been archived or removed, or the link is out of date.", retry: false };
      case "conflict":
      case "validation":
        return { title: "That didn't work", hint: error.message, retry: false };
      case "server":
        return {
          title: "Something went wrong on the server",
          hint: development ? "Try again. If it keeps happening, look at the API logs (docker compose logs backend)." : "Try again in a moment.",
          retry: true,
        };
      default:
        return { title: "Something went wrong", hint: error.message, retry: true };
    }
  }
  if (error instanceof Error) return { title: "Something went wrong", hint: error.message, retry: true };
  if (typeof error === "string" && error) return { title: "Something went wrong", hint: error, retry: true };
  return { title: "Something went wrong", hint: "Try again in a moment.", retry: true };
}

/** One line for places with room for a sentence only (toasts, inline form errors). */
export function errorSentence(error: unknown, what?: string): string {
  const { title, hint } = describeError(error, what);
  return hint ? `${title}. ${hint}` : `${title}.`;
}
