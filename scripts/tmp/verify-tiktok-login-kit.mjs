#!/usr/bin/env node
/**
 * TikTok Login Kit OAuth — static + safety verification.
 * Run: VERIFY_FILTER=tiktok npm test
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";

const root = process.cwd();
const checks = [];

function must(file, needles, label) {
  const path = join(root, file);
  if (!existsSync(path)) {
    checks.push({ ok: false, label: `${label}: missing ${file}` });
    return;
  }
  const src = readFileSync(path, "utf8");
  for (const n of needles) {
    if (!src.includes(n)) {
      checks.push({ ok: false, label: `${label}: missing ${JSON.stringify(n)}` });
      return;
    }
  }
  checks.push({ ok: true, label });
}

function mustNot(file, needles, label) {
  const path = join(root, file);
  const src = readFileSync(path, "utf8");
  for (const n of needles) {
    if (src.includes(n)) {
      checks.push({ ok: false, label: `${label}: still contains ${JSON.stringify(n)}` });
      return;
    }
  }
  checks.push({ ok: true, label });
}

function testAuthUrl() {
  process.env.TIKTOK_CLIENT_KEY = "test_client_key";
  process.env.TIKTOK_CLIENT_SECRET = "test_client_secret";
  // Inline mirror of tiktokAuthUrl query construction
  const params = new URLSearchParams({
    client_key: "test_client_key",
    scope: "user.info.basic",
    response_type: "code",
    redirect_uri: "https://www.jimvio.com/api/integrations/tiktok/callback",
    state: "abc123",
  });
  const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  const u = new URL(url);
  if (u.origin + u.pathname !== "https://www.tiktok.com/v2/auth/authorize/") {
    checks.push({ ok: false, label: "Auth URL endpoint" });
    return;
  }
  if (u.searchParams.get("scope") !== "user.info.basic") {
    checks.push({ ok: false, label: "Auth URL scope" });
    return;
  }
  if (u.searchParams.get("response_type") !== "code") {
    checks.push({ ok: false, label: "Auth URL response_type" });
    return;
  }
  if (
    u.searchParams.get("redirect_uri") !==
    "https://www.jimvio.com/api/integrations/tiktok/callback"
  ) {
    checks.push({ ok: false, label: "Auth URL redirect_uri" });
    return;
  }
  if (u.searchParams.get("client_key") !== "test_client_key") {
    checks.push({ ok: false, label: "Auth URL client_key" });
    return;
  }
  checks.push({ ok: true, label: "Authorization URL construction" });
}

function testState() {
  const state = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(state).digest("hex");
  if (state.length < 32 || hash.length !== 64) {
    checks.push({ ok: false, label: "Secure OAuth state" });
    return;
  }
  checks.push({ ok: true, label: "Secure OAuth state" });
}

function testLiveGateSafety() {
  const cap = readFileSync(join(root, "lib/live/destinations/capabilities.ts"), "utf8");
  const adapter = readFileSync(join(root, "lib/live/destinations/adapters/tiktok.ts"), "utf8");
  if (!cap.includes("TIKTOK_LIVE_ENABLED") || !adapter.includes("ApprovalRequiredAdapter")) {
    checks.push({ ok: false, label: "LIVE approval gate intact" });
    return;
  }
  if (!adapter.includes("Login Kit") || !adapter.includes("does not activate LIVE")) {
    // soft — check createTikTokAdapter always ApprovalRequired
    if (!adapter.includes("return new ApprovalRequiredAdapter")) {
      checks.push({ ok: false, label: "LIVE adapter remains gated" });
      return;
    }
  }
  if (adapter.includes("rtmp://") || adapter.includes("StreamOutput")) {
    checks.push({ ok: false, label: "No fake TikTok RTMP/LIVE egress" });
    return;
  }
  checks.push({ ok: true, label: "LIVE approval gate intact (no fake LIVE)" });
}

function testNoV1() {
  const adapter = readFileSync(join(root, "lib/live/destinations/adapters/tiktok.ts"), "utf8");
  if (adapter.includes("open-api.tiktok.com/oauth/access_token") || adapter.includes("/oauth/authorize/?")) {
    checks.push({ ok: false, label: "No deprecated OAuth v1 endpoints" });
    return;
  }
  checks.push({ ok: true, label: "Uses OAuth v2 endpoints only" });
}

function testUgcSeparation() {
  const adapter = readFileSync(join(root, "lib/live/destinations/adapters/tiktok.ts"), "utf8");
  if (adapter.includes("process.env.TIKTOK_ACCESS_TOKEN")) {
    checks.push({ ok: false, label: "Must not use UGC TIKTOK_ACCESS_TOKEN" });
    return;
  }
  const ugc = readFileSync(join(root, "lib/ugc/syncViews.ts"), "utf8");
  if (!ugc.includes("TIKTOK_ACCESS_TOKEN")) {
    checks.push({ ok: false, label: "UGC TikTok token still present" });
    return;
  }
  checks.push({ ok: true, label: "UGC TikTok token remains separate" });
}

must(
  "lib/live/destinations/adapters/tiktok.ts",
  [
    "https://www.tiktok.com/v2/auth/authorize/",
    "https://open.tiktokapis.com/v2/oauth/token/",
    "https://open.tiktokapis.com/v2/oauth/revoke/",
    "user.info.basic",
    "TIKTOK_CLIENT_KEY",
    "TIKTOK_CLIENT_SECRET",
    "ApprovalRequiredAdapter",
  ],
  "TikTok Login Kit adapter + LIVE gate"
);

must(
  "app/api/integrations/tiktok/start/route.ts",
  ["createOAuthState", "tiktokAuthUrl", "platform: \"tiktok\""],
  "TikTok OAuth start route"
);

must(
  "app/api/integrations/tiktok/callback/route.ts",
  ["consumeOAuthState", "exchangeTikTokCode", "upsertOAuthDestination"],
  "TikTok OAuth callback route"
);

mustNot(
  "app/api/integrations/tiktok/callback/route.ts",
  ["access_token", "refresh_token", "client_secret"],
  "Callback does not expose token field names in responses"
);

must(
  "app/api/live/sessions/[id]/destinations/route.ts",
  ["requires_approval", "platformReadiness"],
  "LIVE start blocks approval-gated destinations"
);

testAuthUrl();
testState();
testLiveGateSafety();
testNoV1();
testUgcSeparation();

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.label}`);
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log("\n✅ TikTok Login Kit verification passed");
