#!/usr/bin/env node
/**
 * Post-deploy health checks + optional auto-rollback signal.
 * Usage:
 *   BASE_URL=https://www.jimvio.com node scripts/release/post-deploy-health.mjs
 *   ROLLBACK_CMD='npx vercel rollback --yes' on failure when AUTO_ROLLBACK=1
 */

import { spawnSync } from "node:child_process";

const BASE = (process.env.BASE_URL || process.env.SMOKE_BASE_URL || "").replace(/\/$/, "");
if (!BASE) {
  console.error("BASE_URL required");
  process.exit(1);
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "user-agent": "jimvio-post-deploy/1.0" },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

const health = await getJson("/api/ops/health");
const alerts = await getJson("/api/ops/alerts");

const healthOk = health.status === 200 && health.json?.status === "ok";
// alerts may be 401 for anonymous — that still means the route is up
const alertsUp = [200, 401, 403].includes(alerts.status);

console.log(JSON.stringify({ health, alertsStatus: alerts.status, healthOk, alertsUp }, null, 2));

if (!healthOk || !alertsUp) {
  console.error("❌ Post-deploy health failed");
  if (process.env.AUTO_ROLLBACK === "1" && process.env.ROLLBACK_CMD) {
    console.error("Attempting automatic rollback…");
    const r = spawnSync(process.env.ROLLBACK_CMD, { shell: true, stdio: "inherit" });
    process.exit(r.status === 0 ? 1 : r.status ?? 1);
  }
  process.exit(1);
}

console.log("✅ Post-deploy health OK");
