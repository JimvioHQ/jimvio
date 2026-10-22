#!/usr/bin/env node
/**
 * Full infrastructure audit for Jimvio self-hosted CI.
 * Usage: npm run ci:audit
 *
 * Writes .next/ci-audit-report.json and prints a human summary.
 * Does not modify application code or workflows.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const runnerDir = process.env.JIMVIO_RUNNER_DIR || join(homedir(), "actions-runner");

const report = {
  ts: new Date().toISOString(),
  host: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
  },
  checks: [],
  ok: true,
};

function check(name, pass, detail, { fatal = false } = {}) {
  report.checks.push({ name, ok: pass, detail });
  if (!pass && fatal) report.ok = false;
  console.log(`${pass ? "✅" : "⚠️ "} ${name}: ${detail}`);
}

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: "utf8", cwd: root, shell: false });
}

function which(bin) {
  const r = run(process.platform === "win32" ? "where" : "which", [bin]);
  return r.status === 0;
}

console.log("Jimvio CI infrastructure audit\n");

// Node / npm / git
{
  const major = Number(process.versions.node.split(".")[0]);
  check("node", major >= 22, process.version, { fatal: true });
  if (which("npm")) {
    const v = run("npm", ["-v"]);
    check("npm", v.status === 0, (v.stdout || "").trim() || "present");
  } else {
    check("npm", false, "not on PATH", { fatal: true });
  }
  if (which("git")) {
    const v = run("git", ["--version"]);
    check("git", v.status === 0, (v.stdout || "").trim());
  } else {
    check("git", false, "not on PATH", { fatal: true });
  }
}

// Supabase / docker
{
  if (which("supabase")) {
    const v = run("supabase", ["--version"]);
    check("supabase_cli", v.status === 0, (v.stdout || "").trim().split("\n")[0]);
  } else {
    check("supabase_cli", false, "not on PATH");
  }
  if (which("docker")) {
    const v = run("docker", ["--version"]);
    check("docker", v.status === 0, (v.stdout || "").trim(), { fatal: false });
  } else {
    check("docker", true, "not installed (optional)");
  }
}

// Network
{
  const r = run("curl", ["-fsS", "--max-time", "10", "https://api.github.com/zen"]);
  check("github_network", r.status === 0, r.status === 0 ? "ok" : "unreachable", {
    fatal: false,
  });
}

// Disk / memory
{
  const df = run("df", ["-Pk", root]);
  if (df.status === 0) {
    const line = (df.stdout || "").trim().split("\n")[1] || "";
    const avail = Number(line.split(/\s+/)[3] || 0);
    const gb = Math.floor(avail / 1024 / 1024);
    check("disk_space", gb >= 8, `${gb}GB free`, { fatal: gb < 4 });
  }
  if (process.platform === "linux" && existsSync("/proc/meminfo")) {
    const text = readFileSync("/proc/meminfo", "utf8");
    const m = text.match(/MemAvailable:\s+(\d+)/);
    if (m) {
      const mb = Math.floor(Number(m[1]) / 1024);
      check("memory", mb >= 1024, `${mb}MB available`);
    }
  } else {
    check("memory", true, `${process.platform} (informational)`);
  }
}

// Workflows
{
  const need = ["ci.yml", "release.yml", "supabase.yml", "preview.yml", "codeql.yml"];
  const dir = join(root, ".github/workflows");
  let all = true;
  let selfHosted = true;
  for (const f of need) {
    const p = join(dir, f);
    if (!existsSync(p)) {
      all = false;
      continue;
    }
    const body = readFileSync(p, "utf8");
    if (!body.includes("ubuntu-latest")) {
      selfHosted = false;
    }
  }
  check("workflows_present", all, all ? need.join(", ") : "missing workflow files", {
    fatal: true,
  });
  check("workflows_self_hosted", selfHosted, "required workflows run on ubuntu-latest", {
    fatal: true,
  });
}

// Runner / service
{
  const configured = existsSync(join(runnerDir, ".runner"));
  check("runner_configured", configured, configured ? runnerDir : `missing ${runnerDir}`);
  const sys = run("systemctl", ["is-active", "jimvio-actions-runner.service"]);
  const active = (sys.stdout || "").trim() === "active";
  check("runner_service", active || process.platform !== "linux", active
    ? "active"
    : process.platform !== "linux"
      ? "n/a on non-Linux"
      : "inactive");
}

// Secrets (non-fatal summary)
{
  const s = run(process.execPath, ["scripts/ci/verify-secrets.mjs"]);
  check(
    "secrets",
    s.status === 0,
    s.status === 0 ? "required present locally" : "required missing locally (configure GitHub secrets)"
  );
}

// Scripts present
{
  const scripts = [
    "scripts/ci/bootstrap.sh",
    "scripts/ci/deploy-runner.sh",
    "scripts/ci/readiness-report.mjs",
    "scripts/ci/runner/setup.sh",
    "scripts/ci/runner/health-check.sh",
    "scripts/ci/runner/test-connectivity.mjs",
    "scripts/ci/secrets-guide.mjs",
    "scripts/ci/status.mjs",
  ];
  const missing = scripts.filter((s) => !existsSync(join(root, s)));
  check("automation_scripts", missing.length === 0, missing.length ? missing.join(", ") : "present", {
    fatal: true,
  });
}

// Docs
check(
  "docs",
  existsSync(join(root, "docs/CI_SELF_HOSTED.md")),
  "docs/CI_SELF_HOSTED.md",
  { fatal: true }
);

const outDir = join(root, ".next");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "ci-audit-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log("\n--------------------------------------");
console.log(`Report: ${outPath}`);
console.log(
  report.ok
    ? "✅ Audit complete (no fatal gaps in repo automation)"
    : "❌ Audit found fatal gaps — see checks above"
);
console.log(
  "Note: A green audit on a laptop does NOT mean a GitHub runner is online."
);
console.log("Provision Linux + registration token → npm run ci:runner:setup");
process.exit(report.ok ? 0 : 1);
