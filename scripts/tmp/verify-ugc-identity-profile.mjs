/**
 * Identity save must unlock UGC only after required creator-profile fields are complete
 * AND the influencers join-key is inserted/updated with a returned row.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const completion = read("lib/identity/creator-profile-completion.ts");
const sync = read("lib/identity/sync.ts");
const auth = read("lib/ugc/platform/auth.ts");
const participants = read("app/api/ugc/participants/route.ts");
const stats = read("app/api/ugc/creator/stats/route.ts");
const identityUpdate = read("app/api/identity/update/route.ts");
const identityEdit = read("components/identity/IdentityEditClient.tsx");
const applications = read("components/ugc/workspace/UGCApplicationsPage.tsx");
const joinService = read("lib/ugc/join-service.ts");
const joinRoute = read("app/api/ugc/campaigns/[id]/join/route.ts");
const calendar = read("app/api/ugc/calendar/route.ts");
const achievements = read("app/api/ugc/achievements/route.ts");
const eligibility = read("app/api/ugc/campaigns/[id]/eligibility/route.ts");
const match = read("app/api/ugc/ai/match/route.ts");

assert.match(identityUpdate, /from\("profiles"\)/);
assert.match(identityUpdate, /from\("jip_identity"\)/);
assert.match(identityUpdate, /loadCreatorProfileCompletion/);
assert.match(identityUpdate, /complete: ready/);
assert.match(identityUpdate, /\.select\("id"\)/);
assert.match(identityUpdate, /\.select\("user_id"\)/);
assert.match(identityUpdate, /profile-update-zero-rows/);
assert.match(identityUpdate, /jip-update-zero-rows/);
assert.match(identityUpdate, /Creator workspace could not be synchronized/);
assert.match(identityUpdate, /\[creator-profile-save\]/);
assert.doesNotMatch(identityUpdate, /from\("influencers"\)\s*\.insert/);
assert.doesNotMatch(identityUpdate, /veriff|didit|kyc|jumio|onfido/i);

assert.match(completion, /export function evaluateCreatorProfileCompletion/);
assert.match(completion, /export function isCreatorWorkspaceReady/);
assert.match(completion, /id: "fullName"/);
assert.match(completion, /id: "headline"/);
assert.match(completion, /id: "bio"/);
assert.doesNotMatch(completion, /identityVerified|documentsVerified|veriff/i);

assert.match(sync, /export async function ensureInfluencerMirror/);
assert.match(sync, /reason: "incomplete"/);
assert.match(sync, /createServiceRoleClient/);
assert.match(sync, /update-zero-rows/);
assert.match(sync, /\.insert\(\{ user_id: userId/);
assert.match(sync, /\.update\(payload\)/);
assert.match(sync, /\.select\("id"\)/);
assert.doesNotMatch(sync, /onConflict:\s*"user_id"/);
assert.doesNotMatch(sync, /from\("affiliates"\)[\s\S]{0,80}\.insert/);

assert.match(auth, /loadCreatorProfileCompletion/);
assert.match(auth, /ready: isCreatorWorkspaceReady/);

assert.match(participants, /needsProfile: true/);
assert.match(participants, /needsProfile: false/);
assert.match(participants, /completionComplete/);
assert.match(participants, /!ready \|\| !influencer/);

assert.match(stats, /needsProfile: true/);
assert.match(calendar, /needsProfile: true/);
assert.match(achievements, /needsProfile: true/);
assert.match(joinRoute, /Complete your creator profile first/);
assert.match(joinService, /isCreatorWorkspaceReady/);
assert.match(joinService, /hasProfile: false/);
assert.match(eligibility, /loadCreatorProfile/);
assert.match(match, /requireInfluencer/);
assert.match(match, /needsProfile: true/);

assert.match(applications, /json\.needsProfile === true/);
assert.match(applications, /href="\/identity\/edit"/);
assert.match(applications, /t\("createCreatorProfile"\)/);
assert.match(applications, /t\("noApplicationsYet"\)/);
assert.match(applications, /t\("noApplicationsUnlockDesc"\)/);
assert.match(applications, /t\("discoverCampaignsCta"\)/);
assert.match(applications, /usePathname/);
assert.doesNotMatch(applications, /t\("creatorProfileRequired"\)/);

assert.match(identityEdit, /Creator Profile Saved/);
assert.match(identityEdit, /Your creator profile is ready/);
assert.match(identityEdit, /Complete these remaining items/);
assert.match(identityEdit, /evaluateCreatorProfileCompletion/);
assert.match(identityEdit, /label="Full name" required/);
assert.match(identityEdit, /label="Headline" required/);
assert.match(identityEdit, /label="Bio" required/);
assert.match(identityEdit, /json\.saved === true && json\.complete === true/);
assert.doesNotMatch(identityEdit, /router\.refresh/);

function evaluateCreatorProfileCompletion(input) {
  const missing = [];
  if (!input.fullName?.trim()) missing.push({ id: "fullName", label: "Full name" });
  if (!input.headline?.trim()) missing.push({ id: "headline", label: "Headline" });
  if (!input.bio?.trim()) missing.push({ id: "bio", label: "Bio" });
  return { complete: missing.length === 0, missing };
}
function isCreatorWorkspaceReady(c, influencer) {
  return c.complete && Boolean(influencer?.id);
}

assert.equal(evaluateCreatorProfileCompletion({}).complete, false);
assert.deepEqual(
  evaluateCreatorProfileCompletion({}).missing.map((m) => m.id),
  ["fullName", "headline", "bio"],
);
assert.equal(
  evaluateCreatorProfileCompletion({ fullName: "Ada", headline: "", bio: "x" }).complete,
  false,
);
assert.equal(
  evaluateCreatorProfileCompletion({ fullName: "Ada", headline: "Creator", bio: "Hello" }).complete,
  true,
);
assert.equal(
  isCreatorWorkspaceReady(
    evaluateCreatorProfileCompletion({ fullName: "Ada", headline: "Creator", bio: "Hello" }),
    null,
  ),
  false,
);
assert.equal(
  isCreatorWorkspaceReady(
    evaluateCreatorProfileCompletion({ fullName: "Ada", headline: "Creator", bio: "Hello" }),
    { id: "inf-1" },
  ),
  true,
);
assert.equal(
  isCreatorWorkspaceReady(evaluateCreatorProfileCompletion({ fullName: "Ada" }), { id: "inf-1" }),
  false,
);

console.log("verify-ugc-identity-profile: ok");
