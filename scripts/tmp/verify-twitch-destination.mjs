/**
 * Static verification: Twitch live destination integration invariants.
 * Run via: VERIFY_FILTER=twitch npm test  OR  node scripts/tmp/verify-twitch-destination.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed += 1;
}

function read(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    fail(`missing file ${rel}`);
    return "";
  }
  return readFileSync(p, "utf8");
}

console.log("verify-twitch-destination");

const twitch = read("lib/live/destinations/adapters/twitch.ts");
const start = read("app/api/integrations/twitch/start/route.ts");
const callback = read("app/api/integrations/twitch/callback/route.ts");
const manager = read("lib/live/destinations/destination-manager.ts");
const oauthState = read("lib/live/destinations/oauth-state.ts");
const disconnect = read("app/api/live/destinations/[id]/route.ts");
const obs = read("lib/live/observability.ts");
const migration = read(
  "supabase/migrations/20260920000305_twitch_destination_hardening.sql"
);

if (twitch.includes("channel:read:stream_key")) ok("requests stream_key scope");
else fail("missing channel:read:stream_key");

if (twitch.includes("channel:manage:broadcast")) ok("requests broadcast scope");
else fail("missing channel:manage:broadcast");

if (!twitch.includes("user:read:email")) ok("does not request user:read:email");
else fail("still requests unused user:read:email");

if (twitch.includes("id.twitch.tv/oauth2/validate")) ok("uses official validate endpoint");
else fail("missing oauth2/validate");

if (twitch.includes("oauth2/revoke")) ok("supports token revoke");
else fail("missing revoke");

if (twitch.includes("force_verify")) ok("force_verify on auth URL");
else fail("missing force_verify");

if (start.includes("twitch_oauth_started")) ok("start logs twitch_oauth_started");
else fail("start missing observability");

if (callback.includes("twitch_oauth_success")) ok("callback logs success");
else fail("callback missing success log");

if (callback.includes("exchangeTwitchCode")) ok("callback exchanges code server-side");
else fail("callback missing exchange");

if (oauthState.includes('.is("consumed_at", null)')) ok("atomic oauth state consume");
else fail("oauth state consume not atomic");

if (manager.includes("updateStoredCredentials") && manager.includes("twitch_token_refresh"))
  ok("manager persists refreshed Twitch tokens");
else fail("manager missing refresh persist / log");

if (disconnect.includes("revokeTwitchAccess")) ok("disconnect revokes Twitch token");
else fail("disconnect missing Twitch revoke");

if (obs.includes("twitch_destination_started")) ok("observability events registered");
else fail("missing twitch observability events");

if (migration.includes("encrypted_credentials") && migration.includes("reconnect_required"))
  ok("migration hardens credentials + status");
else fail("migration incomplete");

if (twitch.includes("TWITCH_CLIENT_SECRET") && !twitch.includes("NEXT_PUBLIC_TWITCH"))
  ok("client secret stays server-side");
else fail("Twitch secret exposure risk");

if (failed) {
  console.error(`\nFAILED (${failed})`);
  process.exit(1);
}
console.log("\n✅ Twitch destination verification passed");
