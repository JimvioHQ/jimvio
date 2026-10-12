#!/usr/bin/env node
/**
 * Resolve auth email template paths the same way Supabase CLI does
 * (v2.109.1 through v2.120.0, pkg/config/config.go resolve()):
 *
 *   auth.email.template.*     → repository root (parent of supabase/)
 *   auth.email.notification.* → supabase/ directory
 *
 * The hosted Preview check uses that template rule. A path of
 * ./templates/invite.html is opened as templates/invite.html from the
 * repository root and fails. Template paths must be
 * ./supabase/templates/<file>.html. Notification paths stay
 * ./templates/<file>.html so the CLI does not look in supabase/supabase/.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const supabaseDir = join(repoRoot, "supabase");
const configPath = join(supabaseDir, "config.toml");

const REQUIRED = {
  template: [
    "invite",
    "confirmation",
    "recovery",
    "magic_link",
    "email_change",
    "reauthentication",
  ],
  notification: [
    "password_changed",
    "email_changed",
    "phone_changed",
    "mfa_factor_enrolled",
    "mfa_factor_unenrolled",
    "identity_linked",
    "identity_unlinked",
  ],
};

function fail(msg) {
  console.error(`auth email templates: ${msg}`);
  process.exit(1);
}

if (!existsSync(configPath)) fail("supabase/config.toml missing");

const text = readFileSync(configPath, "utf8");
const paths = { template: new Map(), notification: new Map() };
let section = null;

for (const line of text.split("\n")) {
  const header = line.match(/^\[auth\.email\.(template|notification)\.([a-z0-9_]+)\]\s*$/);
  if (header) {
    section = { kind: header[1], name: header[2] };
    continue;
  }
  if (/^\s*\[/.test(line)) {
    section = null;
    continue;
  }
  if (!section) continue;
  const content = line.match(/^\s*content_path\s*=\s*"([^"]+)"\s*$/);
  if (content) paths[section.kind].set(section.name, content[1]);
}

function resolveContent(kind, name, contentPath) {
  if (isAbsolute(contentPath)) return contentPath;
  const base = kind === "template" ? repoRoot : supabaseDir;
  return join(base, contentPath);
}

let errors = 0;
for (const kind of ["template", "notification"]) {
  for (const name of REQUIRED[kind]) {
    const contentPath = paths[kind].get(name);
    if (!contentPath) {
      console.error(`missing content_path for auth.email.${kind}.${name}`);
      errors += 1;
      continue;
    }
    const resolved = resolveContent(kind, name, contentPath);
    const rel = relative(repoRoot, resolved);
    if (!existsSync(resolved) || !statSync(resolved).isFile() || statSync(resolved).size === 0) {
      console.error(
        `auth.email.${kind}.${name} content_path ${contentPath} → ${rel} (not a non-empty file)`
      );
      errors += 1;
      continue;
    }
    console.log(`ok auth.email.${kind}.${name} → ${rel}`);
  }
}

if (errors) fail(`${errors} template path(s) did not resolve`);
console.log(`auth email templates: ${REQUIRED.template.length + REQUIRED.notification.length} paths resolve`);
