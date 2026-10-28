"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { safeCallbackPath } from "@/lib/authSettings";

/**
 * Starts the Keycloak sign-in. A successful start redirects to Keycloak (signIn throws Next's
 * redirect, which must not be caught). An Auth.js error comes back to the sign-in page as
 * ?error=<type>, where it is explained.
 */
export async function continueWithKeycloak(formData: FormData) {
  const callbackUrl = formData.get("callbackUrl");
  const redirectTo = safeCallbackPath(typeof callbackUrl === "string" ? callbackUrl : undefined);
  try {
    await signIn("keycloak", { redirectTo });
  } catch (error) {
    if (error instanceof AuthError) redirect(`/signin?error=${encodeURIComponent(error.type)}`);
    throw error;
  }
}
