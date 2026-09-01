#!/usr/bin/env node
/**
 * Sync QuantForg webhook secret to Vercel Production and verify integration.
 *
 * Never prints the secret. Reads from stdin, --file, or QUANTFORG_WEBHOOK_SECRET env.
 *
 * Usage:
 *   printf '%s' "$RAILWAY_QUANTFORG_WEBHOOK_SECRET" | node scripts/ops/sync-quantforg-webhook-secret.mjs
 *   node scripts/ops/sync-quantforg-webhook-secret.mjs --file /secure/path/secret.txt
 *   node scripts/ops/sync-quantforg-webhook-secret.mjs --expect-fingerprint abc123def456
 *   node scripts/ops/sync-quantforg-webhook-secret.mjs --resolve-only
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const PROJECT_NAME = "jimvio";
const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const expectIdx = args.indexOf("--expect-fingerprint");
const skipRedeploy = args.includes("--skip-redeploy");
const resolveOnly = args.includes("--resolve-only");
const scope = args.includes("--scope")
  ? args[args.indexOf("--scope") + 1]
  : "jimvio";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readSecret() {
  if (process.env.QUANTFORG_WEBHOOK_SECRET?.trim()) {
    return process.env.QUANTFORG_WEBHOOK_SECRET.trim();
  }
  if (fileIdx >= 0) {
    const path = args[fileIdx + 1];
    if (!path || !existsSync(path)) {
      throw new Error("Secret file not found");
    }
    return readFileSync(path, "utf8").trim();
  }
  if (process.stdin.isTTY) {
    throw new Error(
      "Provide secret via stdin, --file, or QUANTFORG_WEBHOOK_SECRET env var"
    );
  }
  const rl = createInterface({ input: process.stdin });
  let data = "";
  for await (const chunk of rl) data += chunk;
  const secret = data.trim();
  if (!secret) throw new Error("Empty secret on stdin");
  return secret;
}

function fingerprint(secret) {
  return createHash("sha256").update(secret).digest("hex").slice(0, 12);
}

const VERCEL_MAX_BUFFER = 15 * 1024 * 1024;

function run(cmd, cmdArgs, input) {
  const result = spawnSync(cmd, cmdArgs, {
    input,
    encoding: "utf8",
    maxBuffer: VERCEL_MAX_BUFFER,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(`${cmd} ${cmdArgs.join(" ")} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${cmdArgs.join(" ")} failed: ${result.stderr || result.stdout}`
    );
  }
  return result.stdout;
}

function parseCliJson(stdout) {
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) {
    throw new Error("Expected JSON output from Vercel CLI");
  }
  return JSON.parse(stdout.slice(jsonStart));
}

function runJson(cmd, cmdArgs) {
  const stdout = run(cmd, cmdArgs);
  return parseCliJson(stdout);
}

function reportDeployment(label, deployment) {
  console.log(`${label}_deployment_id=${deployment.id}`);
  console.log(`${label}_deployment_state=${deployment.state}`);
  console.log(`${label}_deployment_target=${deployment.target}`);
  console.log(`${label}_deployment_url=${deployment.url}`);
  if (deployment.commitSha) {
    console.log(`${label}_deployment_sha=${deployment.commitSha}`);
  }
}

function getLatestProductionDeployment() {
  const data = runJson("vercel", [
    "list",
    PROJECT_NAME,
    "--scope",
    scope,
    "--prod",
    "--limit",
    "5",
    "--json",
  ]);

  const deployments = Array.isArray(data.deployments) ? data.deployments : [];
  const candidate = deployments.find(
    (deployment) =>
      deployment.name === PROJECT_NAME && deployment.target === "production"
  );

  if (!candidate?.url) {
    throw new Error(`No production deployment found for project ${PROJECT_NAME}`);
  }

  const detail = runJson("vercel", [
    "inspect",
    candidate.url,
    "--scope",
    scope,
    "--json",
  ]);

  if (detail.name !== PROJECT_NAME) {
    throw new Error(
      `Deployment project mismatch: expected ${PROJECT_NAME}, got ${detail.name}`
    );
  }
  if (detail.target !== "production") {
    throw new Error(
      `Deployment target mismatch: expected production, got ${detail.target}`
    );
  }

  return {
    id: detail.id,
    url: detail.url,
    state: detail.readyState || candidate.state,
    target: detail.target,
    commitSha: detail.meta?.githubCommitSha || null,
    createdAt: detail.createdAt || candidate.createdAt,
  };
}

function waitForDeploymentReady(idOrUrl, timeout = "5m") {
  const detail = runJson("vercel", [
    "inspect",
    idOrUrl,
    "--scope",
    scope,
    "--json",
    "--wait",
    "--timeout",
    timeout,
  ]);

  if (detail.name !== PROJECT_NAME) {
    throw new Error(
      `Waited deployment project mismatch: expected ${PROJECT_NAME}, got ${detail.name}`
    );
  }
  if (detail.target !== "production") {
    throw new Error(
      `Waited deployment target mismatch: expected production, got ${detail.target}`
    );
  }

  return {
    id: detail.id,
    url: detail.url,
    state: detail.readyState,
    target: detail.target,
    commitSha: detail.meta?.githubCommitSha || null,
    createdAt: detail.createdAt,
  };
}

function redeployProduction(deploymentId) {
  const result = spawnSync(
    "vercel",
    ["redeploy", deploymentId, "--scope", scope],
    {
      encoding: "utf8",
      maxBuffer: VERCEL_MAX_BUFFER,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  if (result.status !== 0) {
    throw new Error(`vercel redeploy failed: ${result.stderr || result.stdout}`);
  }

  const output = `${result.stdout}\n${result.stderr}`;
  const urlMatch = output.match(/https:\/\/[^\s]+-jimvio\.vercel\.app/);
  if (urlMatch) {
    const url = urlMatch[0].replace(/Note:.*/, "").trim();
    return waitForDeploymentReady(url);
  }

  const latest = getLatestProductionDeployment();
  if (latest.state === "READY") return latest;
  return waitForDeploymentReady(latest.id);
}

async function ensureProductionRedeployAfterEnvUpdate(baselineCreatedAt) {
  for (let attempt = 0; attempt < 9; attempt += 1) {
    await sleep(5000);
    const latest = getLatestProductionDeployment();
    if (latest.createdAt > baselineCreatedAt) {
      if (latest.state === "READY") {
        console.log("vercel_auto_redeploy=detected");
        return latest;
      }
      console.log("vercel_auto_redeploy=building");
      return waitForDeploymentReady(latest.id);
    }
  }

  const current = getLatestProductionDeployment();
  console.log(`vercel_redeploy_source=${current.id}`);
  return redeployProduction(current.id);
}

async function main() {
  if (resolveOnly) {
    const deployment = getLatestProductionDeployment();
    reportDeployment("vercel", deployment);
    console.log("resolve_only=ok");
    return;
  }

  const secret = await readSecret();
  const fp = fingerprint(secret);
  const expectFp = expectIdx >= 0 ? args[expectIdx + 1]?.trim() : null;

  console.log(`secret_length=${secret.length}`);
  console.log(`secret_fingerprint=${fp}`);

  if (expectFp && expectFp !== fp) {
    throw new Error(
      `Fingerprint mismatch (expected ${expectFp}, got ${fp}). Aborting without update.`
    );
  }

  const baseline = getLatestProductionDeployment();
  reportDeployment("baseline", baseline);

  run(
    "vercel",
    [
      "env",
      "add",
      "QUANTFORG_WEBHOOK_SECRET",
      "production",
      "--scope",
      scope,
      "--force",
    ],
    secret
  );
  console.log("vercel_env_updated=ok");

  let deployment = baseline;
  if (!skipRedeploy) {
    deployment = await ensureProductionRedeployAfterEnvUpdate(baseline.createdAt);
    reportDeployment("vercel", deployment);
    if (deployment.state !== "READY") {
      throw new Error(`Production deployment not READY: ${deployment.state}`);
    }
  }

  const verify = spawnSync(
    "node",
    ["scripts/verify-quantforg-webhook.mjs"],
    {
      env: {
        ...process.env,
        QUANTFORG_WEBHOOK_SECRET: secret,
        QUANTFORG_WEBHOOK_TEST_URL: "https://www.jimvio.com",
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  if (verify.status !== 0) {
    console.error(verify.stdout);
    console.error(verify.stderr);
    throw new Error("Live webhook verification failed after sync");
  }
  console.log("live_verification=ok");
}

main().catch((err) => {
  console.error(`sync failed: ${err.message}`);
  process.exit(1);
});
