import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Hydra: know what a failure reaches",
  description:
    "Hydra turns a repository into one live map of its services, dependencies and health, then shows which services a failure could affect.",
};

export default function Home() {
  return <LandingPage />;
}
