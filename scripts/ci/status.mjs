#!/usr/bin/env node
/**
 * Compact CI / runner health dashboard.
 * Usage: npm run ci:status
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const runnerDir = process.env.JIMVIO_RUNNER_DIR || join(homedir(), "actions-runner");
const logCandidates = [
  process.env.JIMVIO_CI_LOG_DIR,
  "/var/log/jimvio-ci",
  join(root, ".next/jimvio-ci-logs"),
].filter(Boolean);

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: "utf8", cwd: root, shell: false });
}

function line(label, value) {
  const pad = label.padEnd(28, " ");
  console.log(`${pad}${value}`);
}

function lastJsonl(file) {
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8").trim();
  if (!text) return null;
  const lines = text.split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      /* continue */
    }
  }
  return null;
}

function findLog(name) {
  for (const dir of logCandidates) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

console.log("╔════════════════════════════════════════════╗");
console.log("║         Jimvio CI status dashboard         ║");
console.log("╚════════════════════════════════════════════╝\n");

line("Host", `${process.platform}/${process.arch}`);
line("Node", process.version);
line("npm", whichVersion("npm", ["-v"]));
line("Git", whichVersion("git", ["--version"]));
line("Supabase CLI", whichVersion("supabase", ["--version"]));

function whichVersion(bin, args) {
  const w = run(process.platform === "win32" ? "where" : "which", [bin]);
  if (w.status !== 0) return "not installed";
  const v = run(bin, args);
  return ((v.stdout || v.stderr || "").trim().split("\n")[0]) || "present";
}

// Runner / service
{
  const configured = existsSync(join(runnerDir, ".runner"));
  line("Runner dir", runnerDir);
  line("Runner configured", configured ? "yes" : "NO — run npm run ci:runner:setup");
  const sys = run("systemctl", ["is-active", "jimvio-actions-runner.service"]);
  const state = (sys.stdout || "").trim() || (process.platform === "linux" ? "inactive" : "n/a");
  line("Service (systemd)", state);
  const pgrep = run("pgrep", ["-f", "Runner.Listener"]);
  line("Listener process", pgrep.status === 0 ? "running" : "not detected");
}

// Workflow readiness
{
  const need = ["ci.yml", "release.yml", "supabase.yml", "preview.yml", "codeql.yml"];
  const dir = join(root, ".github/workflows");
  const ok =
    existsSync(dir) &&
    need.every((f) => {
      const p = join(dir, f);
      return existsSync(p) && readFileSync(p, "utf8").includes("self-hosted");
    });
  line("Workflow readiness", ok ? "self-hosted labels OK" : "MISSING/INVALID");
}

// Secrets readiness
{
  const s = run(process.execPath, ["scripts/ci/verify-secrets.mjs"]);
  line("Secret readiness", s.status === 0 ? "required present (local)" : "required missing (local)");
}

// Disk / memory
{
  const df = run("df", ["-Pk", root]);
  if (df.status === 0) {
    const parts = ((df.stdout || "").trim().split("\n")[1] || "").split(/\s+/);
    const gb = Math.floor(Number(parts[3] || 0) / 1024 / 1024);
    const usedPct = parts[4] || "?";
    line("Disk", `${gb}GB free (${usedPct} used)`);
  }
  if (existsSync("/proc/meminfo")) {
    const m = readFileSync("/proc/meminfo", "utf8").match(/MemAvailable:\s+(\d+)/);
    if (m) line("Memory available", `${Math.floor(Number(m[1]) / 1024)}MB`);
  } else {
    line("Memory", `${process.platform} (see OS monitor)`);
  }
}

// Health / recover logs
{
  const healthPath = findLog("health.jsonl");
  const recoverPath = findLog("recover.log");
  const lastHealth = healthPath ? lastJsonl(healthPath) : null;
  if (lastHealth) {
    line("Last health check", `${lastHealth.ts || "?"} → ${lastHealth.status || "?"}`);
  } else {
    line("Last health check", "none yet");
  }
  if (recoverPath && existsSync(recoverPath)) {
    const lines = readFileSync(recoverPath, "utf8").trim().split("\n").filter(Boolean);
    line("Last recovery attempt", lines[lines.length - 1] || "none");
  } else {
    line("Last recovery attempt", "none logged");
  }
}

console.log("\nCommands: ci:bootstrap · ci:runner:setup · ci:runner:test · ci:audit · ci:verify");
console.log("Docs: docs/CI_SELF_HOSTED.md");
console.log(
  "\nReminder: this dashboard cannot invent an online GitHub runner — register one on Linux first."
);
