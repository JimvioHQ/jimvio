import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  centsToUsd,
  cpmRewardCents,
  fixedRewardCents,
  parseAcceptedViews,
  quoteSubmissionReward,
} from "./submission-reward";

describe("ugc submission rewards", () => {
  it("calculates CPM from accepted views and rounds to cents", () => {
    assert.equal(cpmRewardCents(1500, 3), 450);
    assert.equal(centsToUsd(cpmRewardCents(333, 3)), 1);
    assert.equal(cpmRewardCents(0, 3), 0);
  });

  it("calculates a fixed per-clip reward without the CPM formula", () => {
    assert.equal(fixedRewardCents(50), 5000);
    const quote = quoteSubmissionReward({
      paymentModel: "fixed_per_content",
      ratePer1k: 9,
      fixedRate: 50,
      maxPayoutPerSub: null,
      acceptedViews: 999999,
      remainingBudget: 500,
    });
    assert.equal(quote.ok, true);
    if (quote.ok) assert.equal(quote.payableCents, 5000);
  });

  it("rejects negative, fractional, and overflowing view counts", () => {
    assert.equal(parseAcceptedViews(-1).ok, false);
    assert.equal(parseAcceptedViews(1.5).ok, false);
    assert.equal(parseAcceptedViews("nope").ok, false);
    assert.equal(parseAcceptedViews(3_000_000_000).ok, false);
    assert.deepEqual(parseAcceptedViews(0), { ok: true, views: 0 });
  });

  it("blocks CPM quotes that exceed the remaining budget when nothing remains", () => {
    const quote = quoteSubmissionReward({
      paymentModel: "per_views",
      ratePer1k: 10,
      fixedRate: 0,
      maxPayoutPerSub: null,
      acceptedViews: 5000,
      remainingBudget: 0,
    });
    assert.equal(quote.ok, false);
  });

  it("does not invent a formula for an unknown payment model", () => {
    const quote = quoteSubmissionReward({
      paymentModel: "revenue_share",
      ratePer1k: 3,
      fixedRate: 10,
      maxPayoutPerSub: null,
      acceptedViews: 1000,
      remainingBudget: 100,
    });
    assert.equal(quote.ok, false);
  });
});

describe("ugc discover heading", () => {
  it("keeps the orange tint on the heading and not the search row", () => {
    const page = readFileSync(
      join(process.cwd(), "components/ugc/workspace/UGCDiscoverPage.tsx"),
      "utf8",
    );
    assert.match(page, /ugc-discover-heading/);
    assert.doesNotMatch(page, /ugc-discover-masthead/);
    const headingAt = page.indexOf("ugc-discover-heading");
    const heroAt = page.indexOf("<UGCHeroHeader");
    assert.ok(headingAt > 0 && heroAt > headingAt);
    const between = page.slice(headingAt, heroAt);
    assert.match(between, /<\/header>/);
  });
});
