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
  // Prefer self-hosted (free-friendly); allow explicit ubuntu-latest via vars.
  if (!/self-hosted/.test(body) && !/ubuntu-latest/.test(body)) {
    fail(`${name}: missing runs-on (expected self-hosted or ubuntu-latest)`);
  }
  if (!/USE_GITHUB_HOSTED_RUNNERS/.test(body) && name !== "dependabot.yml") {
    // Soft preference — warn via console only for docs; require self-hosted string
    if (!/self-hosted/.test(body)) {
      fail(`${name}: expected self-hosted runner labels (or USE_GITHUB_HOSTED_RUNNERS toggle)`);
    }
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

const listed = existsSync(workflowsDir) ? readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml")) : [];
console.log(`Workflows present: ${listed.join(", ") || "(none)"}`);

if (errors) {
  console.error(`Workflow verification failed (${errors})`);
  process.exit(1);
}
console.log("✅ Workflow / Dependabot verification OK");
