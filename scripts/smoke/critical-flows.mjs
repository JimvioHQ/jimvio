#!/usr/bin/env node
/**
 * Critical-path HTTP smoke for preview/production.
 * Usage: BASE_URL=https://... node scripts/smoke/critical-flows.mjs
 *
 * Exit 0 only if all critical routes respond healthy.
 */

const BASE = (process.env.BASE_URL || process.env.SMOKE_BASE_URL || "").replace(/\/$/, "");
if (!BASE) {
  console.error("BASE_URL or SMOKE_BASE_URL is required");
  process.exit(1);
}

const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 25_000);

/** @type {{ name: string; path: string; expectStatus?: number[]; expectBodyIncludes?: string[]; allowRedirect?: boolean }[]} */
const CRITICAL = [
  { name: "home", path: "/", expectStatus: [200] },
  { name: "login", path: "/login", expectStatus: [200] },
  { name: "dashboard_gate", path: "/dashboard", expectStatus: [200, 307, 302, 303], allowRedirect: true },
  { name: "communities", path: "/communities", expectStatus: [200] },
  { name: "marketplace", path: "/marketplace", expectStatus: [200] },
  { name: "creator_gate", path: "/creator", expectStatus: [200, 307, 302, 303], allowRedirect: true },
  { name: "checkout_entry", path: "/cart", expectStatus: [200, 307, 302, 303], allowRedirect: true },
  { name: "live_entry", path: "/communities/live", expectStatus: [200, 307, 302, 303, 404], allowRedirect: true },
  { name: "admin_gate", path: "/admin", expectStatus: [200, 307, 302, 303], allowRedirect: true },
  { name: "ops_health", path: "/api/ops/health", expectStatus: [200, 503], expectBodyIncludes: ["status"] },
  { name: "ops_alerts_auth", path: "/api/ops/alerts", expectStatus: [401, 403, 200] },
  { name: "feedback_auth", path: "/api/feedback", expectStatus: [401, 403, 404, 405] },
  { name: "welcome", path: "/welcome", expectStatus: [200, 307, 302, 303], allowRedirect: true },
];

async function probe(item) {
  const url = `${BASE}${item.path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: item.allowRedirect ? "manual" : "follow",
      signal: controller.signal,
      headers: { "user-agent": "jimvio-smoke/1.0" },
    });
    const status = res.status;
    const allowed = item.expectStatus || [200];
    if (!allowed.includes(status)) {
      throw new Error(`${item.name} ${url} → HTTP ${status} (expected ${allowed.join("|")})`);
    }
    if (item.expectBodyIncludes?.length) {
      const text = await res.text();
      for (const needle of item.expectBodyIncludes) {
        if (!text.includes(needle)) {
          throw new Error(`${item.name} body missing "${needle}"`);
        }
      }
    }
    return { name: item.name, ok: true, status };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
let failed = 0;
for (const item of CRITICAL) {
  try {
    const r = await probe(item);
    results.push(r);
    console.log(`✓ ${r.name} (${r.status})`);
  } catch (e) {
    failed += 1;
    results.push({ name: item.name, ok: false, error: e instanceof Error ? e.message : String(e) });
    console.error(`✗ ${item.name}: ${e instanceof Error ? e.message : e}`);
  }
}

const summary = {
  baseUrl: BASE,
  passed: results.filter((r) => r.ok).length,
  failed,
  total: CRITICAL.length,
  passRate: Number(((results.filter((r) => r.ok).length / CRITICAL.length) * 100).toFixed(1)),
  results,
  at: new Date().toISOString(),
};

console.log(JSON.stringify(summary, null, 2));
if (failed > 0) process.exit(1);
console.log("✅ Critical smoke passed");
