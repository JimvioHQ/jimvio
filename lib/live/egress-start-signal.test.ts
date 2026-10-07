import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractEgressFileResult } from "./egress-file-result.ts";
import { egressCompositeTemplateBaseUrl } from "./egress.ts";
import type { EgressInfo } from "livekit-server-sdk";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("egress start signal reliability", () => {
  it("custom template signals START_RECORDING without requiring published tracks", () => {
    const template = read("app/live/egress-template/page.tsx");
    assert.match(template, /console\.log\("START_RECORDING"\)/);
    assert.match(template, /avatar_only_ready|decideEgressStartSignal/);
    assert.match(template, /adaptiveStream:\s*false/);
  });

  it("startSessionEgress uses custom template and keeps starting until ACTIVE", () => {
    const egress = read("lib/live/egress.ts");
    assert.match(egress, /customBaseUrl:\s*egressCompositeTemplateBaseUrl\(\)/);
    assert.match(egress, /waitForEgressRunning/);
    assert.match(egress, /EGRESS_ACTIVE/);
    assert.match(egress, /listParticipants/);
    assert.match(egress, /status: "starting"/);
    assert.match(egress, /status: "active"/);
  });

  it("egressCompositeTemplateBaseUrl points at /live/egress-template", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.jimvio.com";
    try {
      assert.equal(
        egressCompositeTemplateBaseUrl(),
        "https://www.jimvio.com/live/egress-template"
      );
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });

  it("extractEgressFileResult does not treat relative filename as playable location", () => {
    const info = {
      fileResults: [
        {
          filename: "jimvio/live/sess/1.mp4",
          location: "",
          duration: 0,
          size: 0,
        },
      ],
    } as unknown as EgressInfo;
    const file = extractEgressFileResult(info);
    assert.equal(file.filename, "jimvio/live/sess/1.mp4");
    assert.equal(file.location, null);
  });

  it("extractEgressFileResult keeps https storage locations", () => {
    const info = {
      fileResults: [
        {
          filename: "jimvio/live/sess/1.mp4",
          location:
            "https://s3.us-east-005.backblazeb2.com/jimvio-live-recordings/jimvio/live/sess/1.mp4",
          duration: 33e9,
          size: 11846809,
        },
      ],
    } as unknown as EgressInfo;
    const file = extractEgressFileResult(info);
    assert.match(file.location ?? "", /backblazeb2\.com/);
    assert.equal(file.sizeBytes, 11846809);
  });

  it("UI distinguishes Starting vs Recording and avoids false REC", () => {
    const page = read("components/community/hub/hub-live-page.tsx");
    const panel = read("components/community/live-collab/LiveRecordingPanel.tsx");
    assert.match(page, /egressStarting/);
    assert.match(page, /Starting recording/);
    assert.match(page, /recordingStatus === "starting"/);
    assert.match(panel, /label: "Starting"/);
    assert.match(panel, /label: "Recording"/);
  });
});
