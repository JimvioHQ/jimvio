import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { balancesAfterPendingRelease } from "./clearPendingPayouts";
import { syncedViewsMayCreateReward } from "./syncViews";

describe("synced platform views", () => {
  it("never creates a reward from platform counts or an existing settlement", () => {
    assert.equal(
      syncedViewsMayCreateReward({
        paymentModel: "per_views",
        acceptedViews: null,
        hasPayout: false,
      }),
      false,
    );
    assert.equal(
      syncedViewsMayCreateReward({
        paymentModel: "per_views",
        acceptedViews: 1000,
        hasPayout: false,
      }),
      false,
    );
    assert.equal(
      syncedViewsMayCreateReward({
        paymentModel: "fixed_per_content",
        acceptedViews: null,
        hasPayout: false,
      }),
      false,
    );
    assert.equal(
      syncedViewsMayCreateReward({
        paymentModel: "per_views",
        acceptedViews: null,
        hasPayout: true,
      }),
      false,
    );
    assert.equal(
      syncedViewsMayCreateReward({
        paymentModel: "revenue_share",
        acceptedViews: null,
        hasPayout: false,
      }),
      false,
    );
  });

  it("does not insert a payout from the view sync", () => {
    const source = readFileSync(join(process.cwd(), "lib/ugc/syncViews.ts"), "utf8");
    assert.doesNotMatch(source, /ugc_payouts/);
    assert.doesNotMatch(source, /from\(['"]payouts['"]\)\.insert/);
    assert.match(source, /syncedViewsMayCreateReward/);
  });
});

describe("pending payout release", () => {
  it("moves the exact pending amount into available balance", () => {
    assert.deepEqual(balancesAfterPendingRelease(12.5, 3, 2.25), {
      ok: true,
      pending: 10.25,
      available: 5.25,
    });
  });

  it("refuses to mint available balance when pending funds are short", () => {
    assert.deepEqual(balancesAfterPendingRelease(4, 0, 10), {
      ok: false,
      reason: "insufficient_pending",
    });
    assert.equal(balancesAfterPendingRelease(10, 0, 0).ok, false);
    assert.equal(balancesAfterPendingRelease(Number.NaN, 0, 5).ok, false);
  });

  it("claims a pending payout before moving balances", () => {
    const source = readFileSync(join(process.cwd(), "lib/ugc/clearPendingPayouts.ts"), "utf8");
    const claimAt = source.indexOf('.eq("id", payout.id)');
    const walletAt = source.indexOf('.from("wallets")');
    assert.ok(claimAt > 0 && walletAt > claimAt);
    assert.match(source, /balancesAfterPendingRelease/);
  });
});

describe("approval copy", () => {
  it("does not promise view-based earnings after approval", () => {
    const approve = readFileSync(
      join(process.cwd(), "lib/ugc/approve-submission.ts"),
      "utf8",
    );
    assert.doesNotMatch(approve, /will start earning views-based payouts/);
    assert.match(approve, /No payout was created/);
  });
});
