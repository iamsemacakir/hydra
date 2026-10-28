import { redirect } from "next/navigation";
import { auth, signOut, type BackendSession } from "@/auth";
import { Brand } from "@/components/landing/Brand";
import { Icon } from "@/components/landing/Icon";
import { ThemeToggle } from "@/components/landing/ThemeToggle";
import { initials } from "@/lib/format";
import "./app.css";

/*
 * The signed-in app shell: a sticky header with the brand, the theme switch and the account.
 * app.css holds the styles of every page under /projects.
 */
export default async function ProjectsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth() as BackendSession | null;
  if (!session || session.error) redirect("/signin");
  const name = session.user?.name ?? session.user?.email ?? "Signed in";
  return (
    <div className="app" data-app>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="app-header">
        <div className="app-header-inner">
          <Brand href="/projects" />
          <div className="app-account">
            <ThemeToggle />
            <span className="app-user" title={session.user?.email ?? undefined}>
              <span className="avatar" aria-hidden="true">{initials(name)}</span>
              <span className="app-user-name">{name}</span>
            </span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/signin" }); }}>
              <button className="button ghost app-signout" type="submit">
                <Icon name="log-out" size={16} />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
