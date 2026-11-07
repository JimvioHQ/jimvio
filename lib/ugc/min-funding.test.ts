import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIN_CAMPAIGN_FUNDING_USD,
  checkMinCampaignFunding,
  campaignFundingChargeUsd,
  fundingAmountUsd,
  meetsMinCampaignFunding,
} from "./min-funding.ts";

describe("min campaign funding ($100 USD)", () => {
  it("exports the canonical $100 minimum", () => {
    assert.equal(MIN_CAMPAIGN_FUNDING_USD, 100);
  });

  it("rejects USD amounts below $100", () => {
    assert.equal(meetsMinCampaignFunding(99.99, "USD"), false);
    assert.equal(meetsMinCampaignFunding(1, "USD"), false);
    assert.equal(meetsMinCampaignFunding(0, "USD"), false);
  });

  it("accepts USD amounts at or above $100", () => {
    assert.equal(meetsMinCampaignFunding(100, "USD"), true);
    assert.equal(meetsMinCampaignFunding(100.01, "USD"), true);
    assert.equal(meetsMinCampaignFunding(2500, "USD"), true);
  });

  it("never treats raw RWF as USD dollars", () => {
    // 14100 RWF must not be read as $14,100.
    const usd = fundingAmountUsd(14100, "RWF");
    assert.ok(usd < 100, `expected converted USD under 100, got ${usd}`);
    assert.equal(meetsMinCampaignFunding(14100, "RWF"), false);
  });

  it("accepts RWF only when USD equivalent reaches $100", () => {
    // Default rate 0.0008 rounds 124_999 RWF → $100.00, so use a clearly-below amount.
    assert.equal(meetsMinCampaignFunding(100_000, "RWF"), false);
    assert.equal(meetsMinCampaignFunding(125_000, "RWF"), true);
  });

  it("charge amount floors at $100", () => {
    assert.equal(campaignFundingChargeUsd(50, "USD"), 100);
    assert.equal(campaignFundingChargeUsd(250, "USD"), 250);
  });

  it("reports shortfall and rate metadata", () => {
    const check = checkMinCampaignFunding(50, "USD");
    assert.equal(check.ok, false);
    assert.equal(check.requiredUsd, 100);
    assert.equal(check.shortfallUsd, 50);
    assert.match(check.message, /at least/);
  });
});
