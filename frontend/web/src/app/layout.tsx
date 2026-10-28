import type { Metadata } from "next";
import "./globals.css";
import { themeInitScript } from "@/components/landing/theme";

export const metadata: Metadata = { title: "Hydra", description: "One live map of your services, their dependencies and their health" };

/*
 * The root layout no longer reads the session, so the public landing page can be rendered
 * statically. The signed-in header now lives in app/projects/layout.tsx.
 *
 * The inline script runs before the first paint and sets data-landing-pref / data-landing-theme
 * on <html>, so the landing page never flashes the wrong theme. suppressHydrationWarning is
 * needed because those attributes exist only on the client's copy of <html>.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
