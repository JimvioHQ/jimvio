#!/usr/bin/env node
/**
 * YouTube Live OAuth — scopes + redirect + isolation verification.
 * Run: VERIFY_FILTER=youtube npm test
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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

function testAuthUrlScopes() {
  const adapter = readFileSync(
    join(root, "lib/live/destinations/adapters/youtube.ts"),
    "utf8"
  );
  const forceSsl = "https://www.googleapis.com/auth/youtube.force-ssl";
  if (!adapter.includes(forceSsl)) {
    checks.push({ ok: false, label: "Must request youtube.force-ssl" });
    return;
  }
  // Broader youtube scope must not appear in the auth URL scope array
  if (
    /scope:\s*\[[\s\S]*?googleapis\.com\/auth\/youtube"[\s\S]*?\]\.join/.test(
      adapter
    ) ||
    adapter.includes('"https://www.googleapis.com/auth/youtube",')
  ) {
    checks.push({
      ok: false,
      label: "Must not request redundant broader youtube scope",
    });
    return;
  }
  if (!adapter.includes("mapYouTubeOAuthError")) {
    checks.push({ ok: false, label: "mapYouTubeOAuthError helper missing" });
    return;
  }
  checks.push({ ok: true, label: "YouTube scopes minimized to force-ssl" });
}

function testSettingsRoute() {
  must(
    "app/identity/live-destinations/page.tsx",
    ["/communities/live", "open=settings"],
    "Legacy Live Destinations route redirects into Live Settings"
  );
  const settings = readFileSync(join(root, "app/identity/settings/page.tsx"), "utf8");
  if (settings.includes("Live Destinations") || settings.includes("/identity/live-destinations")) {
    checks.push({
      ok: false,
      label: "General Settings must not include Live Destinations",
    });
  } else {
    checks.push({
      ok: true,
      label: "General Settings does not include Live Destinations",
    });
  }
}

function testStudioNoCenterPanel() {
  const hub = readFileSync(
    join(root, "components/community/hub/hub-live-page.tsx"),
    "utf8"
  );
  if (!hub.includes("LiveDestinationsPanel")) {
    checks.push({
      ok: false,
      label: "Live Settings must embed LiveDestinationsPanel",
    });
    return;
  }
  if (!hub.includes("LiveDestinationsStudioLink")) {
    checks.push({
      ok: false,
      label: "Live Studio must keep compact destinations summary",
    });
    return;
  }
  if (hub.includes("destinationsSlot=")) {
    checks.push({
      ok: false,
      label: "Prepare stage must not mount full destinations card slot",
    });
    return;
  }
  checks.push({
    ok: true,
    label: "Live Destinations live in Live Settings with compact stage summary",
  });
}

function testSupabaseLoginUntouched() {
  must(
    "lib/auth/actions.ts",
    ['provider: "google"', "signInWithOAuth"],
    "Supabase Google login remains separate"
  );
  mustNot(
    "lib/auth/actions.ts",
    ["YOUTUBE_CLIENT_ID", "youtube.force-ssl"],
    "Login does not use YouTube Live OAuth client"
  );
}

must(
  "app/api/integrations/youtube/callback/route.ts",
  ["mapYouTubeOAuthError", "consumeOAuthState", "upsertOAuthDestination"],
  "YouTube callback maps errors safely"
);

must(
  "lib/live/destinations/adapters/youtube.ts",
  [
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "access_type",
    "offline",
    "prompt",
    "consent",
  ],
  "YouTube OAuth client env + offline consent"
);

mustNot(
  "app/api/integrations/youtube/callback/route.ts",
  ["client_secret", "refresh_token", "access_token"],
  "Callback route does not expose token field names"
);

testAuthUrlScopes();
testSettingsRoute();
testStudioNoCenterPanel();
testSupabaseLoginUntouched();

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.label}`);
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log("\n✅ YouTube OAuth + Live Destinations settings verification passed");
