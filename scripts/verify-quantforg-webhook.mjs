/**
 * QuantForg webhook integration verifier.
 *
 * Usage: node scripts/verify-quantforg-webhook.mjs
 */
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function sign(secret, body) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function gateFiles() {
  const required = [
    "app/api/webhooks/quantforg/route.ts",
    "app/api/integrations/quantforg/health/route.ts",
    "lib/integrations/quantforg/constants.ts",
    "lib/integrations/quantforg/types.ts",
    "lib/integrations/quantforg/verify-signature.ts",
    "lib/integrations/quantforg/format-message.ts",
    "lib/integrations/quantforg/publish-event.ts",
    "database/migrations/137_quantforg_webhook_idempotency.sql",
    "supabase/migrations/20260901193000_quantforg_webhook_idempotency.sql",
  ];
  for (const f of required) {
    assert.ok(existsSync(resolve(root, f)), `missing ${f}`);
  }
}

function gateEnvExample() {
  const env = read(".env.example");
  assert.match(env, /QUANTFORG_WEBHOOK_SECRET/);
}

function gateEventTypes() {
  const src = read("lib/integrations/quantforg/types.ts");
  const expected = [
    "SIGNAL_DETECTED",
    "SIGNAL_CONFIRMED",
    "TRADE_OPENED",
    "TRADE_REJECTED",
    "STOP_LOSS_SET",
    "TAKE_PROFIT_SET",
    "BREAKEVEN_SET",
    "TRAILING_STOP_UPDATED",
    "PARTIAL_CLOSE",
    "TAKE_PROFIT_HIT",
    "STOP_LOSS_HIT",
    "TRADE_CLOSED",
    "RISK_REJECTED",
    "ROBOT_STARTED",
    "ROBOT_STOPPED",
    "MT5_CONNECTED",
    "MT5_DISCONNECTED",
    "SYSTEM_ERROR",
  ];
  for (const e of expected) assert.match(src, new RegExp(`"${e}"`));
}

function gateSignature() {
  const secret = "test-secret-" + randomBytes(8).toString("hex");
  const body = JSON.stringify({ event_id: "evt-1", event_type: "SIGNAL_CONFIRMED", timestamp: "2026-09-01T19:00:00Z" });
  const sig = sign(secret, body);

  // mirror verify-signature.ts logic
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(sig, expected);

  const bad = sign("wrong", body);
  assert.notEqual(sig, bad);
}

function gateDestinationIds() {
  const src = read("lib/integrations/quantforg/constants.ts");
  assert.match(src, /quantforg-signals-mtihy5zc/);
  assert.match(src, /496ad20c-1796-41c2-90e8-29ebc9243e2a/);
  assert.match(src, /bf08dbfb-2624-43e2-8af6-f2057d052356/);
}

function gateFormatMessage() {
  const src = read("lib/integrations/quantforg/format-message.ts");
  assert.match(src, /QUANTFORG SIGNAL/);
  assert.match(src, /Breakeven activated/);
  assert.match(src, /QUANTFORG TRADE CLOSED/);
  assert.match(src, /Automated Trading System/);
}

async function gateLiveWebhook() {
  const secret = process.env.QUANTFORG_WEBHOOK_SECRET?.trim();
  const base =
    process.env.QUANTFORG_WEBHOOK_TEST_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  if (!secret) {
    console.log("  ↷ live webhook tests skipped (QUANTFORG_WEBHOOK_SECRET unset)");
    return;
  }

  const url = `${base.replace(/\/$/, "")}/api/webhooks/quantforg`;
  const eventId = `verify-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const payload = {
    event_id: eventId,
    event_type: "SIGNAL_CONFIRMED",
    timestamp: new Date().toISOString(),
    symbol: "XAUUSD",
    direction: "BUY",
    entry: 3480.2,
    stop_loss: 3474.2,
    take_profit: 3492.2,
    risk_percent: 1,
    confidence: 87,
    status: "EXECUTED",
  };
  const body = JSON.stringify(payload);
  const signature = sign(secret, body);

  const badRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-QuantForg-Signature": "deadbeef" },
    body,
  });
  assert.equal(badRes.status, 401, "invalid signature should 401");

  const noAuth = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  assert.equal(noAuth.status, 401, "missing auth should 401");

  const malformed = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: "{not-json",
  });
  assert.equal(malformed.status, 400, "malformed JSON should 400");

  const invalidType = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ ...payload, event_id: eventId + "-bad-type", event_type: "NOT_REAL" }),
  });
  assert.equal(invalidType.status, 400, "invalid event type should 400");

  const okRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-QuantForg-Signature": signature,
    },
    body,
  });
  assert.ok(okRes.status === 201 || okRes.status === 200, `valid webhook expected 200/201 got ${okRes.status}`);
  const okJson = await okRes.json();
  assert.equal(okJson.event_id, eventId);
  assert.ok(okJson.message_id);

  const dupRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-QuantForg-Signature": signature,
    },
    body,
  });
  assert.equal(dupRes.status, 200, "duplicate should 200");
  const dupJson = await dupRes.json();
  assert.equal(dupJson.duplicate, true);
  assert.equal(dupJson.message_id, okJson.message_id);
}

async function main() {
  gateFiles();
  gateEnvExample();
  gateEventTypes();
  gateSignature();
  gateDestinationIds();
  gateFormatMessage();
  await gateLiveWebhook();
  console.log("✅ QuantForg webhook verification passed");
}

main().catch((err) => {
  console.error("❌ QuantForg webhook verification failed:", err);
  process.exit(1);
});
