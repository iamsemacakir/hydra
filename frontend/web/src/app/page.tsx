import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "DevOpsPlatform: know what a failure reaches",
  description:
    "Import a repository and get one live map of its services, dependencies and health, then see which components a failure could affect.",
};

export default function Home() {
  return <LandingPage />;
}
