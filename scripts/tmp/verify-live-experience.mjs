/**
 * Production Live experience — sessions, ACL, community scoping.
 * Auto-picked up by ci:prepush via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const sessionSvc = mustExist("services/live/session-service.ts");
const sessionRoute = mustExist("app/api/c/live/sessions/[id]/route.ts");
const createRoute = mustExist("app/api/c/live/sessions/route.ts");
const tokenRoute = mustExist("app/api/live/token/route.ts");
const liveApi = mustExist("app/api/c/live/route.ts");
const hubLive = mustExist("components/community/hub/hub-live-page.tsx");
const liveSection = mustExist(
  "components/community/workspace/sections/LiveSection.tsx"
);
const slugPage = mustExist("app/communities/(hubs)/[slug]/live/page.tsx");
const roles = mustExist("lib/live/roles.ts");
const collabVerify = mustExist("scripts/tmp/verify-live-collaboration-suite.mjs");

assert.match(sessionSvc, /canViewLiveSession/);
assert.match(sessionSvc, /invite_only/);
assert.match(sessionSvc, /normalizePrivacy|LiveSessionPrivacy/);
assert.match(sessionSvc, /getActiveLiveForCommunity/);
assert.match(sessionSvc, /listScheduledLivesForCommunity/);
assert.match(sessionSvc, /getLatestEndedLiveForCommunity/);
assert.match(sessionSvc, /assertCommunityMember/);
assert.match(sessionSvc, /COMMUNITY_STAFF_ROLES|assertCommunityStaff/);

assert.match(sessionRoute, /canViewLiveSession/);
assert.match(sessionRoute, /rateLimit/);
assert.match(sessionRoute, /No access/);
assert.match(createRoute, /rateLimit/);
assert.match(tokenRoute, /rateLimit/);

assert.match(liveApi, /slug|communityId/);
assert.match(liveApi, /getHubLiveDashboard/);

assert.match(hubLive, /onLeave|leaveLive/);
assert.match(hubLive, /Accept|pendingInvite/);
assert.match(hubLive, /started_at/);
assert.match(hubLive, /Discussion/);
assert.match(hubLive, /liveStatusLabel|ENDED|UPCOMING|OFFLINE/);
assert.match(hubLive, /discussionHref/);

assert.match(liveSection, /Discussion/);
assert.match(liveSection, /Open Live Studio|Join Live Studio/);
assert.match(liveSection, /api\/c\/live\?slug=/);

assert.match(slugPage, /communitySlug=\{slug\}/);
assert.match(roles, /canEndLive/);
assert.match(roles, /cohost/);

assert.match(collabVerify, /Live collaboration suite/);

const dock = mustExist("components/community/hub/live/ControlDock.tsx");
assert.match(dock, /onLeave/);
assert.match(dock, /Leave/);
assert.match(sessionSvc, /assertCanHostLive|creator/);
assert.match(sessionSvc, /Join the live session before requesting/);
assert.match(sessionSvc, /No pending speak request/);

console.log("verify-live-experience: ok");

