import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessMedia, softwareKind } from "./media-assessment.ts";
import type { MediaDetails } from "./types.ts";

const media = (over: Partial<MediaDetails> = {}): MediaDetails => ({
  kind: "media", mediaType: "image", fileName: "photo.jpg", size: 237_568, format: "JPEG image", mime: "image/jpeg", width: 1280, height: 720,
  durationSec: null, frameRate: null, videoCodec: null, audioCodec: null, bitrate: null, colorSpace: "srgb", iccProfile: null, exifPresent: false,
  make: null, model: null, lens: null, fNumber: null, exposureTime: null, iso: null, focalLength: null, capturedAt: null, gps: null, software: null,
  editingSoftware: null, c2pa: { present: false, generator: null, aiAction: false }, declaredAi: [], aiTools: [], prompt: null, copyright: null,
  artist: null, duplicate: { count: 0, near: false, firstSeenAt: null }, ...over,
});
const get = (a: ReturnType<typeof assessMedia>, id: string) => a.checks.find((k) => k.id === id)!;

describe("media assessment — production cases", () => {
  it("Case A: AI PNG with unvalidated credentials", () => {
    const a = assessMedia({ details: media({ fileName: "QuantForg Trading Intelligence Platform.png", format: "PNG image", mime: "image/png", width: 1024, height: 1536, size: 2_100_000,
      c2pa: { present: true, generator: "ChatGPT", aiAction: true, assertions: ["c2pa.actions.v2", "c2pa.hash.data"] }, declaredAi: ["IPTC says the image was made by a trained AI model"], aiTools: ["OpenAI"] }) });
    assert.equal(a.verdict, "AI_GENERATED_DECLARED");
    assert.equal(a.creation, "AI_GENERATION_INDICATED_BY_METADATA");
    assert.equal(a.provenance, "CREDENTIALS_PRESENT_UNVERIFIED");
    assert.equal(get(a, "c2pa_sig").label, "Not Validated");
    assert.equal(get(a, "ai_tool").label, "OpenAI (declared)");
    assert.equal(get(a, "camera").status, "NOT_APPLICABLE");
    assert.equal(get(a, "date").status, "NOT_FOUND");
    assert.equal(a.rights, "HUMAN_REVIEW_REQUIRED");
    assert.ok(a.score != null && a.score >= 60, "AI creation is not penalised");
    assert.ok(a.score! <= 85, "unvalidated credentials cap the score");
  });
  it("Case B: Windows camera-app JPG with unknown origin", () => {
    const a = assessMedia({ details: media({ fileName: "WIN_20261105_20_25_07_Pro.jpg", software: "Windows 10", exifPresent: true, exifFields: 4, capturedAt: "2026-11-05T20:25:07Z" }) });
    assert.equal(a.verdict, "ORIGIN_UNKNOWN");
    assert.equal(a.score, null);
    assert.equal(a.scoreState, "NOT_SCORED");
    assert.equal(get(a, "ai").label, "No AI Markers Found");
    assert.match(get(a, "ai").explanation, /does not mean the file is human-made/);
    assert.equal(get(a, "software").label, "Operating System Recorded");
    assert.match(get(a, "camera").explanation, /operating system, not a camera/);
    assert.equal(get(a, "manipulation").label, "Not Assessed");
    assert.match(get(a, "integrity").explanation, /says nothing about where/);
    assert.notEqual(a.manipulation, "NO_MANIPULATION_EVIDENCE_FOUND");
  });
  it("software classification", () => {
    assert.equal(softwareKind("Windows 10"), "os");
    assert.equal(softwareKind("Adobe Photoshop 25.0 (Windows)"), "editor");
    assert.equal(softwareKind("HDR+ 1.0.512345678zd"), "camera");
  });
  it("editing recorded is not tampering; integrity mismatch is flagged", () => {
    assert.equal(assessMedia({ details: media({ software: "Adobe Lightroom", editingSoftware: "Adobe Lightroom" }) }).verdict, "EDITED_RECORDED");
    assert.equal(assessMedia({ details: media({ integrityIssue: "The name ends in .jpg but the file is really a PNG image." }) }).verdict, "INTEGRITY_ISSUE");
  });
  it("undecodable file is a scan failure, not tampering", () => {
    assert.equal(assessMedia({ details: media({ width: null, height: null }) }).verdict, "SCAN_FAILED");
  });
});
