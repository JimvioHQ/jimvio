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

  it("guest PIP tiles render inside the host stage", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const pip = read("components/community/hub/live/LiveStagePip.tsx");
    assert.match(page, /LiveStagePipStack/);
    assert.match(page, /LiveStagePipTile/);
    assert.match(pip, /\(You\)/);
    assert.match(pip, /Screen sharing/);
    assert.match(page, /setStageFocus/);
    assert.match(page, /onViewFull/);
    assert.doesNotMatch(page, /LiveParticipantGallery/);
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

  it("livekit stage does not auto-promote guest screen share", () => {
    const room = read("lib/live/livekit-room.ts");
    assert.match(room, /stagePinIdentity/);
    assert.doesNotMatch(
      room,
      /remotes\.find\(\(r\) => r\.screenStream\)\?\.screenStream/
    );
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
    assert.match(page, /tab === \"analytics\" \? \"analytics\" : \"chat\"/);
    assert.match(page, /case \"analytics\":/);
    assert.match(page, /Live Analytics/);
    assert.match(more, /id: \"analytics\"/);
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
    assert.match(route, /startSessionEgress/);
    assert.match(route, /canRecord/);
    assert.match(egress, /\{\s*file:\s*fileOut\.file\s*\}/);
    assert.match(egress, /LIVEKIT_EGRESS_S3_BUCKET/);
  });
});
