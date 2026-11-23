import NextAuth, { type Account, type Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Keycloak from "next-auth/providers/keycloak";

type BackendToken = JWT & { accessToken?: string; expiresAt?: number; refreshToken?: string; error?: "RefreshTokenError" };
export type BackendSession = Session & { accessToken?: string; error?: "RefreshTokenError" };

async function storeAndRefresh(token: JWT, account: Account | null | undefined): Promise<BackendToken> {
  const stored = token as BackendToken;
  if (account) {
    stored.accessToken = account.access_token;
    stored.expiresAt = account.expires_at ?? Math.floor(Date.now() / 1000) + 300;
    stored.refreshToken = account.refresh_token;
    return stored;
  }
  if (!stored.expiresAt || Date.now() < (stored.expiresAt - 30) * 1000) return stored;
  if (!stored.refreshToken) { stored.error = "RefreshTokenError"; return stored; }
  try {
    const response = await fetch(process.env.AUTH_KEYCLOAK_TOKEN_URL ?? `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.AUTH_KEYCLOAK_ID ?? "",
        client_secret: process.env.AUTH_KEYCLOAK_SECRET ?? "",
        refresh_token: stored.refreshToken,
      }),
    });
    if (!response.ok) throw new Error(`Keycloak refresh returned ${response.status}`);
    const refreshed = await response.json() as { access_token: string; expires_in: number; refresh_token?: string };
    stored.accessToken = refreshed.access_token;
    stored.expiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
    stored.refreshToken = refreshed.refresh_token ?? stored.refreshToken;
    delete stored.error;
  } catch (error) {
    console.error("OIDC token refresh failed", error instanceof Error ? error.message : error);
    stored.error = "RefreshTokenError";
  }
  return stored;
}

const provider = Keycloak({ issuer: process.env.AUTH_KEYCLOAK_ISSUER });
const shared = { providers: [provider], session: { strategy: "jwt" as const }, secret: process.env.AUTH_SECRET };

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...shared,
  // Errors come back to the sign-in page (?error=<code>), which explains them in plain words,
  // instead of the generic Auth.js error page.
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    jwt: ({ token, account }) => storeAndRefresh(token, account),
    session({ session, token }) {
      // Public /api/auth/session responses never include OAuth tokens.
      (session as BackendSession).error = (token as BackendToken).error;
      return session;
    },
  },
});

// Only the server-side API route imports this auth() instance. Its session callback may carry
// the provider access token to the proxy, while the public Auth.js handlers use the callback above.
export const backendAuth = NextAuth({
  ...shared,
  callbacks: {
    jwt: ({ token, account }) => storeAndRefresh(token, account),
    session({ session, token }) {
      (session as BackendSession).accessToken = (token as BackendToken).accessToken;
      (session as BackendSession).error = (token as BackendToken).error;
      return session;
    },
  },
}).auth;
