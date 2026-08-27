/**
 * Identity save must unlock UGC creator surfaces via the existing influencers mirror.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const sync = read("lib/identity/sync.ts");
const auth = read("lib/ugc/platform/auth.ts");
const participants = read("app/api/ugc/participants/route.ts");
const stats = read("app/api/ugc/creator/stats/route.ts");
const identityUpdate = read("app/api/identity/update/route.ts");
const applications = read("components/ugc/workspace/UGCApplicationsPage.tsx");
const joinService = read("lib/ugc/join-service.ts");
const joinRoute = read("app/api/ugc/campaigns/[id]/join/route.ts");
const calendar = read("app/api/ugc/calendar/route.ts");
const achievements = read("app/api/ugc/achievements/route.ts");
const eligibility = read("app/api/ugc/campaigns/[id]/eligibility/route.ts");

assert.match(identityUpdate, /from\("profiles"\)/);
assert.match(identityUpdate, /from\("jip_identity"\)/);
assert.match(identityUpdate, /syncRoleMirrors\(user\.id\)/);
assert.doesNotMatch(identityUpdate, /from\("influencers"\)\s*\.insert/);
assert.doesNotMatch(identityUpdate, /veriff|didit|kyc|jumio|onfido/i);

assert.match(sync, /export function isIdentityReadyForCreatorMirror/);
assert.match(sync, /export async function ensureInfluencerMirror/);
assert.match(sync, /full_name\?\.trim\(\) \|\| profile\.username\?\.trim\(\) \|\| "Creator"/);
assert.match(sync, /createServiceRoleClient/);
assert.match(sync, /onConflict:\s*"user_id"/);
assert.match(sync, /\[ugc-influencer-mirror\]/);
assert.doesNotMatch(sync, /from\("affiliates"\)[\s\S]{0,80}\.insert/);

assert.match(auth, /ensureInfluencerMirror/);
assert.match(auth, /export async function requireInfluencer/);

assert.match(participants, /requireInfluencer/);
assert.match(participants, /needsProfile: true/);
assert.match(participants, /\[ugc-participants\]/);
assert.match(participants, /mirrorReason/);
assert.match(participants, /Cache-Control": "private, no-store"/);

assert.match(stats, /requireInfluencer/);
assert.match(stats, /needsProfile: true/);
assert.match(calendar, /requireInfluencer/);
assert.match(achievements, /requireInfluencer/);
assert.match(joinRoute, /requireInfluencer/);
assert.match(joinService, /ensureInfluencerMirror/);
assert.match(eligibility, /loadCreatorProfile/);

assert.match(applications, /json\.needsProfile/);
assert.match(applications, /setNeedsProfile\(false\)/);
assert.match(applications, /href="\/identity\/edit"/);
assert.doesNotMatch(applications, /from\("ugc_creator_profiles"\)/);

function identityDisplayName(profile) {
  return profile.full_name?.trim() || profile.username?.trim() || "Creator";
}
assert.equal(identityDisplayName({ full_name: " Ada ", username: "x" }), "Ada");
assert.equal(identityDisplayName({ full_name: "  ", username: "bob" }), "bob");
assert.equal(identityDisplayName({ full_name: "", username: "" }), "Creator");

console.log("verify-ugc-identity-profile: ok");
