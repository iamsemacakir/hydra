/**
 * What sign-in needs from the environment, and what to tell a visitor when it fails.
 * Pure functions, so the sign-in page only renders the answer. Values are never returned,
 * only the names of settings that are missing.
 */

export const REQUIRED_AUTH_SETTINGS = ["AUTH_SECRET", "AUTH_KEYCLOAK_ID", "AUTH_KEYCLOAK_SECRET", "AUTH_KEYCLOAK_ISSUER"] as const;
export type AuthSetting = (typeof REQUIRED_AUTH_SETTINGS)[number];

type Env = Readonly<Record<string, string | undefined>>;

/** Settings that are not set, empty, or still the placeholder from an example file. */
export function missingAuthSettings(env: Env): AuthSetting[] {
  return REQUIRED_AUTH_SETTINGS.filter((name) => {
    const value = (env[name] ?? (name === "AUTH_SECRET" ? env.NEXTAUTH_SECRET : undefined))?.trim();
    return !value || value.startsWith("replace_with_");
  });
}

export type SignInNotice = {
  tone: "error" | "info";
  title: string;
  text: string;
  /** Extra steps for developers. Only filled in development, never in production. */
  hints: string[];
};

export type SignInContext = {
  development: boolean;
  missing: readonly AuthSetting[];
  issuer?: string;
};

function keycloakHints(context: SignInContext): string[] {
  if (!context.development) return [];
  return [
    `Check that Keycloak is running${context.issuer ? ` at ${context.issuer}` : ""}. From the repository root: docker compose up -d postgres keycloak backend.`,
    "If this computer cannot resolve keycloak.localhost, add the line 127.0.0.1 keycloak.localhost to its hosts file (on Windows: C:\\Windows\\System32\\drivers\\etc\\hosts).",
  ];
}

/**
 * What to show on the sign-in page. Auth.js sends visitors back with ?error=<code> (codes:
 * https://authjs.dev/reference/core/errors). Missing settings win over any code, because nothing
 * else can work until they are set. Unknown codes get the generic message.
 */
export function signInNotice(code: string | undefined, context: SignInContext): SignInNotice | null {
  if (context.missing.length > 0) {
    return context.development
      ? {
          tone: "error",
          title: "Sign-in is not set up yet.",
          text: `This server is missing ${context.missing.join(", ")}.`,
          hints: ["In frontend/web, run npm run setup:local, then restart npm run dev."],
        }
      : {
          tone: "error",
          title: "Sign-in is not available right now.",
          text: "Please try again later or contact the person who runs Hydra.",
          hints: [],
        };
  }
  switch (code) {
    case undefined:
    case "":
      return null;
    case "Configuration":
    case "OAuthSignInError":
    case "OAuthSignin":
      return context.development
        ? { tone: "error", title: "Keycloak could not be reached.", text: "Hydra could not start the sign-in.", hints: keycloakHints(context) }
        : { tone: "error", title: "Sign-in is not available right now.", text: "Please try again later or contact the person who runs Hydra.", hints: [] };
    case "AccessDenied":
      return { tone: "error", title: "Access was denied.", text: "Your account is not allowed to sign in here. Ask your administrator for access.", hints: [] };
    case "SessionRequired":
      return { tone: "info", title: "Please sign in first.", text: "You need to be signed in to open that page.", hints: [] };
    default:
      return { tone: "error", title: "Sign-in did not finish.", text: "Something went wrong on the way back from Keycloak. Please try again.", hints: [] };
  }
}

/** Only same-site paths are allowed as a destination after sign-in. */
export function safeCallbackPath(value: string | undefined, fallback = "/projects"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
