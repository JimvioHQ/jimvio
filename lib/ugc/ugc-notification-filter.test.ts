import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isUgcCampaignNotification } from "./ugc-notification-filter";

describe("isUgcCampaignNotification", () => {
  it("keeps UGC campaign events", () => {
    assert.equal(
      isUgcCampaignNotification({
        title: "Creator applied to campaign",
        message: "A creator applied to Important of watermelon",
        actionUrl: "/ugc/campaign-center/abc/participants",
      }),
      true,
    );
  });

  it("keeps campaign_update category", () => {
    assert.equal(
      isUgcCampaignNotification({
        category: "campaign_update",
        title: "Campaign funded",
      }),
      true,
    );
  });

  it("drops marketplace and community noise", () => {
    assert.equal(
      isUgcCampaignNotification({
        title: "Order received",
        message: "A marketplace order was placed",
      }),
      false,
    );
    assert.equal(
      isUgcCampaignNotification({
        title: "New member",
        message: "Community activity in your space",
      }),
      false,
    );
  });
});
