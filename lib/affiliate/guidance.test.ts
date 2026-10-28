import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MIN_WITHDRAWAL_AMOUNT } from "./payout-minimum";
import {
  affiliateLinkStatus,
  affiliateNextAction,
  affiliatePayoutExplanation,
  affiliatePerformanceNote,
} from "./guidance";

describe("affiliate guidance client boundary", () => {
  it("does not import the server attribution module", () => {
    const source = readFileSync(new URL("./guidance.ts", import.meta.url), "utf8");
    assert.match(source, /payout-minimum/);
    assert.doesNotMatch(source, /affiliate\/attribution|next\/headers/);
  });
});

describe("affiliate next action", () => {
  it("sends a new affiliate to product discovery", () => {
    const action = affiliateNextAction({
      linkCount: 0,
      clicks: 0,
      conversions: 0,
      pending: 0,
      available: 0,
    });
    assert.equal(action?.id, "discover");
    assert.equal(action?.href, "/affiliates");
  });

  it("explains sharing when links have no recorded clicks", () => {
    const action = affiliateNextAction({
      linkCount: 2,
      clicks: 0,
      conversions: 0,
      pending: 0,
      available: 0,
    });
    assert.equal(action?.id, "share");
    assert.match(action?.body ?? "", /does not add a click/);
    assert.doesNotMatch(action?.body ?? "", /guaranteed/i);
  });

  it("does not invent a strategy when clicks have no conversions", () => {
    const action = affiliateNextAction({
      linkCount: 1,
      clicks: 8,
      conversions: 0,
      pending: 0,
      available: 0,
    });
    assert.equal(action?.id, "fit");
    assert.match(action?.body ?? "", /not a forecast/);
    assert.equal(action?.href, "/affiliates/analytics");
  });

  it("explains pending balance and the real withdrawal minimum", () => {
    const action = affiliateNextAction({
      linkCount: 1,
      clicks: 4,
      conversions: 1,
      pending: 12,
      available: 3,
    });
    assert.equal(action?.id, "pending");
    assert.match(action?.body ?? "", /\$12\.00/);
    assert.match(action?.body ?? "", new RegExp(`\\$${MIN_WITHDRAWAL_AMOUNT.toFixed(2)}`));
    assert.match(action?.body ?? "", /not available balance/);
  });

  it("points to wallet withdrawals only when available balance meets the minimum", () => {
    const action = affiliateNextAction({
      linkCount: 1,
      clicks: 4,
      conversions: 1,
      pending: 2,
      available: MIN_WITHDRAWAL_AMOUNT,
    });
    assert.equal(action?.id, "withdraw");
    assert.equal(action?.href, "/wallet/withdrawals");
  });

  it("stays quiet when the loaded activity has no single gap", () => {
    assert.equal(
      affiliateNextAction({
        linkCount: 1,
        clicks: 4,
        conversions: 1,
        pending: 0,
        available: 1,
      }),
      null,
    );
  });
});

describe("affiliate performance note", () => {
  it("says when the period has no data", () => {
    assert.match(affiliatePerformanceNote([{ clicks: 0, conversions: 0 }], 30), /no trend/i);
  });

  it("does not recommend a strategy from clicks alone", () => {
    assert.match(
      affiliatePerformanceNote([{ clicks: 5, conversions: 0 }], 30),
      /not enough conversion data/,
    );
  });

  it("compares the last two weeks only from the series", () => {
    const series = [
      ...Array.from({ length: 7 }, () => ({ clicks: 2, conversions: 1 })),
      ...Array.from({ length: 7 }, () => ({ clicks: 5, conversions: 2 })),
    ];
    const note = affiliatePerformanceNote(series, 30);
    assert.match(note, /21 more clicks/);
    assert.match(note, /14 versus 35|35 versus 14/);
    assert.match(note, /Conversions in the last 7 days: 14/);
  });
});

describe("affiliate payout explanation", () => {
  it("keeps pending, available, and paid separate", () => {
    const text = affiliatePayoutExplanation({
      pending: 4,
      available: 1,
      paid: 9,
      minWithdrawal: 10,
    });
    assert.match(text, /Pending commission \(\$4\.00\)/);
    assert.match(text, /\$1\.00/);
    assert.match(text, /\$9\.00/);
    assert.match(text, /\$10\.00/);
    assert.match(text, /not available to withdraw/);
  });
});

describe("affiliate link status", () => {
  const now = Date.parse("2026-10-28T12:00:00.000Z");

  it("calls an active product link active", () => {
    assert.equal(affiliateLinkStatus({ isActive: true, expiresAt: null, now }).label, "Active");
  });

  it("calls a past expiry expired even if the row is still marked active", () => {
    const status = affiliateLinkStatus({
      isActive: true,
      expiresAt: "2026-10-01T00:00:00.000Z",
      now,
    });
    assert.equal(status.label, "Expired");
    assert.match(status.detail ?? "", /no longer records clicks/);
  });

  it("calls a deactivated link without an expiry inactive", () => {
    assert.equal(
      affiliateLinkStatus({ isActive: false, expiresAt: null, now }).label,
      "Inactive",
    );
  });
});
