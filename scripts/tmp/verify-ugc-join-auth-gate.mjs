/**
 * UGC Join Campaign must gate unauthenticated users to /login with safe next=.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const joinPage = read("app/ugc/[id]/join/page.tsx");
const joinApi = read("app/api/ugc/campaigns/[id]/join/route.ts");
const joinAuth = read("lib/ugc/join-auth.ts");
const gate = read("components/ugc/join/JoinCampaignGateLink.tsx");
const flow = read("components/ugc/join/CampaignJoinFlow.tsx");
const card = read("components/ugc/workspace/UGCPremiumCampaignCard.tsx");
const header = read("components/ugc/workspace/UGCFeaturedHeader.tsx");

assert.match(joinPage, /getCachedUser/);
assert.match(joinPage, /loginUrlForReturnPath/);
assert.match(joinPage, /redirect\(/);
assert.match(joinApi, /requireUser/);
assert.match(joinApi, /status: 401/);
assert.match(joinAuth, /isSafeInternalPath/);
assert.match(joinAuth, /sanitizeJoinReturnPath/);
assert.match(joinAuth, /loginUrlForReturnPath/);
assert.doesNotMatch(joinAuth, /https:\/\/evil/);
assert.match(gate, /JoinCampaignGateLink/);
assert.match(gate, /auth\.getUser/);
assert.match(flow, /loginUrlForReturnPath/);
assert.match(flow, /res\.status === 401/);
assert.match(card, /JoinCampaignGateLink/);
assert.match(header, /JoinCampaignGateLink/);
assert.match(header, /joinCampaign/);

console.log("verify-ugc-join-auth-gate: ok");
