import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCampaignSchedule,
  eventsOnDate,
  getCampaignLifecycleStatus,
  lifecycleLabel,
} from "./campaign-schedule";
import type { UGCCampaign } from "../types/ugc";

function campaign(partial: Partial<UGCCampaign>): UGCCampaign {
  return {
    id: "camp-1",
    brand_id: "brand-1",
    title: "Summer Campaign",
    description: "Create running content",
    campaign_type: "ugc",
    payment_model: "fixed_per_content",
    status: "active",
    rate_per_1k_views: 0,
    fixed_rate: 150,
    total_budget: 5000,
    spent_budget: 0,
    max_payout_per_sub: 500,
    allowed_platforms: ["tiktok", "instagram"],
    content_guidelines: null,
    min_duration: 15,
    max_duration: 45,
    required_hashtags: ["#run"],
    required_mentions: ["nike"],
    required_keywords: [],
    requires_face: false,
    submission_count: 12,
    approved_count: 4,
    total_views_tracked: 0,
    starts_at: "2026-09-01T00:00:00.000Z",
    ends_at: "2026-09-18T23:59:00.000Z",
    music_track_url: null,
    music_artist_name: null,
    promotion_target: null,
    promotion_target_url: null,
    created_at: "2026-08-20T00:00:00.000Z",
    updated_at: "2026-08-20T00:00:00.000Z",
    ...partial,
  };
}

describe("UGC campaign schedule", () => {
  it("marks future starts as upcoming", () => {
    const status = getCampaignLifecycleStatus(
      campaign({ starts_at: "2099-01-01T00:00:00.000Z", ends_at: "2099-02-01T00:00:00.000Z" }),
      Date.parse("2026-09-03T00:00:00.000Z"),
    );
    assert.equal(status, "upcoming");
    assert.equal(lifecycleLabel(status), "Upcoming");
  });

  it("marks a live campaign ending within 3 days as ending soon", () => {
    const status = getCampaignLifecycleStatus(
      campaign({
        starts_at: "2026-08-01T00:00:00.000Z",
        ends_at: "2026-09-04T00:00:00.000Z",
      }),
      Date.parse("2026-09-03T00:00:00.000Z"),
    );
    assert.equal(status, "ending_soon");
  });

  it("marks completed campaigns as ended", () => {
    assert.equal(getCampaignLifecycleStatus(campaign({ status: "completed" })), "ended");
  });

  it("builds distinct milestones including custom events", () => {
    const events = buildCampaignSchedule(campaign({ live_at: "2026-09-10T18:00:00.000Z" }), [
      {
        id: "custom-1",
        kind: "custom",
        title: "Product showcase",
        description: "Film the new shoe drop",
        date: "2026-09-18T18:00:00.000Z",
      },
    ]);
    const kinds = events.map((e) => e.kind);
    assert.ok(kinds.includes("campaign_start"));
    assert.ok(kinds.includes("live_date"));
    assert.ok(kinds.includes("submission_deadline"));
    assert.ok(kinds.includes("custom"));
  });

  it("returns events for a single date key", () => {
    const events = buildCampaignSchedule(
      campaign({
        starts_at: "2026-09-01",
        ends_at: "2026-09-18",
        submission_deadline: "2026-09-18",
      }),
    );
    const onDay = eventsOnDate(events, "2026-09-18");
    assert.ok(onDay.length >= 1);
    assert.ok(onDay.some((e) => e.kind === "campaign_end" || e.kind === "submission_deadline"));
  });
});
