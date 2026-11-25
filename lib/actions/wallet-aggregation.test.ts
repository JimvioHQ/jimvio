import assert from "node:assert/strict";
import test from "node:test";
import { aggregateWalletEarnings } from "./wallet-aggregation";

test("keeps UGC campaign payouts separate from community bonuses", () => {
  const result = aggregateWalletEarnings([
    { type: "ugc_earnings", amount: "300.00" },
    { type: "ugc_earning", amount: 500 },
    { type: "community_earning", amount: 25 },
    { type: "vendor_earning", amount: 75 },
    { type: "affiliate_commission", amount: 10 },
  ]);

  assert.deepEqual(result, {
    vendor: 75,
    affiliate: 10,
    creator: 25,
    ugc: 800,
    other: 0,
  });
});

test("ignores non-finite amounts without corrupting wallet totals", () => {
  const result = aggregateWalletEarnings([
    { type: "ugc_earnings", amount: "not-a-number" },
    { type: "community_earning", amount: null },
  ]);

  assert.equal(result.ugc, 0);
  assert.equal(result.creator, 0);
});
