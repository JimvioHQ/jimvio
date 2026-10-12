import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCampaignPrimaryAction } from "./campaign-action";
import {
  budgetRemaining,
  contentFormatNeedsDuration,
  countryPolicyFromJoinConfig,
  creatorCountryDecision,
  displayPlatforms,
  isSafeHttpUrl,
  listIsoCountries,
  mergeJoinConfigBrief,
  readCampaignBrief,
  sanitizeCampaignMedia,
} from "./campaign-brief";
import { validateCampaignStep } from "./campaign-wizard-validation";

describe("campaign country policy", () => {
  it("treats campaigns with no country configuration as open to every country", () => {
    const policy = countryPolicyFromJoinConfig({});
    assert.equal(policy.mode, "all");
    assert.equal(creatorCountryDecision(policy, null), "allowed");
    assert.equal(creatorCountryDecision(policy, "Kenya"), "allowed");
  });

  it("enforces ISO selections and does not treat an unknown country as eligible", () => {
    const policy = countryPolicyFromJoinConfig({
      brief: { allCountries: false, countryCodes: ["RW", "Kenya"] },
    });
    assert.deepEqual(policy.codes.sort(), ["KE", "RW"]);
    assert.equal(creatorCountryDecision(policy, "Rwanda"), "allowed");
    assert.equal(creatorCountryDecision(policy, "UG"), "blocked");
    assert.equal(creatorCountryDecision(policy, null), "unknown");
    assert.equal(creatorCountryDecision(policy, "somewhere"), "unknown");
  });

  it("lists real ISO countries from the runtime region catalog", () => {
    const rows = listIsoCountries();
    const kenya = rows.find((row) => row.code === "KE");
    assert.equal(kenya?.name.includes("Kenya"), true);
    assert.equal(rows.some((row) => !/^[A-Z]{2}$/.test(row.code)), false);
  });

  it("keeps an explicit all-countries choice distinct from a saved list", () => {
    const saved = mergeJoinConfigBrief(
      { eligibilityRules: { minFollowers: 10 } },
      { allCountries: true, countryCodes: ["RW"], contentFormat: "image" },
    );
    assert.equal(countryPolicyFromJoinConfig(saved).mode, "all");
    assert.equal((saved.eligibilityRules as { minFollowers: number }).minFollowers, 10);
    const brief = readCampaignBrief({ join_config: saved, media: [] });
    assert.equal(brief.contentFormat, "image");
  });
});

describe("content requirements by type", () => {
  it("does not require video duration for an image campaign", () => {
    const image = validateCampaignStep("requirements", {
      content_format: "image",
      min_duration: null,
      max_duration: null,
    });
    assert.equal(image.success, true);
    const video = validateCampaignStep("requirements", {
      content_format: "vertical_video",
      min_duration: null,
      max_duration: null,
    });
    assert.equal(video.success, false);
    assert.equal(contentFormatNeedsDuration("image"), false);
    assert.equal(contentFormatNeedsDuration(null), true);
  });
});

describe("campaign resources and actions", () => {
  it("drops unsafe urls and duplicate media without inventing files", () => {
    assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
    const media = sanitizeCampaignMedia([
      { url: "https://cdn.example.com/a.png", usage: "banner", type: "image" },
      { url: "https://cdn.example.com/a.png", usage: "banner", type: "image" },
      { url: "javascript:alert(1)", usage: "example", type: "image" },
    ]);
    assert.equal(media.length, 1);
    const brief = readCampaignBrief({
      join_config: {},
      media: [{ id: "1", campaign_id: "c", type: "image", url: "https://cdn.example.com/ref.jpg", thumbnail_url: null, usage: "example", platform_format: null, order_index: 0, created_at: "" }],
    });
    assert.equal(brief.references.length, 1);
    assert.equal(brief.resources.length, 0);
    assert.equal(brief.assets.length, 0);
  });

  it("hides X and keeps Facebook only when it was saved", () => {
    assert.deepEqual(displayPlatforms(["tiktok", "x", "facebook", "twitter"]), ["tiktok", "facebook"]);
  });

  it("chooses the action from participation and submission state", () => {
    const base = {
      campaignId: "56b0eef6-0bc7-468e-96aa-f72b2b6284e3",
      status: "active",
      joinMode: "instant",
      participantStatus: null,
      submissionStatus: null,
      endsAt: null,
      countryDecision: "unchecked" as const,
    };
    assert.equal(resolveCampaignPrimaryAction(base).label, "Join campaign");
    assert.equal(
      resolveCampaignPrimaryAction({ ...base, joinMode: "application" }).label,
      "Apply now",
    );
    assert.equal(
      resolveCampaignPrimaryAction({ ...base, participantStatus: "pending" }).label,
      "View application",
    );
    assert.equal(
      resolveCampaignPrimaryAction({ ...base, participantStatus: "accepted" }).href,
      `/ugc/${base.campaignId}/submit`,
    );
    assert.equal(
      resolveCampaignPrimaryAction({
        ...base,
        participantStatus: "accepted",
        submissionStatus: "revision_requested",
      }).label,
      "Continue Creating",
    );
    assert.equal(resolveCampaignPrimaryAction({ ...base, status: "paused" }).enabled, false);
    assert.equal(
      resolveCampaignPrimaryAction({
        ...base,
        endsAt: "2000-01-01T00:00:00.000Z",
      }).label,
      "Campaign closed",
    );
    assert.equal(
      resolveCampaignPrimaryAction({
        ...base,
        endsAt: "2099-01-01T00:00:00.000Z",
      }).label,
      "Join campaign",
    );
    assert.equal(
      resolveCampaignPrimaryAction({ ...base, countryDecision: "blocked" }).enabled,
      false,
    );
  });

  it("does not invent a remaining budget when the figures are not reliable", () => {
    assert.equal(budgetRemaining({ total_budget: 500, spent_budget: 125 }).remaining, 375);
    assert.equal(budgetRemaining({ total_budget: 0, spent_budget: 0 }).known, false);
    assert.equal(budgetRemaining({ total_budget: Number.NaN, spent_budget: 0 }).known, false);
  });
});
