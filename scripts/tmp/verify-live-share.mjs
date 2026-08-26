/**
 * Live share / canonical URL / poll vote / chat send hardening.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
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

const liveUrl = mustExist("lib/live/live-url.ts");
const siteUrl = mustExist("lib/site-url.ts");
const nativeShare = mustExist("lib/live/native-share.ts");
const shareMessages = mustExist("lib/live/share-messages.ts");
const shareLive = mustExist("services/live/share-live.ts");
const shareRoute = mustExist("app/api/c/live/sessions/[id]/share/route.ts");
const shareSheet = mustExist("components/community/hub/live/LiveShareSheet.tsx");
const hubLive = mustExist("components/community/hub/hub-live-page.tsx");
const helpers = mustExist("lib/community/live-collab/helpers.ts");
const dock = mustExist("components/community/hub/live/ControlDock.tsx");
const sessionSvc = mustExist("services/live/session-service.ts");
const sessionRoute = mustExist("app/api/c/live/sessions/[id]/route.ts");
const chatRoute = mustExist("app/api/c/live/sessions/[id]/chat/route.ts");
const messagesRoute = mustExist("app/api/messages/[roomId]/route.ts");
const engagement = mustExist("components/community/live-collab/LiveEngagementPanels.tsx");
const useSession = mustExist("hooks/live/useLiveSession.ts");
const recordingRoute = mustExist("app/api/live/sessions/[id]/recording/route.ts");
const mediaPlane = mustExist("lib/live/media-plane.ts");
const roles = mustExist("lib/live/roles.ts");

assert.match(liveUrl, /canonicalLiveUrl/);
assert.match(liveUrl, /LIVE_SESSION_PATH_PREFIX = "\/communities\/live"/);
assert.match(liveUrl, /getSiteUrl\(\)/);
assert.match(liveUrl, /isLiveSessionId/);
assert.match(siteUrl, /vercel\.app/);
assert.match(siteUrl, /localhost/);
assert.match(siteUrl, /PRODUCTION_URL/);
assert.match(siteUrl, /NODE_ENV === "production"/);

assert.match(nativeShare, /AbortError/);
assert.match(nativeShare, /cancelled/);
assert.match(nativeShare, /copyTextToClipboard/);
assert.match(nativeShare, /execCommand\("copy"\)/);
assert.match(nativeShare, /canShare/);

assert.match(shareMessages, /The Live has ended/);
assert.match(shareMessages, /You no longer have access to this Live/);
assert.match(shareMessages, /This conversation is unavailable/);
assert.match(shareMessages, /Unable to send the Live link/);
assert.doesNotMatch(shareMessages, /Failed to send"/);

assert.match(shareLive, /shareLiveToInbox/);
assert.match(shareLive, /canonicalLiveUrl\(input\.session\.id\)/);
assert.match(shareLive, /sender_id: input\.senderId/);
assert.match(shareLive, /message_type: "text"/);
assert.match(shareLive, /not_conversation_participant/);
assert.match(shareLive, /cross_community_share/);
assert.doesNotMatch(shareLive, /input\.url/);
assert.doesNotMatch(shareLive, /body\.senderId/);

assert.match(shareRoute, /shareLiveToInbox/);
assert.match(shareRoute, /canViewLiveSession/);
assert.match(shareRoute, /rateLimit\(`live-share:/);
assert.match(shareRoute, /Client-supplied sender/);
assert.match(shareRoute, /conversationId/);
assert.doesNotMatch(shareRoute, /senderId: body/);

assert.match(shareSheet, /\/api\/c\/live\/sessions\/\$\{sessionId\}\/share/);
assert.match(shareSheet, /conversationId: thread.id/);
assert.match(shareSheet, /LIVE_SHARE_CLIENT_MESSAGE/);
assert.match(shareSheet, /nativeShareLive/);
assert.match(shareSheet, /copyTextToClipboard/);
assert.match(shareSheet, /result === "cancelled"/);
assert.doesNotMatch(shareSheet, /alert\(/);

assert.match(hubLive, /LiveShareSheet/);
assert.match(hubLive, /openShareSheet/);
assert.match(hubLive, /canonicalLiveUrl/);
assert.match(hubLive, /copyTextToClipboard/);
assert.doesNotMatch(hubLive, /navigator\.share/);
assert.doesNotMatch(hubLive, /window\.location\.origin.*communities\/live/);

assert.match(helpers, /canonicalLiveUrl\(sessionId\)/);
assert.doesNotMatch(helpers, /window\.location\.origin/);

assert.match(dock, /<DockBtn onClick=\{onCopyLink\} label="Share">/);

assert.match(sessionSvc, /voteLivePoll/);
assert.match(sessionSvc, /closeLivePoll/);
assert.match(sessionSvc, /listLivePolls/);
assert.match(sessionSvc, /sweepStaleLiveSessions/);
assert.match(sessionSvc, /heartbeatLiveParticipant/);
assert.match(sessionSvc, /Unable to send message\. Please try again/);
assert.doesNotMatch(sessionSvc, /error\?\.message \?\? "Failed to send"/);
assert.match(sessionSvc, /membershipChatBlock/);
assert.match(sessionSvc, /You already voted on this poll/);
assert.match(sessionSvc, /toPublicLiveRecording/);

assert.match(sessionRoute, /"vote"/);
assert.match(sessionRoute, /"close-poll"/);
assert.match(sessionRoute, /"heartbeat"/);
assert.match(sessionRoute, /live-react:/);
assert.match(sessionRoute, /listLivePolls/);
assert.match(sessionRoute, /polls: polls/);

assert.match(chatRoute, /postLiveSessionMessage/);
assert.match(chatRoute, /canViewLiveSession/);
assert.match(chatRoute, /Join the session first/);

assert.match(messagesRoute, /Unable to send message\. Please try again/);

assert.match(engagement, /action: "vote"/);
assert.match(engagement, /action: "poll"/);
assert.match(engagement, /live_poll_votes/);
assert.doesNotMatch(engagement, /window\.prompt/);
assert.doesNotMatch(engagement, /votePoll\(/);

assert.match(useSession, /action: "heartbeat"/);
assert.match(useSession, /pagehide/);
assert.match(useSession, /keepalive: true/);

assert.match(recordingRoute, /replayUrl/);
assert.match(recordingRoute, /canViewLiveSession/);
assert.doesNotMatch(recordingRoute, /egress_id/);

assert.match(mediaPlane, /stopScreenShare\(\)/);
assert.match(mediaPlane, /addEventListener\("ended"/);

assert.match(roles, /canLaunchPoll/);
assert.match(roles, /canEndLive/);
assert.match(roles, /canMuteParticipant/);
assert.match(roles, /canChangeRoles/);

assert.ok(fs.existsSync(path.join(root, "lib/live/poll-types.ts")));

console.log("verify-live-share: ok");
