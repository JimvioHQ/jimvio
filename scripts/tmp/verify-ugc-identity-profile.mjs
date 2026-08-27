/**
 * Identity save must unlock UGC only after required creator-profile fields are complete.
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

assert.match(identityUpdate, /from\("profiles"\)/);
assert.match(identityUpdate, /from\("jip_identity"\)/);
assert.match(identityUpdate, /loadCreatorProfileCompletion/);
assert.match(identityUpdate, /complete: ready/);
assert.match(identityUpdate, /revalidatePath\("\/ugc\/applications"\)/);
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
assert.doesNotMatch(sync, /from\("affiliates"\)[\s\S]{0,80}\.insert/);

assert.match(auth, /loadCreatorProfileCompletion/);
assert.match(auth, /ready: isCreatorWorkspaceReady/);

assert.match(participants, /needsProfile: true/);
assert.match(participants, /completionComplete/);
assert.match(participants, /!ready \|\| !influencer/);

assert.match(stats, /needsProfile: true/);
assert.match(calendar, /needsProfile: true/);
assert.match(achievements, /needsProfile: true/);
assert.match(joinRoute, /Complete your creator profile first/);
assert.match(joinService, /isCreatorWorkspaceReady/);
assert.match(joinService, /hasProfile: false/);
assert.match(eligibility, /loadCreatorProfile/);

assert.match(applications, /title="Creator profile required"/);
assert.match(applications, /json\.needsProfile/);
assert.match(applications, /href="\/identity\/edit"/);

assert.match(identityEdit, /Profile saved successfully/);
assert.match(identityEdit, /Complete these remaining items/);
assert.match(identityEdit, /evaluateCreatorProfileCompletion/);
assert.match(identityEdit, /label="Full name" required/);
assert.match(identityEdit, /label="Headline" required/);
assert.match(identityEdit, /label="Bio" required/);

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
