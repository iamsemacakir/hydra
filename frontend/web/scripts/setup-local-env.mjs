/*
 * Creates or completes .env.local so `npm run dev` can sign in outside Docker.
 *
 * Settings come from .env.local.example. Values already in .env.local are kept. AUTH_SECRET gets
 * a fresh random value when it is missing or still the placeholder. Secret values are never printed.
 * Run it from frontend/web with `npm run setup:local`; running it again is safe.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplePath = path.join(webRoot, ".env.local.example");
const targetPath = path.join(webRoot, ".env.local");
const SECRET_LINE = /^\s*AUTH_SECRET\s*=.*$/m;

/** KEY=value lines as a map. Comments and blank lines are skipped. */
function parse(text) {
  const entries = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=(.*)$/.exec(line);
    if (match) entries.set(match[1], match[2].trim());
  }
  return entries;
}

const withNewline = (text) => (text === "" || text.endsWith("\n") ? text : `${text}\n`);

const example = readFileSync(examplePath, "utf8");
const existed = existsSync(targetPath);
let text = existed ? readFileSync(targetPath, "utf8") : example;
const current = parse(text);
const added = [];

if (existed) {
  for (const [key, value] of parse(example)) {
    if (current.has(key)) continue;
    text = `${withNewline(text)}${key}=${value}\n`;
    current.set(key, value);
    added.push(key);
  }
}

const secret = current.get("AUTH_SECRET") ?? "";
const needsSecret = secret === "" || secret.startsWith("replace_with_");
if (needsSecret) {
  const line = `AUTH_SECRET=${randomBytes(32).toString("base64url")}`;
  text = SECRET_LINE.test(text) ? text.replace(SECRET_LINE, line) : `${withNewline(text)}${line}\n`;
}

if (!existed || added.length > 0 || needsSecret) writeFileSync(targetPath, text);

if (!existed) {
  console.log("Created .env.local with the local sign-in settings and a new AUTH_SECRET.");
} else if (added.length > 0 || needsSecret) {
  const changes = [...added.map((key) => `added ${key}`), ...(needsSecret ? ["generated a new AUTH_SECRET"] : [])];
  console.log(`Updated .env.local: ${changes.join(", ")}.`);
} else {
  console.log(".env.local already has every setting. Nothing changed.");
}
console.log("Next: start Keycloak and the API from the repository root with `docker compose up -d postgres keycloak backend`, then run `npm run dev`.");
