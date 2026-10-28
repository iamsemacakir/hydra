import { signIn } from "@/auth";

export default function SignInPage() {
  return <main className="page form-page"><div className="eyebrow">HYDRA</div><h1>Sign in</h1><p className="lede">Use your project identity to access operational workspaces.</p><form action={async () => { "use server"; await signIn("keycloak", { redirectTo: "/projects" }); }}><button className="button primary">Continue with Keycloak</button></form></main>;
}
