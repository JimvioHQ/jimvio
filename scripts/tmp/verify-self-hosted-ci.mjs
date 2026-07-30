#!/usr/bin/env node
/**
 * Smoke checks for self-hosted CI infrastructure assets.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const scripts = [
  "scripts/ci/runner/install-deps.sh",
  "scripts/ci/runner/install-runner.sh",
  "scripts/ci/runner/install-service.sh",
  "scripts/ci/runner/health-check.sh",
  "scripts/ci/runner/recover.sh",
  "scripts/ci/runner/update-runner.sh",
  "scripts/ci/verify-local.mjs",
  "scripts/ci/verify-secrets.mjs",
];

for (const rel of scripts) {
  const body = mustExist(rel);
  assert.ok(body.length > 100, `${rel} too small`);
}

const docs = mustExist("docs/CI_SELF_HOSTED.md");
assert.match(docs, /install-deps\.sh/);
assert.match(docs, /systemd/i);
assert.match(docs, /health-check/);
assert.match(docs, /Disaster recovery|disaster recovery/i);
assert.match(docs, /ci:verify/);

const pkg = JSON.parse(mustExist("package.json"));
assert.equal(pkg.scripts["ci:verify"], "node scripts/ci/verify-local.mjs");
assert.ok(pkg.scripts["ci:secrets"]);
assert.ok(pkg.scripts["ci:runner:health"]);

for (const wf of ["ci.yml", "release.yml", "supabase.yml", "preview.yml", "codeql.yml"]) {
  const body = mustExist(`.github/workflows/${wf}`);
  assert.match(body, /self-hosted/);
  assert.match(body, /USE_GITHUB_HOSTED_RUNNERS/);
}

console.log("verify-self-hosted-ci: ok");
