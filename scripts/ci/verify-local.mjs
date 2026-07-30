#!/usr/bin/env node
/**
 * Production verification — reproduces the GitHub CI gate locally without
 * consuming GitHub-hosted Actions minutes, then audits CI infrastructure.
 *
 * Usage: npm run ci:verify
 *
 * Fail-closed on quality gates. Infrastructure checks contribute to the
 * consolidated report; runner offline is reported but does not fail the
 * quality gate (host may not be the runner machine).
 *
 * Set CI_VERIFY_STRICT_INFRA=1 to also fail when runner health / secrets fail.
 */
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const strictInfra = process.env.CI_VERIFY_STRICT_INFRA === "1";
const report = {
  startedAt: new Date().toISOString(),
  steps: [],
  ok: true,
};

function log(step, msg) {
  console.log(`\n==> [${step}] ${msg}`);
}

function record(step, ok, detail = "") {
  report.steps.push({ step, ok, detail });
  if (!ok) report.ok = false;
}

function fail(step, msg) {
  record(step, false, msg);
  console.error(`\n❌ VERIFY FAILED at ${step}: ${msg}`);
  writeReport();
  process.exit(1);
}

function run(step, command, args, opts = {}) {
  log(step, `${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...opts.env },
    shell: false,
  });
  if (result.error) fail(step, result.error.message);
  if (result.status !== 0) fail(step, `${command} exited ${result.status ?? "unknown"}`);
  record(step, true);
}

function runCapture(step, command, args) {
  log(step, `${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    shell: false,
  });
  return result;
}

function hasBin(name) {
  const which = spawnSync(process.platform === "win32" ? "where" : "which", [name], {
    cwd: root,
    stdio: "pipe",
    shell: false,
  });
  return which.status === 0;
}

function writeReport() {
  report.finishedAt = new Date().toISOString();
  const dir = join(root, ".next");
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "ci-verify-report.json"), JSON.stringify(report, null, 2));
  } catch {
    /* ignore */
  }
  console.log("\n---------- CI VERIFY REPORT ----------");
  for (const s of report.steps) {
    console.log(`${s.ok ? "✅" : "❌"} ${s.step}${s.detail ? ` — ${s.detail}` : ""}`);
  }
  console.log("--------------------------------------");
  console.log(`Report: .next/ci-verify-report.json`);
}

console.log("Jimvio production CI verification (fail-closed quality gates)");
console.log(`cwd: ${root}`);
console.log(`node: ${process.version}`);

// --- Node version ---
{
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) fail("node-version", `Node 22+ required (found ${process.version})`);
  record("node-version", true, process.version);
}

// --- Quality gates ---
run("install", "npm", ["ci"]);
run("lint", "npm", ["run", "lint"]);
run("type-check", "npm", ["run", "type-check"]);
run("test", "npm", ["run", "test"]);
run("build", "npm", ["run", "build"], {
  env: {
    NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=8192",
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder",
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder",
    SUPABASE_SECRET_KEY:
      process.env.SUPABASE_SECRET_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://jimvio.example",
    CRON_SECRET: process.env.CRON_SECRET || "ci-build-placeholder-cron-secret",
  },
});
run("ci:prepush", "npm", ["run", "ci:prepush"], {
  env: {
    NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=8192",
  },
});

// --- Workflows ---
run("workflows", "node", ["scripts/release/verify-workflows.mjs"]);

// --- Secrets (required) ---
{
  const r = runCapture("secrets", "node", ["scripts/ci/verify-secrets.mjs"]);
  if (r.status !== 0) {
    const detail =
      "required secrets missing (non-fatal unless CI_VERIFY_STRICT_INFRA=1)";
    if (r.stdout) console.warn(r.stdout);
    if (r.stderr) console.warn(r.stderr);
    if (strictInfra) fail("secrets", detail);
    // Keep overall report green for laptop runs; surface as warning detail.
    record("secrets", true, `WARN: ${detail}`);
  } else {
    record("secrets", true);
    if (r.stdout) console.log(r.stdout);
  }
}

// --- Migrations ---
if (!hasBin("supabase")) {
  fail(
    "supabase",
    "supabase CLI not found on PATH. Install: https://supabase.com/docs/guides/cli"
  );
}

const linkedHint = join(root, "supabase", ".temp", "project-ref");
if (!existsSync(linkedHint) && !process.env.SUPABASE_PROJECT_REF) {
  console.warn(
    "\n⚠️  No linked Supabase project detected. migration list/up --linked may fail."
  );
  console.warn("   Run: supabase link --project-ref <ref>");
}

run("migrations-list", "supabase", [
  "migration",
  "list",
  "--linked",
  "--output-format",
  "json",
]);
run("migrations-up", "supabase", ["migration", "up", "--linked"]);

// --- Git status (informational) ---
{
  const r = runCapture("git-status", "git", ["status", "--porcelain=v1", "-uall"]);
  const dirty = (r.stdout || "").trim();
  record(
    "git-status",
    true,
    dirty ? `${dirty.split("\n").length} dirty paths` : "clean"
  );
  if (dirty) {
    console.log("Git working tree (informational):\n" + dirty);
  }
}

// --- Runner health (optional on this machine) ---
{
  const health = join(root, "scripts/ci/runner/health-check.sh");
  if (existsSync(health)) {
    const r = runCapture("runner-health", "bash", [health]);
    if (r.status === 0) {
      record("runner-health", true, "healthy");
      if (r.stdout) console.log(r.stdout);
    } else {
      const detail =
        "runner not healthy on this host (expected if verifying from a laptop — provision runner separately)";
      record("runner-health", !strictInfra, detail);
      console.warn(`⚠️  ${detail}`);
      if (r.stdout) console.warn(r.stdout);
      if (strictInfra) fail("runner-health", detail);
    }
  } else {
    const detail = "health-check.sh missing";
    if (strictInfra) fail("runner-health", detail);
    record("runner-health", true, `WARN: ${detail}`);
  }
}

writeReport();

console.log("\n==============================");
console.log("✅ LOCAL VERIFICATION GREEN");
console.log("==============================");
console.log("GitHub-hosted Actions minutes were not used.");
console.log("See docs/CI_SELF_HOSTED.md for runner provisioning.");
