#!/usr/bin/env node
/**
 * Lightweight GitHub Actions / Dependabot structural verification.
 * Does not require actionlint; checks required files + YAML shape heuristics.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const workflowsDir = join(root, ".github", "workflows");
const required = ["ci.yml", "preview.yml", "release.yml", "codeql.yml", "supabase.yml"];
let errors = 0;

function fail(msg) {
  console.error(`❌ ${msg}`);
  errors += 1;
}

if (!existsSync(workflowsDir)) fail(".github/workflows missing");

for (const name of required) {
  const path = join(workflowsDir, name);
  if (!existsSync(path)) {
    fail(`Missing workflow: ${name}`);
    continue;
  }
  const body = readFileSync(path, "utf8");
  if (!/^name:\s+/m.test(body)) fail(`${name}: missing top-level name`);
  if (!/^on:/m.test(body)) fail(`${name}: missing on:`);
  if (!/^jobs:/m.test(body)) fail(`${name}: missing jobs:`);
  if (!/ubuntu-latest/.test(body)) {
    fail(`${name}: required checks must run on ubuntu-latest`);
  }
  // Unbalanced quotes heuristic
  const doubles = (body.match(/"/g) || []).length;
  if (doubles % 2 !== 0) fail(`${name}: unbalanced double quotes`);
  console.log(`OK workflow: ${name}`);
}

const dependabot = join(root, ".github", "dependabot.yml");
if (!existsSync(dependabot)) {
  fail("Missing .github/dependabot.yml");
} else {
  const body = readFileSync(dependabot, "utf8");
  if (!/package-ecosystem:\s*npm/.test(body)) fail("dependabot: npm ecosystem missing");
  if (!/package-ecosystem:\s*github-actions/.test(body)) fail("dependabot: github-actions ecosystem missing");
  console.log("OK dependabot.yml");
}

const release = readFileSync(join(workflowsDir, "release.yml"), "utf8");
if (/vercel deploy/.test(release)) {
  fail("release.yml must not start a Vercel deployment; Vercel Git publishes main");
}
if (!/Wait for Vercel Git production commit/.test(release)) {
  fail("release.yml must confirm the Vercel Git commit before smoke");
}
const supabaseWorkflow = readFileSync(join(workflowsDir, "supabase.yml"), "utf8");
if (!/supabase-production-migrate/.test(supabaseWorkflow)) {
  fail("supabase.yml must serialize production migration applies");
}
if (!/apply-eligible-migrations\.mjs/.test(supabaseWorkflow)) {
  fail("supabase.yml must apply migrations only through the eligible-migration script");
}
if (!/verify-remote-migration-history\.mjs/.test(supabaseWorkflow)) {
  fail("supabase.yml must fail closed on migration history drift");
}

const listed = existsSync(workflowsDir) ? readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml")) : [];
console.log(`Workflows present: ${listed.join(", ") || "(none)"}`);

if (errors) {
  console.error(`Workflow verification failed (${errors})`);
  process.exit(1);
}
console.log("✅ Workflow / Dependabot verification OK");
