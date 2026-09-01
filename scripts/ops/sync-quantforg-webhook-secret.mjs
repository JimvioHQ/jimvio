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
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const expectIdx = args.indexOf("--expect-fingerprint");
const skipRedeploy = args.includes("--skip-redeploy");
const scope = args.includes("--scope")
  ? args[args.indexOf("--scope") + 1]
  : "jimvio";

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

function run(cmd, cmdArgs, input) {
  const result = spawnSync(cmd, cmdArgs, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${cmdArgs.join(" ")} failed: ${result.stderr || result.stdout}`
    );
  }
  return result.stdout;
}

async function main() {
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

  if (!skipRedeploy) {
    const list = run("vercel", [
      "list",
      "jimvio",
      "--scope",
      scope,
      "--prod",
      "--limit",
      "1",
    ]);
    const match = list.match(/dpl_[A-Za-z0-9]+/);
    if (!match) throw new Error("Could not resolve latest production deployment id");
    const deploymentId = match[0];
    run("vercel", ["redeploy", deploymentId, "--scope", scope, "--yes"]);
    console.log(`vercel_redeploy=${deploymentId}`);
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
