import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  escrowMayActivateCampaign,
  lockedMoneyFieldChange,
  mayResumeWithoutEscrow,
  stripDraftDemotion,
} from "./campaign-edit-guard";

describe("ugc campaign edit guard", () => {
  it("strips draft demotion on live campaigns", () => {
    const next = stripDraftDemotion("active", { title: "A", status: "draft" });
    assert.equal(next.status, undefined);
    assert.equal(next.title, "A");
    assert.equal(stripDraftDemotion("draft", { status: "draft" }).status, "draft");
  });

  it("activates from escrow only for draft or paused", () => {
    assert.equal(escrowMayActivateCampaign("draft"), true);
    assert.equal(escrowMayActivateCampaign("paused"), true);
    assert.equal(escrowMayActivateCampaign("cancelled"), false);
    assert.equal(escrowMayActivateCampaign("completed"), false);
    assert.equal(escrowMayActivateCampaign("active"), false);
  });

  it("allows admin-activated pause to resume without escrow", () => {
    assert.equal(mayResumeWithoutEscrow("paused", true), true);
    assert.equal(mayResumeWithoutEscrow("paused", false), false);
    assert.equal(mayResumeWithoutEscrow("draft", true), false);
  });

  it("blocks budget changes after activation", () => {
    const campaign = { total_budget: 500, payment_model: "per_views", rate_per_1k_views: 3 };
    assert.equal(lockedMoneyFieldChange("draft", campaign, { total_budget: 900 }), null);
    assert.equal(
      lockedMoneyFieldChange("active", campaign, { total_budget: 900 }),
      "total_budget",
    );
    assert.equal(
      lockedMoneyFieldChange("active", campaign, { total_budget: 500, title: "Updated" }),
      null,
    );
  });
});
