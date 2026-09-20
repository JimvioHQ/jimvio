/**
 * Static verification: Live Destinations UI shows only Jimvio/YouTube/Twitch/TikTok.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failed = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function fail(m) { console.error(`  ✗ ${m}`); failed += 1; }
function read(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) { fail(`missing ${rel}`); return ""; }
  return readFileSync(p, "utf8");
}

console.log("verify-live-destinations-visibility");

const caps = read("lib/live/destinations/capabilities.ts");
const panel = read("components/community/hub/live/LiveDestinationsPanel.tsx");
const api = read("app/api/live/destinations/route.ts");
const link = read("components/community/hub/live/LiveDestinationsStudioLink.tsx");

if (caps.includes("USER_VISIBLE_LIVE_DESTINATIONS") &&
    caps.includes('"jimvio"') &&
    caps.includes('"youtube"') &&
    caps.includes('"twitch"') &&
    caps.includes('"tiktok"')) ok("visibility registry present");
else fail("visibility registry incomplete");

if (panel.includes("USER_VISIBLE_LIVE_DESTINATIONS") &&
    panel.includes("isUserVisibleLiveDestination")) ok("panel uses visibility registry");
else fail("panel missing visibility filter");

if (!panel.includes("Facebook Live requires") &&
    !panel.includes("Instagram Live requires")) ok("Meta approval messages removed from panel");
else fail("Meta approval messages still in panel");

if (panel.includes("UGCPlatformIcon")) ok("brand icons used");
else fail("missing brand icons");

if (api.includes("USER_VISIBLE_LIVE_DESTINATIONS") &&
    !/const CATALOG[\s\S]*?facebook/.test(api) &&
    !api.includes('"facebook"')) ok("API catalog excludes facebook");
else if (api.includes("USER_VISIBLE_LIVE_DESTINATIONS") && !api.includes('"facebook"') && !api.includes('"instagram"')) ok("API catalog excludes facebook");
else fail("API catalog still lists facebook");

if (link.includes("isUserVisibleLiveDestination")) ok("studio link filters counts");
else fail("studio link missing visibility filter");

// Panel should not render facebook/instagram rows from catalog iteration of those platforms
if (!panel.includes('case "facebook"') && !panel.includes("platformIconLabel")) ok("letter FB/IG glyphs removed");
else if (!panel.includes('case "facebook"')) ok("no facebook icon case");
else fail("facebook still in panel switch");

if (failed) { console.error(`\nFAILED (${failed})`); process.exit(1); }
console.log("\n✅ Live destinations visibility verification passed");
