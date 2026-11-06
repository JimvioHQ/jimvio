import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateViews, rangeLabel, INSUFFICIENT_TEXT } from "./engagement-estimate.ts";

const now = new Date("2026-11-05T12:00:00Z");
describe("view estimate", () => {
  it("never estimates without enough public evidence", () => {
    assert.equal(estimateViews({ platform: "tiktok", contentType: "video", views: null, likes: null, comments: null, publishedAt: null }).status, "INSUFFICIENT");
    assert.equal(estimateViews({ platform: "youtube", contentType: "video", views: 400, likes: 30, comments: 2, publishedAt: "2026-01-01", now }).confidence, "INSUFFICIENT");
    assert.ok(INSUFFICIENT_TEXT.startsWith("Insufficient public evidence"));
  });
  it("natural ratios → almost all genuine, never an exact claim", () => {
    const e = estimateViews({ platform: "youtube", contentType: "video", views: 100_000, likes: 4_000, comments: 300, publishedAt: "2026-06-01", now });
    assert.equal(e.status, "ESTIMATED");
    assert.ok(e.genuine![0] >= 90_000 && e.genuine![1] === 100_000);
    assert.ok(e.suspicious![0] === 0 && e.suspicious![1] <= 10_000);
    assert.notEqual(e.genuine![0], e.genuine![1], "a range, not an exact count");
  });
  it("very low like rate with corroboration → large suspicious range, medium confidence", () => {
    const e = estimateViews({ platform: "youtube", contentType: "video", views: 1_000_000, likes: 800, comments: 20, publishedAt: "2026-06-01", channelViews: 200_000, channelVideos: 40, followers: 900, commentWarnings: 1, now });
    assert.ok(e.suspiciousShare![0] > 0.5);
    assert.equal(e.confidence, "MEDIUM");
    assert.ok(e.reasons.some((r) => /possibly — not certainly/.test(r)));
  });
  it("low like rate alone stays low confidence", () => {
    const e = estimateViews({ platform: "youtube", contentType: "video", views: 200_000, likes: 500, comments: 400, publishedAt: "2026-06-01", now });
    assert.equal(e.confidence, "LOW");
  });
  it("formats ranges", () => {
    assert.equal(rangeLabel([8100, 9600]), "8.1K–9.6K");
    assert.equal(rangeLabel([0, 0]), "0");
  });
});

describe("YouTube placeholder dates", async () => {
  const { ytDate } = await import("./engagement-estimate.ts");
  it("treats the API's 1970-01-01 placeholder (and anything before YouTube existed) as unknown", () => {
    assert.equal(ytDate("1970-01-01T00:00:00Z"), null);
    assert.equal(ytDate("2004-12-31T00:00:00Z"), null);
    assert.equal(ytDate(""), null);
    assert.equal(ytDate("2005-09-19T05:00:00Z"), "2005-09-19T05:00:00Z");
  });
});

describe("rangeLabel at billion scale (report and tiles agree)", () => {
  it("uses B for billions instead of thousands of millions", () => {
    assert.equal(rangeLabel([1_650_709_823, 1_834_122_026]), "1.65B–1.83B");
    assert.equal(rangeLabel([2_000_000_000, 2_000_000_000]), "2B");
    assert.equal(rangeLabel([0, 183_412_203]), "0–183M");
  });
});
