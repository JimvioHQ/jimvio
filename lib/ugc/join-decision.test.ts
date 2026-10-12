import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { UGCCampaign } from "@/types/ugc";
import type { CreatorProfileSnapshot } from "./campaign-detail";
import { loginUrlForReturnPath, ugcCampaignJoinPath } from "./join-auth";
import { evaluateJoinEligibility, resolveJoinOutcome } from "./join-engine";
import { blockExistingParticipant, participantConflictFromDb } from "./join-service";
import { quoteSubmissionReward } from "./submission-reward";

const CAMPAIGN_ID = "56b0eef6-0bc7-468e-96aa-f72b2b6284e3";

function campaign(overrides: Partial<UGCCampaign> = {}): UGCCampaign {
  return {
    id: CAMPAIGN_ID,
    brand_id: "fa0f1d4c-5d29-4e4a-8956-4b0744fbac69",
    title: "Create Authentic UGC Content",
    description: null,
    campaign_type: "ugc",
    payment_model: "per_views",
    status: "active",
    rate_per_1k_views: 0.5,
    fixed_rate: 0,
    total_budget: 700,
    spent_budget: 0,
    max_payout_per_sub: 400,
    allowed_platforms: ["tiktok"],
    content_guidelines: null,
    min_duration: null,
    max_duration: null,
    required_hashtags: [],
    required_mentions: [],
    required_keywords: [],
    requires_face: false,
    submission_count: 0,
    approved_count: 0,
    total_views_tracked: 0,
    starts_at: null,
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    music_track_url: null,
    music_artist_name: null,
    promotion_target: null,
    promotion_target_url: null,
    created_at: "2026-09-08T00:00:00.000Z",
    updated_at: "2026-09-08T00:00:00.000Z",
    ...overrides,
  };
}

const eligibleProfile: CreatorProfileSnapshot = {
  hasProfile: true,
  totalFollowers: 1200,
  platforms: ["tiktok"],
  niche: [],
  accountAgeDays: 40,
  isVerified: true,
};

describe("signed-out join redirect", () => {
  it("returns the creator to the same campaign join path", () => {
    const next = ugcCampaignJoinPath(CAMPAIGN_ID);
    assert.equal(loginUrlForReturnPath(next), `/login?next=${encodeURIComponent(next)}`);
    const page = readFileSync(join(process.cwd(), "app/ugc/[id]/join/page.tsx"), "utf8");
    assert.match(page, /if \(!user\)/);
    assert.match(page, /redirect\(loginUrlForReturnPath\(ugcCampaignJoinPath\(id\)\)\)/);
  });
});

describe("join eligibility decisions", () => {
  it("accepts an eligible creator on an instant campaign without marking them paid", () => {
    const result = evaluateJoinEligibility(campaign({ join_mode: "instant" }), eligibleProfile, 0);
    assert.equal(result.blocked, false);
    const outcome = resolveJoinOutcome("instant", result.score, {});
    assert.equal(outcome.status, "accepted");
    assert.equal(outcome.applicationStatus, "approved");
    assert.equal(outcome.autoApproved, true);
    assert.notEqual(outcome.status, "paid");
  });

  it("keeps an application pending review instead of accepting or paying", () => {
    const result = evaluateJoinEligibility(campaign({ join_mode: "application" }), eligibleProfile, 0);
    assert.equal(result.blocked, false);
    const outcome = resolveJoinOutcome("application", result.score, {});
    assert.equal(outcome.status, "pending");
    assert.equal(outcome.applicationStatus, "pending");
    assert.equal(outcome.autoApproved, false);
    assert.equal(outcome.projectCreated, false);
    assert.match(outcome.message, /review/i);
    assert.doesNotMatch(outcome.message, /paid|payout date|guarantee/i);
  });

  it("rejects an ineligible creator", () => {
    const result = evaluateJoinEligibility(
      campaign({
        allowed_platforms: ["youtube"],
        join_config: {
          eligibilityRules: { minFollowers: 1_000_000, requireVerified: true },
        },
      }),
      { ...eligibleProfile, totalFollowers: 10, platforms: ["tiktok"], isVerified: false },
      0,
    );
    assert.equal(result.blocked, true);
    assert.equal(result.level, "not_eligible");
    assert.equal(result.blockReason, "Eligibility requirements not met");
  });

  it("rejects paused, cancelled, and ended campaigns", () => {
    for (const status of ["paused", "completed", "cancelled", "draft"] as const) {
      const result = evaluateJoinEligibility(campaign({ status }), eligibleProfile, 0);
      assert.equal(result.blocked, true, status);
      assert.equal(result.blockReason, "Campaign is not active");
    }
    const ended = evaluateJoinEligibility(
      campaign({ ends_at: new Date(Date.now() - 86400000).toISOString() }),
      eligibleProfile,
      0,
    );
    assert.equal(ended.blocked, true);
    assert.equal(ended.blockReason, "Campaign has ended");
    const route = readFileSync(join(process.cwd(), "app/api/ugc/campaigns/[id]/join/route.ts"), "utf8");
    assert.match(route, /campaign\.status !== "active"/);
    assert.match(route, /Campaign is not currently active/);
    assert.match(route, /Campaign has ended/);
  });

  it("rejects a full campaign", () => {
    const result = evaluateJoinEligibility(
      campaign({ max_participants: 1 }),
      eligibleProfile,
      1,
    );
    assert.equal(result.blocked, true);
    assert.equal(result.blockReason, "Campaign is full");
  });
});

describe("duplicate join prevention", () => {
  it("blocks accepted, pending, waitlisted, and invited memberships", () => {
    assert.equal(blockExistingParticipant("accepted")?.status, 409);
    assert.match(blockExistingParticipant("accepted")?.error ?? "", /already a participant/);
    assert.match(blockExistingParticipant("pending")?.error ?? "", /active application/);
    assert.match(blockExistingParticipant("waitlisted")?.error ?? "", /active application/);
    assert.match(blockExistingParticipant("invited")?.error ?? "", /active application/);
    assert.equal(blockExistingParticipant("banned")?.status, 409);
  });

  it("allows a withdrawn or rejected creator to apply again", () => {
    assert.equal(blockExistingParticipant("withdrawn"), null);
    assert.equal(blockExistingParticipant("rejected"), null);
    assert.equal(blockExistingParticipant(null), null);
  });

  it("maps a unique-constraint conflict to the same duplicate error", () => {
    const conflict = participantConflictFromDb({ code: "23505" });
    assert.equal(conflict?.status, 409);
    assert.match(conflict?.error ?? "", /already a participant/);
    assert.equal(participantConflictFromDb({ code: "23514" }), null);
  });
});

describe("accepted, pending, and paid stay distinct", () => {
  it("does not treat a reward quote as a paid payout", () => {
    const quote = quoteSubmissionReward({
      paymentModel: "per_views",
      ratePer1k: 0.5,
      fixedRate: 0,
      maxPayoutPerSub: 400,
      acceptedViews: 1000,
      remainingBudget: 700,
    });
    assert.equal(quote.ok, true);
    if (quote.ok) {
      assert.equal(quote.payableCents, 50);
      assert.equal("status" in quote, false);
    }
    const flow = readFileSync(join(process.cwd(), "components/ugc/join/CampaignJoinFlow.tsx"), "utf8");
    assert.match(flow, /json\.status === "accepted"/);
    assert.match(flow, /This is not a payout/);
    assert.match(flow, /not acceptance or payment/);
    assert.match(flow, /json\.redirectTo/);
  });
});
