import type { Metadata } from "next";
import { SignInPage } from "@/components/signin/SignInPage";
import { missingAuthSettings, safeCallbackPath, signInNotice } from "@/lib/authSettings";
import { continueWithKeycloak } from "./actions";

export const metadata: Metadata = { title: "Sign in · Hydra" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Reads the error Auth.js sent the visitor back with, and which sign-in settings are missing,
 * then renders the page. It runs on every request (it reads the query string), so the check
 * always reflects the server's current environment.
 */
export default async function SignIn({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const missing = missingAuthSettings(process.env);
  const notice = signInNotice(first(params.error), {
    development: process.env.NODE_ENV !== "production",
    missing,
    issuer: process.env.AUTH_KEYCLOAK_ISSUER,
  });
  return (
    <SignInPage
      action={continueWithKeycloak}
      notice={notice}
      callbackUrl={safeCallbackPath(first(params.callbackUrl))}
      disabled={missing.length > 0}
    />
  );
}
