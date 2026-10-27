import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut, type BackendSession } from "@/auth";

export default async function ProjectsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth() as BackendSession | null;
  if (!session || session.error) redirect("/signin");
  return <>{session.user && <header className="app-header"><div className="app-header-inner"><Link href="/projects" className="app-brand">DevOpsPlatform</Link><div className="app-account"><span>{session.user.name ?? session.user.email ?? "Signed in"}</span><form action={async () => { "use server"; await signOut({ redirectTo: "/signin" }); }}><button className="button" type="submit">Sign out</button></form></div></div></header>}{children}</>;
}
