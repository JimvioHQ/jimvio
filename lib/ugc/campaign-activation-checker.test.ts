import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runCampaignActivationChecker } from "./campaign-activation-checker.ts";

describe("campaign activation checker", () => {
  it("fails incomplete campaigns under the $100 minimum", () => {
    const report = runCampaignActivationChecker({
      campaign: {
        title: "Hi",
        campaign_type: "ugc",
        payment_model: "per_views",
        rate_per_1k_views: 2,
        total_budget: 50,
        allowed_platforms: ["tiktok"],
        content_format: "image",
      },
      escrow: [],
    });
    assert.equal(report.canFund, false);
    assert.equal(report.canActivate, false);
    assert.ok(report.findings.some((f) => f.id === "financial.min_funding" && f.severity === "failed"));
  });

  it("allows funding when complete and budget meets $100 but escrow is missing", () => {
    const report = runCampaignActivationChecker({
      campaign: {
        title: "PrimeFx summer clips",
        description: "Create authentic product clips following the brief and include required hashtags.",
        campaign_type: "clipping",
        payment_model: "per_views",
        rate_per_1k_views: 3,
        total_budget: 100,
        allowed_platforms: ["tiktok", "instagram"],
        content_format: "vertical_video",
        min_duration: 15,
        max_duration: 60,
      },
      escrow: [],
    });
    assert.equal(report.canFund, true);
    assert.equal(report.canActivate, false);
    assert.ok(report.findings.some((f) => f.id === "financial.escrow_missing"));
  });

  it("activates only when escrow held covers budget and no review flags", () => {
    const report = runCampaignActivationChecker({
      campaign: {
        title: "QuantForg creator sprint",
        description: "Film your setup, show the dashboard, and tag the brand. Follow all platform rules.",
        campaign_type: "ugc",
        payment_model: "fixed_per_content",
        fixed_rate: 25,
        total_budget: 250,
        allowed_platforms: ["youtube"],
        content_format: "image",
      },
      escrow: [{ status: "held", amount: 250, currency: "USD" }],
    });
    assert.equal(report.canFund, true);
    assert.equal(report.canActivate, true);
    assert.equal(report.status, "passed");
  });

  it("never treats pending escrow as funded", () => {
    const report = runCampaignActivationChecker({
      campaign: {
        title: "Ready campaign title",
        description: "Long enough description for creators with clear submission instructions included.",
        campaign_type: "ugc",
        payment_model: "per_views",
        rate_per_1k_views: 1,
        total_budget: 100,
        allowed_platforms: ["tiktok"],
        content_format: "image",
      },
      escrow: [{ status: "pending", amount: 100, currency: "USD" }],
    });
    assert.equal(report.canActivate, false);
    assert.ok(report.findings.some((f) => f.id === "financial.escrow_missing"));
  });
});
