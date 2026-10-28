import type { Health, WorkItemPriority, WorkItemType } from "@/lib/api";

/*
 * Northstar Marketplace: a large, fictional example project for trying Hydra with more data (demo mode
 * only). It is plain data; createExampleProject.ts creates it through the same public API as any other
 * project, so nothing is seeded behind the scenes. Names tie the parts together.
 *
 * The story it tells: an online marketplace with web, mobile, seller and admin front ends, two gateways,
 * sixteen services, four workers, seven data stores, two caches, two brokers and five outside providers.
 * In Production, search slowed down right after search 4.2.0 went out, and text messages fail at the
 * text message provider. Staging has a slow inventory database. The board holds the work around it.
 */

type ComponentType = "Frontend" | "Gateway" | "Service" | "Worker" | "Database" | "Cache" | "MessageBroker" | "ExternalService";
type DependencyType = "Http" | "Database" | "Messaging" | "Cache" | "External";
type DependencySource = "Declared" | "Discovered" | "Observed";
type DeploymentStatus = "Running" | "Succeeded" | "Failed" | "RolledBack";

export type ExampleComponent = {
  name: string;
  type: ComponentType;
  owner: string;
  description: string;
  /** Repository name under REPOSITORY_ROOT, for components built from code. */
  repo?: string;
  /** The version running in Production, for components that are deployed. */
  version?: string;
};

export const REPOSITORY_ROOT = "https://git.example.com/northstar";

export const PROJECT = {
  name: "Northstar Marketplace",
  slug: "northstar-marketplace",
  description: "A large example: an online marketplace with web, mobile, seller and admin apps, 42 components across 4 environments, deployment history, recorded health and a busy board. Created from Hydra's demo data.",
  visibility: "Internal" as const,
};

export const ENVIRONMENTS = [
  { name: "Development", type: "Development" },
  { name: "Testing", type: "Testing" },
  { name: "Staging", type: "Staging" },
  { name: "Production", type: "Production" },
] as const;

export type EnvironmentName = (typeof ENVIRONMENTS)[number]["name"];

export const COMPONENTS: ExampleComponent[] = [
  { name: "Web Storefront", type: "Frontend", owner: "Storefront team", description: "The shop on the web: browsing, search, basket and checkout.", repo: "web-storefront", version: "5.12.0" },
  { name: "Mobile App", type: "Frontend", owner: "Mobile team", description: "The iOS and Android app for shoppers.", repo: "mobile-app", version: "3.40.1" },
  { name: "Seller Portal", type: "Frontend", owner: "Seller team", description: "Where sellers manage listings, stock, orders and payouts.", repo: "seller-portal", version: "2.7.3" },
  { name: "Admin Console", type: "Frontend", owner: "Platform team", description: "Back office for support and operations: refunds, users and content.", repo: "admin-console", version: "1.19.0" },
  { name: "API Gateway", type: "Gateway", owner: "Platform team", description: "Entry point for web, seller and admin traffic: routing, rate limits and token checks.", repo: "api-gateway", version: "2.4.2" },
  { name: "Mobile BFF", type: "Gateway", owner: "Mobile team", description: "Backend for the mobile app: combines calls and shapes responses for small screens.", repo: "mobile-bff", version: "1.33.0" },
  { name: "Auth Service", type: "Service", owner: "Identity team", description: "Sign-in, tokens and sessions for shoppers and sellers.", repo: "auth-service", version: "4.1.0" },
  { name: "User Service", type: "Service", owner: "Identity team", description: "Profiles, addresses and preferences.", repo: "user-service", version: "3.6.2" },
  { name: "Catalog Service", type: "Service", owner: "Catalog team", description: "Products, categories and listings, with prices and stock merged in.", repo: "catalog-service", version: "6.2.1" },
  { name: "Search Service", type: "Service", owner: "Search team", description: "Full-text and filtered product search.", repo: "search-service", version: "4.2.0" },
  { name: "Pricing Service", type: "Service", owner: "Catalog team", description: "Prices, promotions and sale windows.", repo: "pricing-service", version: "2.9.0" },
  { name: "Inventory Service", type: "Service", owner: "Fulfilment team", description: "Stock levels and reservations across warehouses.", repo: "inventory-service", version: "3.3.4" },
  { name: "Cart Service", type: "Service", owner: "Checkout team", description: "Shopping baskets and saved items.", repo: "cart-service", version: "2.15.0" },
  { name: "Checkout Service", type: "Service", owner: "Checkout team", description: "Turns a basket into an order: totals, delivery choice and payment.", repo: "checkout-service", version: "3.8.1" },
  { name: "Order Service", type: "Service", owner: "Checkout team", description: "Orders, cancellations and order history.", repo: "order-service", version: "5.0.3" },
  { name: "Payment Service", type: "Service", owner: "Payments team", description: "Card and wallet payments, refunds and payment history.", repo: "payment-service", version: "4.6.0" },
  { name: "Fraud Detection", type: "Service", owner: "Payments team", description: "Scores each payment for fraud risk before it is captured.", repo: "fraud-detection", version: "1.12.2" },
  { name: "Shipping Service", type: "Service", owner: "Fulfilment team", description: "Delivery options, labels and tracking.", repo: "shipping-service", version: "2.21.0" },
  { name: "Notification Service", type: "Service", owner: "Platform team", description: "Decides who hears about what, and queues emails and text messages.", repo: "notification-service", version: "1.8.0" },
  { name: "Recommendation Service", type: "Service", owner: "Data team", description: "Related products and personal home pages.", repo: "recommendation-service", version: "1.8.4" },
  { name: "Review Service", type: "Service", owner: "Catalog team", description: "Product ratings and reviews, with moderation.", repo: "review-service", version: "1.4.1" },
  { name: "Seller Service", type: "Service", owner: "Seller team", description: "Seller accounts, listings and weekly payouts.", repo: "seller-service", version: "2.2.0" },
  { name: "Search Indexer", type: "Worker", owner: "Search team", description: "Keeps the search index in step with catalog changes from Kafka.", repo: "search-indexer", version: "2.0.6" },
  { name: "Email Worker", type: "Worker", owner: "Platform team", description: "Sends queued emails through SendGrid.", repo: "email-worker", version: "1.5.0" },
  { name: "SMS Worker", type: "Worker", owner: "Platform team", description: "Sends queued text messages through Twilio.", repo: "sms-worker", version: "1.2.3" },
  { name: "Analytics Ingest", type: "Worker", owner: "Data team", description: "Streams events from Kafka into the analytics warehouse.", repo: "analytics-ingest", version: "0.14.0" },
  { name: "Users DB", type: "Database", owner: "Identity team", description: "PostgreSQL: accounts, profiles and addresses." },
  { name: "Catalog DB", type: "Database", owner: "Catalog team", description: "PostgreSQL: products, prices and reviews." },
  { name: "Inventory DB", type: "Database", owner: "Fulfilment team", description: "PostgreSQL: stock and reservations." },
  { name: "Orders DB", type: "Database", owner: "Checkout team", description: "PostgreSQL: orders and shipments." },
  { name: "Payments DB", type: "Database", owner: "Payments team", description: "PostgreSQL: payments, refunds and payouts." },
  { name: "Search Index", type: "Database", owner: "Search team", description: "Elasticsearch cluster with one index per language." },
  { name: "Analytics Warehouse", type: "Database", owner: "Data team", description: "Columnar warehouse for reports and recommendations." },
  { name: "Session Cache", type: "Cache", owner: "Identity team", description: "Redis: sessions and baskets." },
  { name: "Catalog Cache", type: "Cache", owner: "Catalog team", description: "Redis: product pages and prices." },
  { name: "Kafka", type: "MessageBroker", owner: "Platform team", description: "Event stream: orders, catalog changes and clicks." },
  { name: "RabbitMQ", type: "MessageBroker", owner: "Platform team", description: "Work queues for emails and text messages." },
  { name: "Stripe", type: "ExternalService", owner: "Payments team", description: "Card payments." },
  { name: "PayPal", type: "ExternalService", owner: "Payments team", description: "Wallet payments." },
  { name: "SendGrid", type: "ExternalService", owner: "Platform team", description: "Email delivery." },
  { name: "Twilio", type: "ExternalService", owner: "Platform team", description: "Text message delivery." },
  { name: "Carrier API", type: "ExternalService", owner: "Fulfilment team", description: "Delivery rates, labels and tracking from the parcel carrier." },
];

/** [dependent, what it depends on, type, source]. Declared unless said otherwise. */
export const DEPENDENCIES: Array<[string, string, DependencyType, DependencySource?]> = [
  ["Web Storefront", "API Gateway", "Http"],
  ["Seller Portal", "API Gateway", "Http"],
  ["Admin Console", "API Gateway", "Http"],
  ["Mobile App", "Mobile BFF", "Http"],
  ["API Gateway", "Auth Service", "Http"],
  ["API Gateway", "User Service", "Http"],
  ["API Gateway", "Catalog Service", "Http"],
  ["API Gateway", "Search Service", "Http"],
  ["API Gateway", "Cart Service", "Http"],
  ["API Gateway", "Checkout Service", "Http"],
  ["API Gateway", "Order Service", "Http"],
  ["API Gateway", "Review Service", "Http"],
  ["API Gateway", "Seller Service", "Http"],
  ["Mobile BFF", "Auth Service", "Http"],
  ["Mobile BFF", "Catalog Service", "Http"],
  ["Mobile BFF", "Search Service", "Http"],
  ["Mobile BFF", "Cart Service", "Http"],
  ["Mobile BFF", "Checkout Service", "Http"],
  ["Mobile BFF", "Order Service", "Http"],
  ["Mobile BFF", "Recommendation Service", "Http"],
  ["Web Storefront", "Recommendation Service", "Http", "Observed"],
  ["Admin Console", "Payment Service", "Http", "Observed"],
  ["Auth Service", "Users DB", "Database"],
  ["Auth Service", "Session Cache", "Cache"],
  ["User Service", "Users DB", "Database"],
  ["User Service", "Kafka", "Messaging"],
  ["Catalog Service", "Catalog DB", "Database"],
  ["Catalog Service", "Catalog Cache", "Cache"],
  ["Catalog Service", "Pricing Service", "Http"],
  ["Catalog Service", "Inventory Service", "Http"],
  ["Catalog Service", "Kafka", "Messaging"],
  ["Search Service", "Search Index", "Database"],
  ["Search Indexer", "Kafka", "Messaging", "Discovered"],
  ["Search Indexer", "Search Index", "Database", "Discovered"],
  ["Pricing Service", "Catalog DB", "Database"],
  ["Inventory Service", "Inventory DB", "Database"],
  ["Inventory Service", "Kafka", "Messaging"],
  ["Cart Service", "Session Cache", "Cache"],
  ["Cart Service", "Pricing Service", "Http"],
  ["Cart Service", "Inventory Service", "Http"],
  ["Checkout Service", "Cart Service", "Http"],
  ["Checkout Service", "Order Service", "Http"],
  ["Checkout Service", "Payment Service", "Http"],
  ["Checkout Service", "Shipping Service", "Http"],
  ["Order Service", "Orders DB", "Database"],
  ["Order Service", "Inventory Service", "Http"],
  ["Order Service", "Notification Service", "Http"],
  ["Order Service", "Kafka", "Messaging"],
  ["Payment Service", "Payments DB", "Database"],
  ["Payment Service", "Fraud Detection", "Http"],
  ["Payment Service", "Stripe", "External"],
  ["Payment Service", "PayPal", "External"],
  ["Fraud Detection", "User Service", "Http"],
  ["Fraud Detection", "Payments DB", "Database"],
  ["Shipping Service", "Carrier API", "External"],
  ["Shipping Service", "Orders DB", "Database"],
  ["Notification Service", "User Service", "Http"],
  ["Notification Service", "RabbitMQ", "Messaging"],
  ["Email Worker", "RabbitMQ", "Messaging"],
  ["Email Worker", "SendGrid", "External"],
  ["SMS Worker", "RabbitMQ", "Messaging"],
  ["SMS Worker", "Twilio", "External"],
  ["Recommendation Service", "Analytics Warehouse", "Database"],
  ["Recommendation Service", "Catalog Cache", "Cache"],
  ["Review Service", "Catalog DB", "Database"],
  ["Seller Service", "Catalog Service", "Http"],
  ["Seller Service", "Payment Service", "Http"],
  ["Seller Service", "Users DB", "Database"],
  ["Analytics Ingest", "Kafka", "Messaging"],
  ["Analytics Ingest", "Analytics Warehouse", "Database"],
];

const EXTERNAL = COMPONENTS.filter((component) => component.type === "ExternalService").map((component) => component.name);

/**
 * Which components report health in each environment (the rest stay Unknown), and which of them have a
 * problem. Problems are reported last, after everything reported healthy, as in a real incident.
 */
export const HEALTH: Record<EnvironmentName, { reporting: "all" | string[]; silent?: string[]; problems: Partial<Record<string, Health>> }> = {
  Production: { reporting: "all", problems: { "Search Service": "Degraded", "SMS Worker": "Unhealthy" } },
  Staging: { reporting: "all", silent: ["SendGrid", "Twilio", "Carrier API"], problems: { "Inventory DB": "Degraded" } },
  Testing: { reporting: "all", silent: EXTERNAL, problems: {} },
  Development: {
    reporting: ["Web Storefront", "API Gateway", "Auth Service", "Catalog Service", "Search Service", "Cart Service", "Checkout Service", "Order Service", "Payment Service", "Users DB", "Catalog DB", "Kafka"],
    problems: {},
  },
};

type Metrics = { cpuPercent: number | null; memoryPercent: number | null; requestRate: number | null; errorRatePercent: number | null; latencyP95Ms: number | null };

/** Readings that go with a problem; everything else gets ordinary readings for its type (see metricsFor). */
const PROBLEM_METRICS: Partial<Record<EnvironmentName, Record<string, Metrics>>> = {
  Production: {
    "Search Service": { cpuPercent: 91, memoryPercent: 78, requestRate: 412, errorRatePercent: 3.4, latencyP95Ms: 1840 },
    "SMS Worker": { cpuPercent: 4, memoryPercent: 22, requestRate: 0.6, errorRatePercent: 41, latencyP95Ms: null },
  },
  Staging: {
    "Inventory DB": { cpuPercent: 88, memoryPercent: 84, requestRate: 160, errorRatePercent: 0.4, latencyP95Ms: 220 },
  },
};

/** A stable number from 0 to 1 for a name, so the same component always gets the same readings. */
function unit(name: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < name.length; i++) hash = Math.imul(hash ^ name.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 1000) / 1000;
}

const between = (name: string, salt: number, low: number, high: number, digits = 0) => {
  const value = low + unit(name, salt) * (high - low);
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const RANGES: Record<ComponentType, { cpu: [number, number]; memory: [number, number]; rate: [number, number]; errors: [number, number]; latency: [number, number] | null }> = {
  Frontend: { cpu: [10, 35], memory: [25, 55], rate: [80, 600], errors: [0.1, 0.6], latency: [120, 380] },
  Gateway: { cpu: [25, 55], memory: [35, 60], rate: [400, 1800], errors: [0.1, 0.5], latency: [40, 120] },
  Service: { cpu: [15, 60], memory: [30, 70], rate: [30, 700], errors: [0.05, 0.8], latency: [30, 260] },
  Worker: { cpu: [5, 40], memory: [20, 50], rate: [5, 120], errors: [0, 0.5], latency: [50, 900] },
  Database: { cpu: [20, 65], memory: [50, 80], rate: [200, 3000], errors: [0, 0.1], latency: [2, 25] },
  Cache: { cpu: [5, 25], memory: [40, 75], rate: [1000, 9000], errors: [0, 0.02], latency: [0.5, 3] },
  MessageBroker: { cpu: [15, 45], memory: [40, 70], rate: [500, 5000], errors: [0, 0.02], latency: [3, 20] },
  ExternalService: { cpu: [0, 0], memory: [0, 0], rate: [5, 120], errors: [0.1, 1.2], latency: [150, 600] },
};

/** Traffic outside Production is a small share of it. */
const TRAFFIC: Record<EnvironmentName, number> = { Production: 1, Staging: 0.08, Testing: 0.03, Development: 0.01 };

/** Readings for a component in an environment; `problem` gives the readings of its problem, if it has one there. */
export function metricsFor(component: ExampleComponent, environment: EnvironmentName, problem = false): Metrics {
  const reading = problem ? PROBLEM_METRICS[environment]?.[component.name] : undefined;
  if (reading) return reading;
  const range = RANGES[component.type];
  const outside = component.type === "ExternalService";
  return {
    cpuPercent: outside ? null : between(component.name, 1, ...range.cpu, 1),
    memoryPercent: outside ? null : between(component.name, 2, ...range.memory, 1),
    requestRate: Math.max(0.1, Math.round(between(component.name, 3, ...range.rate) * TRAFFIC[environment] * 10) / 10),
    errorRatePercent: between(component.name, 4, ...range.errors, 2),
    latencyP95Ms: range.latency ? between(component.name, 5, ...range.latency, range.latency[1] < 10 ? 1 : 0) : null,
  };
}

export type ExampleDeployment = { environment: EnvironmentName; component: string; version: string; status: DeploymentStatus; hoursAgo: number; minutes: number };

const bump = (version: string, part: "minor" | "patch", by = 1) => {
  const [major, minor, patch] = version.split(".").map(Number);
  return part === "minor" ? `${major}.${minor + by}.0` : `${major}.${minor}.${Math.max(0, patch + by)}`;
};
const previous = (version: string) => {
  const [major, minor, patch] = version.split(".").map(Number);
  return patch > 0 ? `${major}.${minor}.${patch - 1}` : `${major}.${Math.max(0, minor - 1)}.${3 + (minor % 4)}`;
};

/**
 * Deployment history, oldest first: two releases per component in Production (the current one from the
 * last week), a newer patch in Staging, the next minor version in Testing and Development for some, and a
 * few that did not go well.
 */
export function deployments(): ExampleDeployment[] {
  const deployed = COMPONENTS.filter((component): component is ExampleComponent & { version: string } => !!component.version);
  const list: ExampleDeployment[] = [];
  for (const component of deployed) {
    const name = component.name;
    const minutes = between(name, 6, 3, 14);
    if (name === "Search Service") {
      list.push({ environment: "Production", component: name, version: "4.1.3", status: "Succeeded", hoursAgo: 220, minutes });
      list.push({ environment: "Production", component: name, version: "4.2.0", status: "Succeeded", hoursAgo: 2, minutes });
    } else if (name === "Checkout Service") {
      list.push({ environment: "Production", component: name, version: "3.7.4", status: "Succeeded", hoursAgo: 300, minutes });
      list.push({ environment: "Production", component: name, version: "3.8.0", status: "Failed", hoursAgo: 27, minutes: 6 });
      list.push({ environment: "Production", component: name, version: "3.8.1", status: "Succeeded", hoursAgo: 25, minutes });
    } else if (name === "Recommendation Service") {
      list.push({ environment: "Production", component: name, version: "1.8.4", status: "Succeeded", hoursAgo: 240, minutes });
      list.push({ environment: "Production", component: name, version: "1.9.0", status: "RolledBack", hoursAgo: 70, minutes: 21 });
    } else {
      list.push({ environment: "Production", component: name, version: previous(component.version), status: "Succeeded", hoursAgo: between(name, 7, 290, 480), minutes });
      list.push({ environment: "Production", component: name, version: component.version, status: "Succeeded", hoursAgo: between(name, 8, 20, 160), minutes });
    }
    // Staging runs a patch ahead for most components.
    if (unit(name, 9) < 0.7 || name === "Search Service") {
      const version = name === "Search Service" ? "4.2.1" : name === "Recommendation Service" ? "1.9.1" : bump(component.version, "patch");
      list.push({ environment: "Staging", component: name, version, status: "Succeeded", hoursAgo: name === "Search Service" ? 1 : between(name, 10, 6, 60), minutes });
    }
    // Testing and Development get the next minor version for some components.
    if (unit(name, 11) < 0.45) {
      const failed = name === "Fraud Detection";
      list.push({ environment: "Testing", component: name, version: bump(component.version, "minor"), status: failed ? "Failed" : "Succeeded", hoursAgo: between(name, 12, 3, 30), minutes });
    }
    if (unit(name, 13) < 0.4 || name === "Payment Service") {
      list.push({ environment: "Development", component: name, version: bump(component.version, "minor"), status: name === "Payment Service" ? "Running" : "Succeeded", hoursAgo: name === "Payment Service" ? 0 : between(name, 14, 1, 20), minutes });
    }
  }
  return list.sort((a, b) => b.hoursAgo - a.hoursAgo);
}

export const ITERATIONS = [
  { name: "Sprint 14", state: "Completed", startDays: -35, endDays: -22 },
  { name: "Sprint 15", state: "Current", startDays: -7, endDays: 6 },
  { name: "Sprint 16", state: "Planned", startDays: 7, endDays: 20 },
] as const;

export const TAGS = [
  { name: "incident", color: "red" },
  { name: "performance", color: "amber" },
  { name: "customer-facing", color: "blue" },
  { name: "security", color: "purple" },
  { name: "tech-debt", color: "slate" },
  { name: "mobile", color: "green" },
] as const;

export type ExampleWorkItem = {
  key: string;
  type: WorkItemType;
  title: string;
  description: string;
  priority: WorkItemPriority;
  state: "New" | "Active" | "Resolved" | "Closed";
  iteration?: (typeof ITERATIONS)[number]["name"];
  area?: string;
  points?: number;
  estimate?: number;
  remaining?: number;
  parent?: string;
  tags?: Array<(typeof TAGS)[number]["name"]>;
  components?: string[];
  /** Assigned to the person who creates the example. */
  mine?: boolean;
};

export const WORK_ITEMS: ExampleWorkItem[] = [
  { key: "search-latency", type: "Bug", title: "Search results take over 1.5 s at busy times", description: "Since search 4.2.0 went out, the 95th percentile latency in Production is around 1.8 s and errors are above 3%. Shoppers on the web and in the app wait for results.", priority: "High", state: "Active", iteration: "Sprint 15", area: "Search", estimate: 8, remaining: 5, tags: ["incident", "performance"], components: ["Search Service", "Search Index"], mine: true },
  { key: "search-plans", type: "Task", title: "Compare query plans of search 4.1.3 and 4.2.0", description: "Run the ten most common queries against both versions and compare the plans.", priority: "High", state: "Active", iteration: "Sprint 15", area: "Search", estimate: 3, remaining: 1, parent: "search-latency", components: ["Search Service"], mine: true },
  { key: "sms-failures", type: "Bug", title: "Order texts are not sent to some numbers", description: "The SMS worker gets errors from Twilio for numbers with a +44 prefix; about 40% of order texts fail.", priority: "Critical", state: "Active", iteration: "Sprint 15", area: "Notifications", estimate: 5, remaining: 3, tags: ["incident", "customer-facing"], components: ["SMS Worker", "Twilio"], mine: true },
  { key: "saved-items", type: "UserStory", title: "As a shopper, I want to save items for later", description: "Move items out of the basket without losing them, and see them on every device.", priority: "Medium", state: "New", iteration: "Sprint 16", area: "Checkout", points: 5, tags: ["customer-facing"], components: ["Cart Service", "Web Storefront", "Mobile App"] },
  { key: "saved-items-api", type: "Task", title: "Add a saved-items list to the cart service", description: "Store saved items next to the basket and expose them through the cart API.", priority: "Medium", state: "New", iteration: "Sprint 16", area: "Checkout", estimate: 6, parent: "saved-items", components: ["Cart Service", "Session Cache"] },
  { key: "saved-items-ui", type: "Task", title: "Show saved items under the basket on web and mobile", description: "One list under the basket, with a button to move an item back.", priority: "Medium", state: "New", iteration: "Sprint 16", area: "Checkout", estimate: 8, parent: "saved-items", components: ["Web Storefront", "Mobile App"] },
  { key: "paypal", type: "UserStory", title: "As a shopper, I want to pay with PayPal", description: "Offer PayPal next to cards at checkout.", priority: "High", state: "Closed", iteration: "Sprint 14", area: "Payments", points: 8, tags: ["customer-facing"], components: ["Payment Service", "PayPal", "Checkout Service"] },
  { key: "duplicate-emails", type: "Bug", title: "Order confirmation email arrives twice", description: "The email worker retried messages that had already been sent when RabbitMQ restarted.", priority: "Medium", state: "Resolved", iteration: "Sprint 15", area: "Notifications", estimate: 4, remaining: 0, components: ["Email Worker", "Notification Service"] },
  { key: "session-redis", type: "Task", title: "Move sessions to the new Redis cluster", description: "Point the auth service at the new cluster, then drain the old one.", priority: "Medium", state: "Active", iteration: "Sprint 15", area: "Identity", estimate: 12, remaining: 4, tags: ["tech-debt"], components: ["Session Cache", "Auth Service"], mine: true },
  { key: "stock-drift", type: "Bug", title: "Stock counts drift after cancelled orders", description: "A cancelled order does not always release its reservation, so stock looks lower than it is.", priority: "High", state: "Active", iteration: "Sprint 15", area: "Fulfilment", estimate: 6, remaining: 6, components: ["Inventory Service", "Order Service", "Inventory DB"] },
  { key: "partial-refund", type: "UserStory", title: "As support, I want to refund part of an order", description: "Refund single items or an amount, with a reason that the shopper sees.", priority: "Medium", state: "Active", iteration: "Sprint 15", area: "Payments", points: 5, components: ["Admin Console", "Payment Service"] },
  { key: "review-index", type: "Task", title: "Index product reviews for search", description: "Let search match words from reviews, ranked below titles and descriptions.", priority: "Low", state: "New", iteration: "Sprint 16", area: "Search", estimate: 5, components: ["Search Indexer", "Review Service", "Search Index"] },
  { key: "kafka-upgrade", type: "Task", title: "Upgrade Kafka to 3.7", description: "Rolling upgrade, one broker at a time, after the Black Friday freeze.", priority: "Medium", state: "New", area: "Platform", estimate: 16, tags: ["tech-debt"], components: ["Kafka"] },
  { key: "stale-prices", type: "Bug", title: "Mobile app shows old prices after a sale ends", description: "The mobile BFF kept serving cached prices for up to an hour after a sale window closed.", priority: "High", state: "Resolved", iteration: "Sprint 15", area: "Catalog", estimate: 3, remaining: 0, tags: ["mobile", "customer-facing"], components: ["Mobile BFF", "Catalog Cache", "Pricing Service"] },
  { key: "delivery-dates", type: "UserStory", title: "As a shopper, I want to see delivery dates before I pay", description: "Show the expected delivery window on the delivery step, based on the carrier's dates for the postcode.", priority: "High", state: "Active", iteration: "Sprint 15", area: "Checkout", points: 8, tags: ["customer-facing"], components: ["Checkout Service", "Shipping Service", "Carrier API"] },
  { key: "delivery-dates-api", type: "Task", title: "Ask the carrier API for dates per postcode", description: "Cache answers for an hour per postcode and service level.", priority: "High", state: "Active", iteration: "Sprint 15", area: "Checkout", estimate: 6, remaining: 2, parent: "delivery-dates", components: ["Shipping Service", "Carrier API"], mine: true },
  { key: "delivery-dates-ui", type: "Task", title: "Show the date range on the delivery step", description: "On web and mobile, under each delivery option.", priority: "Medium", state: "New", iteration: "Sprint 15", area: "Checkout", estimate: 5, parent: "delivery-dates", components: ["Web Storefront", "Mobile App"] },
  { key: "carrier-alert", type: "Task", title: "Alert when carrier API errors pass 2%", description: "Raise a warning event for the shipping service when the carrier API error rate passes 2% for ten minutes.", priority: "Medium", state: "New", iteration: "Sprint 16", area: "Fulfilment", estimate: 3, tags: ["performance"], components: ["Shipping Service", "Carrier API"] },
  { key: "fraud-timeout", type: "Bug", title: "Fraud checks time out for baskets over 50 items", description: "Large baskets take more than 3 s to score, so the payment falls back to manual review.", priority: "High", state: "New", iteration: "Sprint 16", area: "Payments", estimate: 5, tags: ["performance"], components: ["Fraud Detection", "Payment Service"] },
  { key: "analytics-retention", type: "Task", title: "Remove analytics events older than 13 months", description: "Keep 13 months of events, as agreed with the data protection officer.", priority: "Low", state: "Closed", iteration: "Sprint 14", area: "Data", estimate: 4, remaining: 0, tags: ["security"], components: ["Analytics Warehouse", "Analytics Ingest"] },
  { key: "bulk-prices", type: "UserStory", title: "As a seller, I want to update many prices at once", description: "Upload a file or edit a table of prices, and see what changes before saving.", priority: "Medium", state: "New", area: "Sellers", points: 13, components: ["Seller Portal", "Seller Service", "Pricing Service"] },
  { key: "load-test", type: "Task", title: "Load test checkout at three times normal traffic", description: "Before the sales weekend: basket, checkout, order and payment together.", priority: "High", state: "Active", iteration: "Sprint 15", area: "Checkout", estimate: 10, remaining: 7, tags: ["performance"], components: ["Checkout Service", "Cart Service", "Order Service", "Payment Service"], mine: true },
  { key: "empty-recommendations", type: "Bug", title: "No recommendations for new shoppers", description: "Shoppers without history see an empty carousel; show best sellers instead.", priority: "Low", state: "New", area: "Data", estimate: 3, tags: ["customer-facing"], components: ["Recommendation Service"] },
  { key: "rate-limits", type: "Task", title: "Rate-limit seller API keys", description: "100 requests per minute per key, with a clear error when the limit is reached.", priority: "High", state: "Resolved", iteration: "Sprint 15", area: "Platform", estimate: 5, remaining: 0, tags: ["security"], components: ["API Gateway", "Seller Service"] },
  { key: "weekly-payouts", type: "UserStory", title: "As a seller, I want to see my payouts per week", description: "A weekly list of payouts with the orders in each.", priority: "Medium", state: "Closed", iteration: "Sprint 14", area: "Sellers", points: 5, components: ["Seller Portal", "Seller Service", "Payment Service"] },
  { key: "admin-direct-payments", type: "Bug", title: "Admin console calls the payment service directly", description: "Traffic shows the admin console calling the payment service without going through the API gateway, so rate limits and audit do not apply. The dependency is observed, not declared.", priority: "Medium", state: "New", iteration: "Sprint 16", area: "Platform", estimate: 3, tags: ["security", "tech-debt"], components: ["Admin Console", "Payment Service"] },
  { key: "bff-cache", type: "Task", title: "Cache category pages in the mobile BFF", description: "Cache category responses for 60 seconds per language.", priority: "Low", state: "New", iteration: "Sprint 16", area: "Mobile", estimate: 4, tags: ["mobile", "performance"], components: ["Mobile BFF"] },
];
