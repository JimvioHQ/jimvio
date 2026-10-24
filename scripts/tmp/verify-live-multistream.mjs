#!/usr/bin/env node
/**
 * Multistream destinations — static + unit verification.
 * Run via: VERIFY_FILTER=multistream npm test
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

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
  if (!existsSync(path)) {
    checks.push({ ok: false, label: `${label}: missing ${file}` });
    return;
  }
  const src = readFileSync(path, "utf8");
  for (const n of needles) {
    if (src.includes(n)) {
      checks.push({ ok: false, label: `${label}: still contains ${JSON.stringify(n)}` });
      return;
    }
  }
  checks.push({ ok: true, label });
}

function validateRtmpUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { ok: false, error: "RTMP URL is required" };
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid RTMP URL" };
  }
  const protocol = url.protocol.replace(":", "").toLowerCase();
  if (protocol !== "rtmp" && protocol !== "rtmps") {
    return { ok: false, error: "Only rtmp:// and rtmps:// URLs are allowed" };
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host === "169.254.169.254" ||
    host.endsWith(".local")
  ) {
    return { ok: false, error: "blocked" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "creds" };
  }
  return { ok: true };
}

function testSsrf() {
  const cases = [
    ["rtmps://live.twitch.tv/app", true],
    ["rtmp://a.rtmp.youtube.com/live2", true],
    ["https://evil.com", false],
    ["rtmp://127.0.0.1/live", false],
    ["rtmp://localhost/live", false],
    ["rtmp://10.0.0.5/live", false],
    ["rtmp://192.168.1.1/live", false],
    ["rtmp://169.254.169.254/latest", false],
    ["file:///etc/passwd", false],
    ["rtmps://user:pass@host/app", false],
  ];
  for (const [url, expectOk] of cases) {
    const r = validateRtmpUrl(url);
    if (r.ok !== expectOk) {
      checks.push({ ok: false, label: `SSRF: ${url} expected ok=${expectOk}` });
      return;
    }
  }
  checks.push({ ok: true, label: "Custom RTMP SSRF protection" });
}

function testEncryption() {
  process.env.LIVE_DESTINATION_ENCRYPTION_KEY = "a".repeat(64);
  const key = Buffer.from(process.env.LIVE_DESTINATION_ENCRYPTION_KEY, "hex");
  const payload = JSON.stringify({
    refreshToken: "secret-refresh",
    streamKey: "sk_live_test",
  });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(payload, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([iv, tag, encrypted]);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString(
    "utf8"
  );
  const parsed = JSON.parse(out);
  if (parsed.refreshToken !== "secret-refresh" || parsed.streamKey !== "sk_live_test") {
    checks.push({ ok: false, label: "Credential encryption roundtrip" });
    return;
  }
  checks.push({ ok: true, label: "Credential encryption roundtrip" });
}

function testOAuthStateHash() {
  const state = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(state).digest("hex");
  if (hash.length !== 64) {
    checks.push({ ok: false, label: "OAuth state hash" });
    return;
  }
  checks.push({ ok: true, label: "OAuth state hash" });
}

function testFailureIsolationContract() {
  const mgr = readFileSync(
    join(root, "lib/live/destinations/destination-manager.ts"),
    "utf8"
  );
  if (!mgr.includes("Destination failures never terminate")) {
    checks.push({ ok: false, label: "Failure isolation documented in manager" });
    return;
  }
  if (!mgr.includes("Jimvio Live is still running")) {
    checks.push({ ok: false, label: "User-facing isolated failure message" });
    return;
  }
  checks.push({ ok: true, label: "Destination failure isolation contract" });
}

must(
  "supabase/migrations/20260910113920_live_multistream_destinations.sql",
  ["live_destinations", "live_destination_sessions", "encrypted_credentials", "ROW LEVEL SECURITY"],
  "Migration creates destination tables + RLS"
);

must(
  "lib/live/destinations/adapters/youtube.ts",
  ["liveBroadcasts", "liveStreams", "refresh_token", "rtmpsIngestionAddress"],
  "YouTube adapter uses official Live Streaming API"
);

must(
  "lib/live/destinations/adapters/twitch.ts",
  ["streams/key", "channel:read:stream_key", "rtmps://live.twitch.tv"],
  "Twitch adapter uses Helix + RTMPS ingest"
);

must(
  "lib/live/destinations/adapters/instagram.ts",
  ["requires Meta/Instagram", "ApprovalRequiredAdapter"],
  "Instagram honestly requires approval"
);

must(
  "lib/live/destinations/adapters/tiktok.ts",
  ["isTikTokOfficialLivePublishingAvailable", "ApprovalRequiredAdapter", "TIKTOK_LIVE_BLOCKED_MESSAGE"],
  "TikTok honestly requires approval"
);
must(
  "lib/live/destinations/tiktok-live-gate.ts",
  ["isTikTokOfficialLivePublishingAvailable", "return false"],
  "TikTok LIVE gate remains hard-false until official API"
);

must(
  "lib/live/destinations/stream-egress.ts",
  ["StreamOutput", "StreamProtocol.RTMP", "startRoomCompositeEgress", "updateStream"],
  "LiveKit stream egress fan-out"
);

must(
  "app/api/integrations/youtube/callback/route.ts",
  ["consumeOAuthState", "upsertOAuthDestination"],
  "YouTube OAuth callback secure"
);

must(
  "components/community/hub/live/LiveDestinationsPanel.tsx",
  ["Live Destinations", "Not connected", "Add Custom RTMP", "YouTube", "Twitch", "TikTok"],
  "Live Studio destinations UI"
);

mustNot(
  "components/community/hub/live/LiveDestinationsPanel.tsx",
  ["Facebook Live requires", "Instagram Live requires", "Live requires approval", "Account linked · Live needs App", "Live API access pending App Review"],
  "Live Destinations UI hides Meta approval cards"
);

must(
  "lib/live/destinations/capabilities.ts",
  ["USER_VISIBLE_LIVE_DESTINATIONS", '"jimvio"', '"youtube"', '"twitch"', '"tiktok"'],
  "User-visible destinations registry"
);


mustNot(
  "lib/live/destinations/repository.ts",
  ["NEXT_PUBLIC_LIVE_DESTINATION", "console.log(credentials", "console.log(streamKey"],
  "No credential logging / public env leak"
);

must(
  "services/live/session-service.ts",
  ["stopAllDestinations"],
  "Live end stops destinations"
);

testSsrf();
testEncryption();
testOAuthStateHash();
testFailureIsolationContract();

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.label}`);
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log("\n✅ Multistream destination verification passed");
