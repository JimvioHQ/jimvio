import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";
import { buildEgressFileOutput } from "./egress.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Jimvio Live completion — invite & share", () => {
  it("Invite opens Invite & Share without user-id input", () => {
    const panels = read("components/community/hub/live/panels.tsx");
    const page = read("components/community/hub/hub-live-page.tsx");
    assert.doesNotMatch(panels, /Invite by user id/);
    assert.doesNotMatch(panels, /inviteValue/);
    assert.match(panels, /Invite/);
    assert.match(panels, /Participants \(/);
    assert.match(page, /setShareOpen\(true\)/);
    assert.match(page, /LiveShareSheet/);
  });

  it("pre-live left rail is hidden", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    assert.match(page, /const showLeftRail = false/);
  });

  it("header pencil title edit is removed", () => {
    const header = read("components/community/hub/live/LiveExperienceHeader.tsx");
    assert.doesNotMatch(header, /Pencil/);
    assert.doesNotMatch(header, /Edit live title/);
  });

  it("avatar stage has no Camera off label", () => {
    const prepare = read("components/community/hub/live/LivePrepareStage.tsx");
    const fallback = read("components/community/hub/live/LiveStageFallback.tsx");
    assert.doesNotMatch(prepare, /Camera off/);
    assert.doesNotMatch(prepare, /Camera on/);
    assert.doesNotMatch(fallback, /Camera off/);
  });

  it("guest tiles sit below the stage and fullscreen uses the browser API", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const pip = read("components/community/hub/live/LiveStagePip.tsx");
    assert.match(page, /LiveStagePipStack/);
    assert.match(page, /LiveStagePipTile/);
    assert.match(pip, /\(You\)/);
    assert.match(pip, /Screen/);
    assert.match(pip, /overflow-x-auto/);
    assert.match(pip, /aria-label="Participant tiles"/);
    assert.doesNotMatch(pip, /absolute bottom-\[4\.25rem\]/);
    assert.match(page, /enterElementFullscreen/);
    assert.match(read("lib/live/stage-fullscreen.ts"), /requestFullscreen/);
    assert.match(page, /Exit Fullscreen/);
    assert.match(page, /setStageFocus/);
    assert.match(page, /onViewFull/);
    assert.doesNotMatch(page, /LiveParticipantGallery/);
  });

  it("screen share keeps full control dock and removes custom sharing overlay", () => {
    const dock = read("components/community/hub/live/ControlDock.tsx");
    const visibility = read("lib/live/control-dock-visibility.ts");
    const page = read("components/community/hub/hub-live-page.tsx");
    assert.match(dock, /showLiveDock/);
    assert.match(dock, /Stop Share/);
    assert.match(dock, /Invite/);
    assert.match(dock, /Participants/);
    assert.match(dock, /Destinations & RTMP/);
    assert.match(visibility, /dockKeepsCollabDuringShare/);
    assert.doesNotMatch(page, /Sharing your screen/);
    assert.doesNotMatch(page, /screenShareBannerHidden/);
  });

  it("anonymous public Live previews before auth gate", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const guest = read("components/community/hub/live/LiveGuestJoinCard.tsx");
    const token = read("lib/live/livekit-token.ts");
    const previewRoute = read("app/api/live/token/preview/route.ts");
    assert.match(page, /isAnonymousViewer/);
    assert.match(page, /authGateOpen/);
    assert.match(page, /continueWatching/);
    assert.match(guest, /Continue watching/);
    assert.match(token, /mintAnonymousViewerToken/);
    assert.match(token, /hidden:\s*true/);
    assert.match(previewRoute, /mintAnonymousViewerToken/);
  });

  it("speaker role does not auto-pin stage_focus", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const promoteIdx = page.indexOf('.promote(id, "speaker")');
    assert.ok(promoteIdx > 0);
    const nearby = page.slice(promoteIdx, promoteIdx + 280);
    assert.doesNotMatch(nearby, /setStageFocus/);
  });

  it("screen share stays a host-controlled stage while cameras stay in PIP", () => {
    const room = read("lib/live/livekit-room.ts");
    const page = read("components/community/hub/hub-live-page.tsx");
    const pip = read("components/community/hub/live/LiveStagePip.tsx");
    const layout = read("lib/live/stage-share-layout.ts");
    const strip = read("components/community/hub/live/LiveScreenShareStrip.tsx");
    assert.match(room, /activeScreenShareIdentity/);
    assert.match(room, /setStageFocus/);
    assert.match(room, /selectStageShareLayout/);
    assert.doesNotMatch(room, /selectLatestScreenShareIdentity/);
    assert.match(layout, /does not replace/);
    assert.match(page, /activeScreenShareIdentity/);
    assert.match(page, /LiveScreenShareStrip/);
    assert.match(page, /Show on main stage|setStageFocus/);
    assert.match(strip, /Show on main stage/);
    assert.match(strip, /On main stage/);
    assert.match(pip, /stream && camOn/);
    assert.doesNotMatch(pip, /camOn \|\| sharing/);
  });

  it("participant leave uses LiveKit presence and leave-before-disconnect", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const presence = read("lib/live/livekit-presence.ts");
    assert.match(presence, /composeLivePresenceIds/);
    assert.match(presence, /countLivePresence/);
    assert.match(page, /composeLivePresenceIds/);
    assert.match(page, /countLivePresence/);
    assert.match(page, /await live\.leave\(\)/);
    // Leave API before LiveKit disconnect — not disconnect-then-leave.
    const leaveIdx = page.indexOf("await live.leave()");
    const discIdx = page.indexOf("await livekit.disconnect()");
    assert.ok(leaveIdx > 0 && discIdx > leaveIdx);
  });

  it("livekit stage keeps the host screen until the host promotes another share", () => {
    const room = read("lib/live/livekit-room.ts");
    const layout = read("lib/live/stage-share-layout.ts");
    const selection = read("lib/live/stage-selection.ts");
    assert.match(room, /selectStageShareLayout/);
    assert.match(room, /localSharing/);
    assert.match(layout, /resolveStageSource/);
    assert.match(selection, /canControlRoomStage/);
    assert.match(layout, /activeScreenShareIdentity/);
  });

  it("screen share capability uses getDisplayMedia without UA blacklist", () => {
    const cap = read("lib/live/screen-share-capability.ts");
    assert.match(cap, /getDisplayMedia/);
    assert.doesNotMatch(cap, /Update your browser/);
    assert.doesNotMatch(cap, /if\s*\(.*iPhone/);
    assert.doesNotMatch(cap, /if\s*\(.*Android/);
    assert.doesNotMatch(cap, /userAgent.*Safari/);
    assert.match(cap, /does not provide screen capture/);
  });

  it("sticky Not found banner is suppressed while session is live", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    assert.match(page, /showSessionBanner/);
    assert.match(page, /!hasSession/);
    assert.match(page, /showReconnectChip/);
    assert.match(page, /Reconnecting…/);
  });

  it("Live Analytics opens as a right workspace (not forced to chat)", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const more = read("components/community/hub/live/LiveMorePanel.tsx");
    assert.match(page, /tab === \"analytics\"/);
    assert.match(page, /case \"analytics\":/);
    assert.match(page, /openRight\(\"analytics\"\)/);
    assert.match(page, /Live Analytics/);
    assert.match(more, /id: \"analytics\"/);
  });

  it("Saved Recordings opens from More near Record", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const more = read("components/community/hub/live/LiveMorePanel.tsx");
    const panel = read("components/community/live-collab/LiveRecordingPanel.tsx");
    assert.match(more, /id: \"recordings\"/);
    assert.match(more, /Saved Recordings/);
    assert.match(page, /case \"recordings\":/);
    assert.match(page, /openRight\(\"recording\"\)/);
    assert.match(panel, /Saved Recordings/);
    assert.match(panel, /No saved recordings yet/);
    assert.match(panel, /Processing recording/);
  });

  it("guest Join Live is Google-first without email continuation", () => {
    const guest = read("components/community/hub/live/LiveGuestJoinCard.tsx");
    assert.match(guest, /Continue with Google/);
    assert.match(guest, /Log in to your account/);
    assert.match(guest, /\/login\?next=/);
    assert.doesNotMatch(guest, /Continue with Email/);
    assert.doesNotMatch(guest, /signInWithMagicLink/);
  });

  it("People panel shows \(You\) from authenticated user id", () => {
    const panels = read("components/community/hub/live/panels.tsx");
    assert.match(panels, /currentUserId/);
    assert.match(panels, /\(You\)/);
  });

  it("destinations use real Jimvio mark and brand icons", () => {
    const dest = read("components/community/hub/live/LiveDestinationsPanel.tsx");
    assert.doesNotMatch(dest, />JV</);
    assert.match(dest, /jimvio-logo-mark\.png/);
    assert.match(dest, /UGCPlatformIcon/);
  });

  it("reactions picker and raise-hand lower path exist", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const bar = read("components/community/live-collab/LiveReactionsBar.tsx");
    assert.match(page, /reactionPickerOpen/);
    assert.match(page, /setReactionPickerOpen\(true\)/);
    assert.match(page, /lowerHand/);
    assert.match(bar, /🎉/);
    assert.match(bar, /Lower hand/);
  });

  it("participant permissions expose Allowed / Not allowed", () => {
    const panels = read("components/community/hub/live/panels.tsx");
    assert.match(panels, /Not allowed/);
    assert.match(panels, /Participant permissions/);
    assert.match(panels, /Profile details/);
    assert.match(panels, /Live details/);
  });

  it("analytics panel prefers live session metrics", () => {
    const panels = read("components/community/hub/live/panels.tsx");
    assert.match(panels, /LiveAnalyticsSnapshot/);
    assert.match(panels, /Current viewers/);
    assert.doesNotMatch(panels, /1,245/);
  });

  it("drawer restore version allows panel restore", () => {
    const types = read("components/community/hub/live/studio-types.ts");
    const utils = read("components/community/hub/live/studio-utils.ts");
    assert.match(types, /DRAWER_STATE_VERSION = 7/);
    assert.match(utils, /Boolean\(parsed\.rightOpen\)/);
  });

  it("no router.refresh or location.reload workarounds in Live page", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    assert.doesNotMatch(page, /router\.refresh\(/);
    assert.doesNotMatch(page, /location\.reload\(/);
  });
});

describe("Jimvio Live completion — recording egress output", () => {
  it("rejects filepath-only EncodedFileOutput (LiveKit Cloud requires storage output)", () => {
    const bare = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: "jimvio/live/x.mp4",
    });
    assert.equal(bare.output?.case, undefined);
  });

  it("buildEgressFileOutput requires S3 and returns EncodedFileOutput with s3 case", () => {
    const prev = {
      bucket: process.env.LIVEKIT_EGRESS_S3_BUCKET,
      key: process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY,
      secret: process.env.LIVEKIT_EGRESS_S3_SECRET,
    };
    delete process.env.LIVEKIT_EGRESS_S3_BUCKET;
    delete process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY;
    delete process.env.LIVEKIT_EGRESS_S3_SECRET;
    const missing = buildEgressFileOutput("sess-1");
    assert.equal(missing.ok, false);

    process.env.LIVEKIT_EGRESS_S3_BUCKET = "test-bucket";
    process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY = "ak";
    process.env.LIVEKIT_EGRESS_S3_SECRET = "sk";
    process.env.LIVEKIT_EGRESS_S3_REGION = "us-east-1";
    const ok = buildEgressFileOutput("sess-1");
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.file.output.case, "s3");
      assert.ok(ok.file.output.value instanceof S3Upload);
      const json = JSON.stringify(ok.file);
      assert.match(json, /"s3"/);
      assert.match(json, /test-bucket/);
    }

    if (prev.bucket === undefined) delete process.env.LIVEKIT_EGRESS_S3_BUCKET;
    else process.env.LIVEKIT_EGRESS_S3_BUCKET = prev.bucket;
    if (prev.key === undefined) delete process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY;
    else process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY = prev.key;
    if (prev.secret === undefined) delete process.env.LIVEKIT_EGRESS_S3_SECRET;
    else process.env.LIVEKIT_EGRESS_S3_SECRET = prev.secret;
  });

  it("recording route uses room-composite egress with permission enforcement", () => {
    const route = read("app/api/live/sessions/[id]/recording/route.ts");
    const egress = read("lib/live/egress.ts");
    const fileResult = read("lib/live/egress-file-result.ts");
    const template = read("app/live/egress-template/page.tsx");
    assert.match(route, /startSessionEgress/);
    assert.match(route, /canRecord/);
    assert.match(route, /reconcileSessionRecordings/);
    assert.match(route, /recordingStatus === "starting"|hasStarting/);
    assert.match(egress, /\{\s*file:\s*fileOut\.file\s*\}/);
    assert.match(egress, /LIVEKIT_EGRESS_S3_BUCKET/);
    assert.match(egress, /reconcileSessionRecordings/);
    assert.match(egress, /EgressStatus/);
    assert.match(egress, /extractEgressFileResult/);
    assert.match(egress, /customBaseUrl/);
    assert.match(egress, /egressCompositeTemplateBaseUrl/);
    assert.match(egress, /waitForEgressRunning|EGRESS_ACTIVE/);
    assert.match(egress, /status: "starting"/);
    assert.match(fileResult, /result\.file/);
    assert.match(fileResult, /fileResults/);
    assert.match(template, /START_RECORDING/);
    assert.match(template, /AvatarTile|avatar-only/);
  });
});
