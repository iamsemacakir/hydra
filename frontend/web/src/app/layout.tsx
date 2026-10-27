import type { Metadata } from "next";
import "./globals.css";
import { themeInitScript } from "@/components/landing/theme";

export const metadata: Metadata = { title: "DevOpsPlatform", description: "Operational topology and dependency impact" };

// The signed-in app header now lives in app/projects/layout.tsx, so the public landing page at "/" has its own navigation.
// The inline script picks the landing page's light or dark theme before the first paint.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body>{children}</body></html>;
}
