/**
 * Static verification: Live Studio final product polish invariants.
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

console.log("verify-live-studio-polish");

const prep = read("components/community/hub/live/LivePrepareStage.tsx");
const types = read("components/community/hub/live/studio-types.ts");
const panels = read("components/community/hub/live/panels.tsx");
const dest = read("components/community/hub/live/LiveDestinationsPanel.tsx");
const hub = read("components/community/hub/hub-live-page.tsx");
const nav = read("components/community/hub/live/LiveContextNav.tsx");

if (prep.includes("Stream to multiple platforms") && !prep.includes("Enable camera & microphone"))
  ok("primary Stream CTA; no giant Enable camera button");
else fail("prepare stage CTA incomplete");

if (!prep.includes("Prepare your camera and microphone"))
  ok("prepare instructional block removed");
else fail("prepare instructional block still present");

if (types.includes('id: "chat", label: "Chat"') &&
    types.match(/export const RIGHT_TABS[\s\S]*?\];/)?.[0]?.includes("Q&A") === false)
  ok("RIGHT_TABS is Chat-only");
else {
  const block = types.slice(types.indexOf("export const RIGHT_TABS"), types.indexOf("export const ALL_RIGHT_TABS"));
  if (block.includes("Q&A") || block.includes("Polls") || block.includes("Analytics"))
    fail("RIGHT_TABS still has secondary tabs");
  else ok("RIGHT_TABS is Chat-only");
}

if (!panels.includes(">Workspace mode<") && !panels.includes("Workspace mode\n") &&
    !/Workspace mode\s*<\/p>/.test(panels) &&
    !panels.includes("Shortcuts: ⌘K") &&
    !panels.includes('["minimal", "Minimal"]'))
  ok("Settings removed Workspace Mode + shortcuts paragraph");
else fail("Settings still shows workspace/shortcuts");

if (!dest.includes("Account linked · Live needs App") &&
    !dest.includes("Live API access pending App Review"))
  ok("TikTok approval copy removed from destination cards");
else fail("TikTok approval copy still in destinations UI");

if (hub.includes("onStreamDestinations") || hub.includes("Stream to multiple"))
  ok("hub wires Stream destinations CTA");
else fail("hub missing Stream destinations wiring");

if (!nav.includes('label: "Q&A"') && !nav.includes('label: "Analytics"'))
  ok("context nav is Chat-focused");
else fail("context nav still exposes Q&A/Analytics");

if (failed) { console.error(`\nFAILED (${failed})`); process.exit(1); }
console.log("\n✅ Live Studio polish verification passed");
