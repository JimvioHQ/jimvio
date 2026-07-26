/**
 * Production Live experience — sessions, ACL, community scoping, hardening.
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
const notifyLive = mustExist("lib/community/notify-live.ts");
const migration = mustExist(
  "supabase/migrations/20260726110000_live_production_hardening.sql"
);
const useSession = mustExist("hooks/live/useLiveSession.ts");
const useChat = mustExist("hooks/live/useLiveChat.ts");
const recordingRoute = mustExist("app/api/live/sessions/[id]/recording/route.ts");

assert.match(sessionSvc, /canViewLiveSession/);
assert.match(sessionSvc, /invite_only/);
assert.match(sessionSvc, /normalizePrivacy|LiveSessionPrivacy/);
assert.match(sessionSvc, /getActiveLiveForCommunity/);
assert.match(sessionSvc, /listScheduledLivesForCommunity/);
assert.match(sessionSvc, /getLatestEndedLiveForCommunity/);
assert.match(sessionSvc, /assertCommunityMember/);
assert.match(sessionSvc, /COMMUNITY_STAFF_ROLES|assertCommunityStaff/);
assert.match(sessionSvc, /startScheduledLive/);
assert.match(sessionSvc, /cancelLiveSession/);
assert.match(sessionSvc, /transferHost/);
assert.match(sessionSvc, /setParticipantRole/);
assert.match(sessionSvc, /emitLiveReaction/);
assert.match(sessionSvc, /assertNoActiveLiveInSpace|uq_live_sessions_space|already has a live/);
assert.match(sessionSvc, /max_viewers|at capacity/);
assert.match(sessionSvc, /left_at/);
assert.match(sessionSvc, /total_watch_seconds/);
assert.match(sessionSvc, /notifyCommunityLiveEvent/);
assert.match(sessionSvc, /getActiveLiveForSpace/);
assert.match(sessionSvc, /listLiveHistoryForSpace|listLiveHistoryForCommunity/);
assert.match(sessionSvc, /slow_mode_seconds|subscribers_only/);

assert.match(sessionRoute, /canViewLiveSession/);
assert.match(sessionRoute, /rateLimit/);
assert.match(sessionRoute, /No access/);
assert.match(sessionRoute, /transfer-host/);
assert.match(sessionRoute, /"start"/);
assert.match(sessionRoute, /"cancel"/);
assert.match(sessionRoute, /"react"/);
assert.match(sessionRoute, /"promote"|set-role/);
assert.match(createRoute, /rateLimit/);
assert.match(createRoute, /scheduledAt|spaceId/);
assert.match(createRoute, /sendDueLiveReminders/);
assert.match(tokenRoute, /rateLimit/);

assert.match(liveApi, /slug|communityId/);
assert.match(liveApi, /getHubLiveDashboard/);

assert.match(hubLive, /onLeave|leaveLive/);
assert.match(hubLive, /Accept|pendingInvite/);
assert.match(hubLive, /started_at/);
assert.match(hubLive, /Discussion/);
assert.match(hubLive, /liveStatusLabel|ENDED|UPCOMING|OFFLINE/);
assert.match(hubLive, /discussionHref/);
assert.match(hubLive, /live\.react|onReact/);

assert.match(liveSection, /Discussion/);
assert.match(liveSection, /Open Live Studio|Join Live Studio/);
assert.match(liveSection, /api\/c\/live\?slug=/);
assert.match(liveSection, /liveSessionId|Join Live/);

assert.match(slugPage, /communitySlug=\{slug\}/);
assert.match(roles, /canEndLive/);
assert.match(roles, /cohost/);
assert.match(roles, /cancelled/);

assert.match(collabVerify, /Live collaboration suite/);
assert.match(notifyLive, /live_started|live_ended|live_reminder/);
assert.match(migration, /uq_live_sessions_space_one_live/);
assert.match(migration, /total_watch_seconds/);
assert.match(migration, /live_session_signals/);

assert.match(useSession, /scheduleRefresh|seenEvents/);
assert.match(useSession, /transferHost|startScheduled|cancelScheduled/);
assert.match(useChat, /reply_to_id|seenInserts|scheduleReload/);
assert.match(recordingRoute, /export async function GET/);
assert.match(recordingRoute, /listSessionRecordings|replayUrl/);

const dock = mustExist("components/community/hub/live/ControlDock.tsx");
assert.match(dock, /onLeave/);
assert.match(dock, /Leave/);
assert.match(sessionSvc, /assertCanHostLive|creator/);
assert.match(sessionSvc, /Join the live session before requesting/);
assert.match(sessionSvc, /No pending speak request/);

const hubData = mustExist("services/community/hub-data.ts");
assert.match(hubData, /getActiveLiveForCommunity/);
assert.match(hubData, /peak_viewers|total_watch_seconds/);

console.log("verify-live-experience: ok");
