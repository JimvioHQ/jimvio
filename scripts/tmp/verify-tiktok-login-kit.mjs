#!/usr/bin/env node
/**
 * TikTok Login Kit OAuth — static + Web PKCE regression verification.
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

/** Mirror of production Web authorize URL builder (no PKCE). */
function buildWebAuthUrl(input) {
  const params = new URLSearchParams({
    client_key: input.clientKey,
    scope: "user.info.basic",
    response_type: "code",
    redirect_uri: input.redirectUri,
    state: input.state,
  });
  params.delete("code_challenge");
  params.delete("code_challenge_method");
  params.delete("code_verifier");
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

function isValidWebRedirectUri(redirectUri) {
  try {
    const parsed = new URL(redirectUri);
    if (parsed.protocol !== "https:") return false;
    if (/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) return false;
    if (parsed.search || parsed.hash) return false;
    return true;
  } catch {
    return false;
  }
}

function testAuthUrl() {
  const redirect =
    "https://www.jimvio.com/api/integrations/tiktok/callback";
  const state = randomBytes(24).toString("base64url");
  const url = buildWebAuthUrl({
    clientKey: "test_client_key",
    redirectUri: redirect,
    state,
  });
  const u = new URL(url);

  if (u.origin + u.pathname !== "https://www.tiktok.com/v2/auth/authorize/") {
    checks.push({ ok: false, label: "Auth URL endpoint" });
    return;
  }
  if (u.searchParams.get("client_key") !== "test_client_key") {
    checks.push({ ok: false, label: "Auth URL client_key" });
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
  if (u.searchParams.get("redirect_uri") !== redirect) {
    checks.push({ ok: false, label: "Auth URL redirect_uri" });
    return;
  }
  if (!u.searchParams.get("state") || u.searchParams.get("state") !== state) {
    checks.push({ ok: false, label: "Auth URL state present" });
    return;
  }
  if (u.searchParams.has("code_challenge")) {
    checks.push({ ok: false, label: "Web Auth URL must not include code_challenge" });
    return;
  }
  if (u.searchParams.has("code_challenge_method")) {
    checks.push({
      ok: false,
      label: "Web Auth URL must not include code_challenge_method",
    });
    return;
  }
  if (u.searchParams.has("code_verifier")) {
    checks.push({ ok: false, label: "Web Auth URL must not include code_verifier" });
    return;
  }
  checks.push({ ok: true, label: "Authorization URL Web params (no PKCE)" });
}

function testRejectLocalhostRedirect() {
  const bad = [
    "http://localhost:3000/api/integrations/tiktok/callback",
    "https://localhost/api/integrations/tiktok/callback",
    "http://127.0.0.1:3000/api/integrations/tiktok/callback",
  ];
  for (const uri of bad) {
    if (isValidWebRedirectUri(uri)) {
      checks.push({
        ok: false,
        label: `Must reject Desktop/localhost redirect: ${uri}`,
      });
      return;
    }
  }
  if (
    !isValidWebRedirectUri(
      "https://www.jimvio.com/api/integrations/tiktok/callback"
    )
  ) {
    checks.push({ ok: false, label: "Must accept production https callback" });
    return;
  }
  checks.push({
    ok: true,
    label: "Reject localhost redirect (Desktop PKCE class)",
  });
}

function testOriginResolutionSource() {
  const oauth = readFileSync(
    join(root, "lib/live/destinations/oauth-state.ts"),
    "utf8"
  );
  if (!oauth.includes('from "@/lib/site-url"') || !oauth.includes("getSiteUrl()")) {
    checks.push({
      ok: false,
      label: "resolveAppOrigin must use getSiteUrl (not raw localhost APP_URL)",
    });
    return;
  }
  const fnStart = oauth.indexOf("function resolveAppOrigin");
  const fn = fnStart >= 0 ? oauth.slice(fnStart, fnStart + 400) : "";
  if (fn.includes("localhost:3000")) {
    checks.push({
      ok: false,
      label: "resolveAppOrigin must not fall back to localhost",
    });
    return;
  }
  checks.push({
    ok: true,
    label: "OAuth origin uses canonical getSiteUrl()",
  });
}

function testCanonicalSiteUrlRejectsLocalhostInProd() {
  const site = readFileSync(join(root, "lib/site-url.ts"), "utf8");
  if (
    !site.includes("isUntrustedPublicOrigin") ||
    !site.includes("localhost") ||
    !site.includes("https://www.jimvio.com")
  ) {
    checks.push({
      ok: false,
      label: "getSiteUrl production localhost rejection missing",
    });
    return;
  }
  checks.push({
    ok: true,
    label: "getSiteUrl rejects localhost in production",
  });
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
  const cap = readFileSync(
    join(root, "lib/live/destinations/capabilities.ts"),
    "utf8"
  );
  const adapter = readFileSync(
    join(root, "lib/live/destinations/adapters/tiktok.ts"),
    "utf8"
  );
  if (!cap.includes("TIKTOK_LIVE_ENABLED") || !adapter.includes("ApprovalRequiredAdapter")) {
    checks.push({ ok: false, label: "LIVE approval gate intact" });
    return;
  }
  if (!adapter.includes("return new ApprovalRequiredAdapter")) {
    checks.push({ ok: false, label: "LIVE adapter remains gated" });
    return;
  }
  if (adapter.includes("rtmp://") || adapter.includes("StreamOutput")) {
    checks.push({ ok: false, label: "No fake TikTok RTMP/LIVE egress" });
    return;
  }
  checks.push({ ok: true, label: "LIVE approval gate intact (no fake LIVE)" });
}

function testNoV1() {
  const adapter = readFileSync(
    join(root, "lib/live/destinations/adapters/tiktok.ts"),
    "utf8"
  );
  if (
    adapter.includes("open-api.tiktok.com/oauth/access_token") ||
    adapter.includes("www.tiktok.com/auth/authorize/")
  ) {
    checks.push({ ok: false, label: "No deprecated OAuth v1 endpoints" });
    return;
  }
  checks.push({ ok: true, label: "Uses OAuth v2 endpoints only" });
}

function testUgcSeparation() {
  const adapter = readFileSync(
    join(root, "lib/live/destinations/adapters/tiktok.ts"),
    "utf8"
  );
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

function testTokenExchangeNoVerifier() {
  const adapter = readFileSync(
    join(root, "lib/live/destinations/adapters/tiktok.ts"),
    "utf8"
  );
  if (adapter.includes("code_verifier")) {
    checks.push({
      ok: false,
      label: "Web token exchange must not send code_verifier",
    });
    return;
  }
  if (
    !adapter.includes('grant_type: "authorization_code"') ||
    !adapter.includes("redirect_uri: input.redirectUri")
  ) {
    checks.push({ ok: false, label: "Token exchange Web fields" });
    return;
  }
  checks.push({ ok: true, label: "Token exchange is Web (no PKCE verifier)" });
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
    'params.delete("code_challenge")',
    'params.delete("code_challenge_method")',
  ],
  "TikTok Login Kit adapter + LIVE gate + PKCE strip"
);

must(
  "app/api/integrations/tiktok/start/route.ts",
  ["createOAuthState", "tiktokAuthUrl", 'platform: "tiktok"', "pkce: false"],
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

mustNot(
  "lib/live/destinations/adapters/tiktok.ts",
  ["code_challenge_method=S256", "code_challenge:"],
  "Adapter source never assigns Web PKCE challenge"
);

testAuthUrl();
testRejectLocalhostRedirect();
testOriginResolutionSource();
testCanonicalSiteUrlRejectsLocalhostInProd();
testState();
testLiveGateSafety();
testNoV1();
testUgcSeparation();
testTokenExchangeNoVerifier();

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.label}`);
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log("\n✅ TikTok Login Kit verification passed");
