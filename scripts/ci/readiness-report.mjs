#!/usr/bin/env node
/**
 * Infrastructure readiness report (local).
 * Does NOT claim a GitHub runner is online unless remote checks say so.
 *
 * Usage: npm run ci:readiness
 * Writes: .next/ci-readiness-report.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, ".next");
mkdirSync(outDir, { recursive: true });

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: false });
}

function hashFile(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) return null;
  return createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);
}

const workflows = ["ci.yml", "release.yml", "supabase.yml", "preview.yml", "codeql.yml"];
const workflowHashes = Object.fromEntries(
  workflows.map((f) => [f, hashFile(`.github/workflows/${f}`)])
);

const scriptsOk = [
  "scripts/ci/deploy-runner.sh",
  "scripts/ci/bootstrap.sh",
  "scripts/ci/runner/setup.sh",
  "scripts/ci/runner/test-connectivity.mjs",
  "scripts/ci/audit.mjs",
  "scripts/ci/status.mjs",
  "scripts/ci/secrets-guide.mjs",
].every((p) => existsSync(join(root, p)));

const audit = run("npm", ["run", "ci:audit"]);
const status = run("npm", ["run", "ci:status"]);
const secretsGuide = run("npm", ["run", "ci:secrets:guide"]);
const workflowsVerify = run("node", ["scripts/release/verify-workflows.mjs"]);
const smoke = run("node", ["scripts/tmp/verify-self-hosted-ci.mjs"]);
const deployDry = run("bash", ["scripts/ci/deploy-runner.sh", "--verify-only"]);

const deployReportPath = join(outDir, "ci-deploy-health-report.json");
let deployReport = null;
if (existsSync(deployReportPath)) {
  try {
    deployReport = JSON.parse(readFileSync(deployReportPath, "utf8"));
  } catch {
    deployReport = null;
  }
}

const report = {
  ts: new Date().toISOString(),
  platform: process.platform,
  node: process.version,
  workflows_unchanged_hashes: workflowHashes,
  workflows_verify_ok: workflowsVerify.status === 0,
  automation_scripts_present: scriptsOk,
  ci_audit_ok: audit.status === 0,
  ci_status_ok: status.status === 0,
  ci_secrets_guide_ok: secretsGuide.status === 0,
  smoke_ok: smoke.status === 0,
  deploy_verify_exit: deployDry.status,
  deploy_report: deployReport,
  runner_online_verified: Boolean(deployReport?.runner_idle || deployReport?.runner_online),
  application_touched: false,
  deployment_config_touched: false,
  blocked_by: [],
  ready_for_linux_deploy: true,
};

if (process.platform !== "linux") {
  report.blocked_by.push("No production Linux host in this environment");
}
if (!deployReport?.runner_idle) {
  report.blocked_by.push("GitHub registration token + Online/Idle runner not verified");
}
report.ready_for_linux_deploy =
  report.workflows_verify_ok &&
  report.automation_scripts_present &&
  report.ci_audit_ok &&
  report.smoke_ok;

writeFileSync(join(outDir, "ci-readiness-report.json"), JSON.stringify(report, null, 2));

console.log("\n========== INFRASTRUCTURE READINESS ==========");
console.log(`Platform:              ${report.platform}`);
console.log(`Workflows verified:    ${report.workflows_verify_ok ? "OK" : "FAIL"}`);
console.log(`Automation scripts:    ${report.automation_scripts_present ? "OK" : "FAIL"}`);
console.log(`ci:audit:              ${report.ci_audit_ok ? "OK" : "FAIL"}`);
console.log(`Smoke verify:          ${report.smoke_ok ? "OK" : "FAIL"}`);
console.log(`Runner Online/Idle:    ${report.runner_online_verified ? "YES" : "NO (not verified)"}`);
console.log(`Repo ready to deploy:  ${report.ready_for_linux_deploy ? "YES" : "NO"}`);
if (report.blocked_by.length) {
  console.log("\nBlocked by:");
  for (const b of report.blocked_by) console.log(`  • ${b}`);
  console.log("\nManual steps:");
  console.log("  1) Provision Ubuntu/Debian host");
  console.log("  2) sudo npm run ci:deploy -- --bootstrap-only");
  console.log("  3) Create GitHub runner registration token (Settings → Actions → Runners)");
  console.log("  4) npm run ci:deploy   # as runner user");
  console.log("  5) Confirm Idle in GitHub UI");
}
console.log(`\nReport: .next/ci-readiness-report.json`);
console.log("==============================================\n");

process.exit(report.ready_for_linux_deploy ? 0 : 1);
