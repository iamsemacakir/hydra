import type { IconName } from "@/components/landing/Icon";

/** The icon of each component type, on the Components page and the overview's live map. */
export const COMPONENT_TYPE_ICONS: Record<string, IconName> = {
  Frontend: "layout-dashboard",
  Gateway: "network",
  Service: "box",
  Worker: "settings",
  Database: "layers",
  MessageBroker: "activity",
  Cache: "zap",
  ExternalService: "external-link",
};

/** A component type as words: "MessageBroker" becomes "Message broker". */
export function componentTypeLabel(type: string): string {
  const words = type.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
