import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveOpportunities, rewardFor } from "./opportunities.ts";

describe("economy opportunities", () => {
  it("never invents opportunities when there are no live campaigns", () => {
    assert.deepEqual(deriveOpportunities({ base: "/", overview: null }), []);
  });
  it("maps real campaigns without fake match scores or invitations", () => {
    const [o] = deriveOpportunities({
      base: "/",
      overview: null,
      campaigns: [
        { id: "c1", title: "Clip our launch", campaign_type: "clipping", payment_model: "per_views", rate_per_1k_views: 1.5, ends_at: "2026-12-01T00:00:00Z", allowed_platforms: ["tiktok"], vendor: { business_name: "Acme" } },
      ],
    });
    assert.equal(o.kind, "clipping_campaign");
    assert.equal(o.reward, "$1.5 per 1K views");
    assert.equal(o.matchScore, 0);
    assert.equal(o.status, "open");
    assert.equal(o.href, "/ugc/c1");
    assert.equal(o.brand, "Acme");
    assert.equal(o.deadline, "2026-12-01");
  });
  it("describes fixed-rate rewards", () => {
    assert.equal(rewardFor({ id: "x", payment_model: "fixed_per_content", fixed_rate: 50 }), "$50 per approved video");
  });
});
