#!/usr/bin/env node
/**
 * Smoke checks for self-hosted CI infrastructure assets.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const scripts = [
  "scripts/ci/deploy-runner.sh",
  "scripts/ci/bootstrap.sh",
  "scripts/ci/readiness-report.mjs",
  "scripts/ci/runner/install-deps.sh",
  "scripts/ci/runner/install-runner.sh",
  "scripts/ci/runner/install-service.sh",
  "scripts/ci/runner/setup.sh",
  "scripts/ci/runner/health-check.sh",
  "scripts/ci/runner/recover.sh",
  "scripts/ci/runner/update-runner.sh",
  "scripts/ci/runner/test-connectivity.mjs",
  "scripts/ci/verify-local.mjs",
  "scripts/ci/verify-secrets.mjs",
  "scripts/ci/secrets-guide.mjs",
  "scripts/ci/audit.mjs",
  "scripts/ci/status.mjs",
];

for (const rel of scripts) {
  const body = mustExist(rel);
  assert.ok(body.length > 100, `${rel} too small`);
}

const docs = mustExist("docs/CI_SELF_HOSTED.md");
assert.match(docs, /ci:deploy/);
assert.match(docs, /ci:bootstrap/);
assert.match(docs, /ci:runner:setup/);
assert.match(docs, /registration token/i);
assert.match(docs, /Removing the runner|removing the runner/i);
assert.match(docs, /Rotating registration tokens|rotating registration tokens/i);

const pkg = JSON.parse(mustExist("package.json"));
for (const key of [
  "ci:verify",
  "ci:deploy",
  "ci:readiness",
  "ci:bootstrap",
  "ci:runner:setup",
  "ci:runner:test",
  "ci:runner:health",
  "ci:secrets",
  "ci:secrets:guide",
  "ci:audit",
  "ci:status",
]) {
  assert.ok(pkg.scripts[key], `package.json missing script ${key}`);
}

for (const wf of ["ci.yml", "release.yml", "supabase.yml", "preview.yml", "codeql.yml"]) {
  const body = mustExist(`.github/workflows/${wf}`);
  assert.match(body, /self-hosted/);
  assert.match(body, /USE_GITHUB_HOSTED_RUNNERS/);
}

// Commands that must run on any host (including macOS)
const soft = [
  ["ci:secrets:guide", ["npm", ["run", "ci:secrets:guide"]]],
  ["ci:status", ["npm", ["run", "ci:status"]]],
  ["ci:audit", ["npm", ["run", "ci:audit"]]],
];
for (const [name, [cmd, args]] of soft) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: false });
  assert.equal(r.status, 0, `${name} failed: ${r.stderr || r.stdout}`);
}

// deploy must block clearly on non-Linux
{
  const r = spawnSync("npm", ["run", "ci:deploy", "--", "--verify-only"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (process.platform !== "linux") {
    assert.equal(r.status, 2, "ci:deploy should exit 2 (blocked) on non-Linux");
    assert.match(`${r.stdout}\n${r.stderr}`, /DEPLOYMENT BLOCKED|not a Linux/i);
    const reportPath = path.join(root, ".next/ci-deploy-health-report.json");
    assert.ok(fs.existsSync(reportPath), "deploy health report missing");
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    assert.equal(report.status, "blocked");
    assert.equal(report.runner_online, false);
  }
}

// bootstrap must fail clearly on non-Linux
{
  const r = spawnSync("npm", ["run", "ci:bootstrap"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (process.platform !== "linux") {
    assert.notEqual(r.status, 0, "ci:bootstrap should fail on non-Linux");
    assert.match(`${r.stdout}\n${r.stderr}`, /Unsupported OS|Ubuntu|Debian/i);
  }
}

console.log("verify-self-hosted-ci: ok");
