#!/usr/bin/env node
/**
 * Verify required CI/CD secrets are present in the environment without printing values.
 *
 * Checks (in order):
 *  1) process.env
 *  2) .env.local / .env (keys only — never logs secret values)
 *  3) optional: `gh secret list` (names only) when --github is passed
 *
 * Usage:
 *   node scripts/ci/verify-secrets.mjs
 *   node scripts/ci/verify-secrets.mjs --github
 *   node scripts/ci/verify-secrets.mjs --strict   # fail on missing optional too if STRICT_OPTIONAL=1
 *
 * Exit 1 if any required secret is missing.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const checkGithub = args.has("--github");
const strict = args.has("--strict") || process.env.STRICT_SECRETS === "1";

const REQUIRED = [
  { name: "SUPABASE_ACCESS_TOKEN", purpose: "Supabase CLI auth for migration list/link" },
  { name: "SUPABASE_PROJECT_REF", purpose: "Canonical Supabase project ref. Workflows do not read SUPABASE_PROJECT_ID." },
  { name: "VERCEL_TOKEN", purpose: "Vercel CLI deploys (release/preview)" },
  { name: "VERCEL_PROJECT_ID", purpose: "Vercel project id" },
  { name: "VERCEL_ORG_ID", purpose: "Vercel org/team id" },
];

const OPTIONAL = [
  { name: "SUPABASE_DB_PASSWORD", purpose: "Linked DB operations that need password" },
  { name: "NEXT_PUBLIC_APP_URL", purpose: "Post-deploy health URL" },
  { name: "LIVEKIT_API_KEY", purpose: "Live platform (runtime / smoke)" },
  { name: "LIVEKIT_API_SECRET", purpose: "Live platform (runtime / smoke)" },
  { name: "RESEND_API_KEY", purpose: "Transactional email" },
];

function parseEnvFile(path) {
  const map = new Map();
  if (!existsSync(path)) return map;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) map.set(key, val);
  }
  return map;
}

function isPresent(value) {
  if (value == null) return false;
  const v = String(value).trim();
  if (!v) return false;
  if (/^(your_|changeme|todo|xxx|placeholder)/i.test(v)) return false;
  return true;
}

const fileMaps = [
  parseEnvFile(join(root, ".env.local")),
  parseEnvFile(join(root, ".env")),
];

function resolve(name) {
  if (isPresent(process.env[name])) return { present: true, source: "env" };
  for (const m of fileMaps) {
    if (m.has(name) && isPresent(m.get(name))) {
      return { present: true, source: "dotenv" };
    }
  }
  return { present: false, source: null };
}

let githubNames = new Set();
if (checkGithub) {
  const r = spawnSync("gh", ["secret", "list", "--json", "name"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (r.status === 0 && r.stdout) {
    try {
      const rows = JSON.parse(r.stdout);
      githubNames = new Set((rows || []).map((x) => x.name).filter(Boolean));
    } catch {
      console.warn("⚠️  Could not parse `gh secret list` JSON — skipping GitHub names.");
    }
  } else {
    console.warn("⚠️  `gh secret list` unavailable — skipping GitHub secret inventory.");
  }
}

const missingRequired = [];
const missingOptional = [];
const report = [];

function checkOne(item, required) {
  const local = resolve(item.name);
  const onGithub = githubNames.has(item.name);
  const ok = local.present || (checkGithub && onGithub);
  report.push({
    name: item.name,
    required,
    purpose: item.purpose,
    local: local.present,
    github: checkGithub ? onGithub : null,
    ok,
  });
  if (!ok) {
    (required ? missingRequired : missingOptional).push(item.name);
  }
}

console.log("Jimvio secrets verification (values never printed)\n");

for (const item of REQUIRED) checkOne(item, true);
for (const item of OPTIONAL) checkOne(item, false);

for (const row of report) {
  const flags = [];
  if (row.local) flags.push("local");
  if (row.github) flags.push("github");
  if (!row.ok) flags.push("MISSING");
  const mark = row.ok ? "✅" : row.required ? "❌" : "⚠️ ";
  console.log(
    `${mark} ${row.name} [${row.required ? "required" : "optional"}] ${flags.join(",") || "absent"} — ${row.purpose}`
  );
}

if (missingRequired.length) {
  console.error("\n❌ Missing REQUIRED secrets:");
  for (const name of missingRequired) {
    console.error(`  - ${name}`);
  }
  console.error(
    "\nFix: set them in the environment, .env.local, or GitHub repo/org secrets."
  );
  console.error("See docs/CI_SELF_HOSTED.md § Secrets");
  process.exit(1);
}

if (strict && missingOptional.length) {
  console.error("\n❌ Missing OPTIONAL secrets (--strict):");
  for (const name of missingOptional) console.error(`  - ${name}`);
  process.exit(1);
}

if (missingOptional.length) {
  console.warn("\n⚠️  Optional secrets not found (non-fatal):");
  for (const name of missingOptional) console.warn(`  - ${name}`);
}

console.log("\n✅ Required secrets present (or registered on GitHub when --github used)");
