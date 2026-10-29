import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { instagramShortcode, tiktokVideoId, videoRefFromUrl, youtubeVideoId } from "./video-ref.ts";
import { acceptedViewsCap, assessViews } from "./signals.ts";

describe("video ids from post links", () => {
  it("reads every YouTube link shape", () => {
    assert.equal(youtubeVideoId("https://youtube.com/watch?v=NE-62S4OYCg"), "NE-62S4OYCg");
    assert.equal(youtubeVideoId("https://www.youtube.com/shorts/NE-62S4OYCg?feature=share"), "NE-62S4OYCg");
    assert.equal(youtubeVideoId("youtu.be/NE-62S4OYCg"), "NE-62S4OYCg");
    assert.equal(youtubeVideoId("https://m.youtube.com/live/NE-62S4OYCg"), "NE-62S4OYCg");
    assert.equal(youtubeVideoId("https://youtube.com/@channel"), null);
    assert.equal(youtubeVideoId("https://evil.com/watch?v=NE-62S4OYCg"), null);
  });
  it("reads TikTok video ids and refuses short links", () => {
    assert.equal(tiktokVideoId("https://www.tiktok.com/@jimvio/video/7312345678901234567?lang=en"), "7312345678901234567");
    assert.equal(tiktokVideoId("https://vm.tiktok.com/ZMabc123/"), null);
  });
  it("reads Instagram reel codes", () => {
    assert.equal(instagramShortcode("https://instagram.com/reel/DdjxwSaDESy/?stkn=x"), "DdjxwSaDESy");
    assert.equal(videoRefFromUrl("instagram", "https://www.instagram.com/p/Cabc12345/")?.videoId, "Cabc12345");
    assert.equal(videoRefFromUrl("facebook", "https://facebook.com/x"), null);
  });
});

const at = (h: number) => new Date(Date.UTC(2026, 9, 29, h)).toISOString();

describe("payable views", () => {
  it("pays only growth after the baseline", () => {
    const r = assessViews({
      baselineViews: 1200,
      snapshots: [
        { views: 1200, likes: 90, comments: 10, shares: null, at: at(0) },
        { views: 4200, likes: 300, comments: 40, shares: null, at: at(6) },
      ],
    });
    assert.equal(r.gainedViews, 3000);
    assert.equal(r.payableViews, 3000);
    assert.deepEqual(r.flags, []);
  });
  it("never pays negative growth", () => {
    const r = assessViews({ baselineViews: 500, snapshots: [{ views: 400, likes: 5, comments: 1, shares: null, at: at(1) }] });
    assert.equal(r.gainedViews, 0);
  });
  it("holds a recycled video", () => {
    const r = assessViews({
      baselineViews: 0,
      snapshots: [{ views: 900, likes: 80, comments: 9, shares: null, at: at(1) }],
      duplicateElsewhere: true,
    });
    assert.equal(r.suspicious, true);
    assert.equal(r.payableViews, 0);
  });
  it("flags bought views: no engagement plus a spike", () => {
    const snaps = [0, 100, 200, 300, 400].map((v, i) => ({ views: v, likes: 10, comments: 1, shares: null, at: at(i * 6) }));
    snaps.push({ views: 90_400, likes: 12, comments: 1, shares: null, at: at(30) });
    const r = assessViews({ baselineViews: 0, snapshots: snaps });
    assert.ok(r.flags.includes("view_spike"));
    assert.ok(r.flags.includes("low_engagement"));
    assert.equal(r.payableViews, 0);
    assert.equal(r.gainedViews, 90_400);
  });
  it("flags views the platform removed", () => {
    const r = assessViews({
      baselineViews: 0,
      snapshots: [
        { views: 10_000, likes: 500, comments: 50, shares: null, at: at(1) },
        { views: 6_000, likes: 480, comments: 50, shares: null, at: at(7) },
      ],
    });
    assert.ok(r.flags.includes("views_removed"));
  });
  it("caps accepted views at platform growth only when verified", () => {
    assert.equal(acceptedViewsCap({ verification_status: "verified", baseline_views: 100, latest_views: 2100 }), 2000);
    assert.equal(acceptedViewsCap({ verification_status: "unsupported", baseline_views: null, latest_views: null }), null);
  });
});

import { summarizeCampaignPerformance, verdictFor } from "./campaign-performance.ts";

describe("campaign checker summary", () => {
  it("separates real, held and unverified posts", () => {
    const subs = [
      { id: "a", status: "pending", platform: "youtube", verification_status: "verified", verification_flags: [], baseline_views: 100, latest_views: 5100 },
      { id: "b", status: "pending", platform: "tiktok", verification_status: "verified", verification_flags: ["view_spike"], baseline_views: 0, latest_views: 90000 },
      { id: "c", status: "pending", platform: "instagram", verification_status: "unsupported" },
      { id: "d", status: "rejected", platform: "youtube", verification_status: "verified", verification_flags: [], baseline_views: 0, latest_views: 999999 },
    ];
    const r = summarizeCampaignPerformance(subs, { paymentModel: "per_views", ratePer1k: 2, heldUsd: 100 });
    assert.equal(r.total, 3);
    assert.equal(r.realViews, 5000);
    assert.equal(r.heldViews, 90000);
    assert.equal(r.estimatedCostUsd, 10);
    assert.equal(r.counts.manual, 1);
    assert.match(r.summary, /on hold/);
    assert.equal(verdictFor({ id: "x", status: "pending", platform: "youtube" }), "checking");
  });
});

import { evaluateCreatorProfileCompletion } from "../../identity/creator-profile-completion.ts";

describe("creator profile completion", () => {
  it("lists every missing creator field with a hint", () => {
    const r = evaluateCreatorProfileCompletion({ fullName: "Ana", headline: "Music creator", bio: "Hi" });
    assert.equal(r.complete, false);
    assert.deepEqual(r.missing.map((m) => m.id), ["username", "categories", "country", "social"]);
    assert.ok(r.missing.every((m) => m.hint));
    const ok = evaluateCreatorProfileCompletion({
      fullName: "Ana", username: "ana", categories: ["Music"], headline: "x", bio: "y", country: "RW", socialCount: 1,
    });
    assert.equal(ok.complete, true);
  });
});

import { newVerifyCode, pageContainsCode, publicProfileUrl } from "../../identity/social-verification.ts";
import { CREATOR_CATEGORIES, cleanCategories } from "../../identity/creator-categories.ts";

describe("social verification", () => {
  it("makes readable one-time codes", () => {
    assert.match(newVerifyCode(), /^JIMVIO-[A-HJ-NP-Z2-9]{6}$/);
  });
  it("finds the code in escaped or spaced bios", () => {
    assert.equal(pageContainsCode('"biography":"Dancer JIMVIO\\u002DAB12CD"', "JIMVIO-AB12CD"), true);
    assert.equal(pageContainsCode("bio: jimvio ab12cd", "JIMVIO-AB12CD"), true);
    assert.equal(pageContainsCode("bio: hello", "JIMVIO-AB12CD"), false);
  });
  it("builds the public page from a handle", () => {
    assert.equal(publicProfileUrl("instagram", "@ana.k", null), "https://www.instagram.com/ana.k/");
    assert.equal(publicProfileUrl("tiktok", "ana", null), "https://www.tiktok.com/@ana");
  });
  it("has 500+ categories and keeps one", () => {
    assert.ok(CREATOR_CATEGORIES.length >= 500);
    assert.deepEqual(cleanCategories(["Music", "Tech"]), ["Music"]);
  });
});

import { autoReviewDecision } from "../checker/auto-review-rule.ts";
import { assessPost } from "../checker/post-signals.ts";

describe("jimvio checker", () => {
  it("calls healthy engagement real and bought views suspicious", () => {
    assert.equal(assessPost({ views: 20000, likes: 1200, comments: 90 }).verdict, "real");
    assert.equal(assessPost({ views: 200000, likes: 150, comments: 2 }).verdict, "suspicious");
    assert.equal(assessPost({ views: 120, likes: 10, comments: 1 }).verdict, "too_early");
  });
  it("auto-approves only clean, settled, verified posts", () => {
    const base = {
      reviewMode: "auto",
      submissionStatus: "pending",
      paymentModel: "per_views",
      verificationStatus: "verified",
      flags: [],
      baselineViews: 100,
      latestViews: 5100,
      submittedAt: "2026-10-20T00:00:00Z",
      now: new Date("2026-10-29T00:00:00Z"),
    };
    assert.deepEqual(autoReviewDecision(base), { approve: true, acceptedViews: 5000 });
    assert.equal(autoReviewDecision({ ...base, reviewMode: "manual" }).approve, false);
    assert.equal(autoReviewDecision({ ...base, flags: ["view_spike"] }).approve, false);
    assert.equal(autoReviewDecision({ ...base, submittedAt: "2026-10-28T12:00:00Z" }).approve, false);
    assert.equal(autoReviewDecision({ ...base, aiGeneratedLikelihood: 85 }).approve, false);
  });
});
