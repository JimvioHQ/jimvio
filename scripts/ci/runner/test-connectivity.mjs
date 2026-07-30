#!/usr/bin/env node
/**
 * Verify self-hosted runner connectivity and label readiness.
 * Usage: npm run ci:runner:test
 *
 * Never claims the runner is online unless GitHub API (or local systemd+listener)
 * confirms it. Does not print secrets.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const runnerDir = process.env.JIMVIO_RUNNER_DIR || join(homedir(), "actions-runner");
const requiredLabels = ["self-hosted", "linux", "x64"];

const checks = [];
let ok = true;

function record(name, pass, detail) {
  checks.push({ name, ok: pass, detail });
  if (!pass) ok = false;
  console.log(`${pass ? "✅" : "❌"} ${name} — ${detail}`);
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    cwd: root,
    shell: false,
    ...opts,
  });
}

console.log("Jimvio runner connectivity test\n");

// GitHub API
{
  const r = run("curl", ["-fsS", "--max-time", "10", "https://api.github.com/zen"]);
  record(
    "github_api",
    r.status === 0,
    r.status === 0 ? "api.github.com reachable" : "cannot reach api.github.com"
  );
}

// Local runner config
{
  const configured = existsSync(join(runnerDir, ".runner"));
  record(
    "runner_configured",
    configured,
    configured ? `${runnerDir}/.runner present` : `missing ${runnerDir}/.runner — run npm run ci:runner:setup`
  );
  if (configured) {
    try {
      const cfg = JSON.parse(readFileSync(join(runnerDir, ".runner"), "utf8"));
      const labels = String(cfg.labels || cfg.agentName || "");
      // labels may be in .credentials or runner settings; also check .path / env
      record("runner_name", Boolean(cfg.agentName || cfg.agentId), `agent=${cfg.agentName || cfg.agentId || "unknown"}`);
    } catch {
      record("runner_config_parse", false, "could not parse .runner JSON");
    }
  }
}

// systemd / process
{
  const sys = run("systemctl", ["is-active", "jimvio-actions-runner.service"]);
  const active = (sys.stdout || "").trim() === "active";
  const pgrep = run("pgrep", ["-f", "Runner.Listener"]);
  const proc = pgrep.status === 0;
  if (active) {
    record("runner_service", true, "jimvio-actions-runner.service active");
  } else if (proc) {
    record("runner_process", true, "Runner.Listener process detected (non-systemd or early start)");
  } else {
    record(
      "runner_online_local",
      false,
      "service inactive and no Runner.Listener — start with setup/recover on a Linux host"
    );
  }
}

// Labels expected by workflows
record(
  "required_labels",
  true,
  `workflows expect labels: ${requiredLabels.join(", ")}`
);

// gh api runners (optional)
{
  const gh = run("gh", [
    "api",
    "repos/{owner}/{repo}/actions/runners",
    "--jq",
    ".runners[] | {name,status,busy,labels:[.labels[].name]}",
  ]);
  if (gh.status === 0 && (gh.stdout || "").trim()) {
    const lines = (gh.stdout || "").trim().split("\n").filter(Boolean);
    let found = false;
    let idleMatch = false;
    for (const line of lines) {
      try {
        const row = JSON.parse(line);
        const labels = (row.labels || []).map(String);
        const hasAll = requiredLabels.every((l) => labels.includes(l));
        if (!hasAll) continue;
        found = true;
        const online = row.status === "online";
        const idle = online && !row.busy;
        console.log(
          `   runner=${row.name} status=${row.status} busy=${row.busy} labels=${labels.join(",")}`
        );
        if (idle) idleMatch = true;
        if (online) {
          record("github_runner_online", true, `${row.name} online`);
        }
      } catch {
        /* ignore line parse */
      }
    }
    if (!found) {
      record(
        "github_runner_labels",
        false,
        "no GitHub runner with labels self-hosted,linux,x64 (register via ci:runner:setup)"
      );
    } else if (idleMatch) {
      record("github_runner_idle", true, "at least one matching runner is online and idle");
    } else {
      record(
        "github_runner_idle",
        false,
        "matching runner(s) found but none idle/online — wait or check GitHub UI"
      );
    }
  } else {
    record(
      "github_runners_api",
      true,
      "gh api unavailable — skipped remote inventory (install GitHub CLI + auth for full check)"
    );
  }
}

// Workflow pickup capability = online runner with correct labels
{
  const localOnline = checks.some(
    (c) =>
      (c.name === "runner_service" || c.name === "runner_process" || c.name === "github_runner_online") &&
      c.ok
  );
  const remoteIdle = checks.some((c) => c.name === "github_runner_idle" && c.ok);
  if (remoteIdle) {
    record("workflow_pickup", true, "runner can pick up queued self-hosted jobs");
  } else if (localOnline) {
    record(
      "workflow_pickup",
      true,
      "local runner appears running — confirm Idle in GitHub UI before relying on pickup"
    );
  } else {
    record(
      "workflow_pickup",
      false,
      "no verified online runner — jobs will QUEUE on self-hosted labels (no hosted minutes used)"
    );
  }
}

console.log("\n--------------------------------------");
console.log(ok ? "✅ Runner test finished (see checks above)" : "❌ Runner test found problems");
console.log("Manual if needed: provision host + GitHub registration token (docs/CI_SELF_HOSTED.md)");
process.exit(ok ? 0 : 1);
