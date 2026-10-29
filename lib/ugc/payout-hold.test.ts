import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { payoutHold } from "./payout-hold.ts";

describe("payout hold", () => {
  it("pays verified, clean views at once", () => {
    assert.equal(payoutHold({ verificationStatus: "verified", isSuspicious: false, acceptedViews: 900, verifiedViews: 1000 }).hours, 0);
  });
  it("holds 24h for anything Jimvio could not confirm", () => {
    assert.equal(payoutHold({ verificationStatus: "owner_mismatch", isSuspicious: false, acceptedViews: 5000, verifiedViews: null }).hours, 24);
    assert.equal(payoutHold({ verificationStatus: "unsupported", isSuspicious: null, acceptedViews: 10, verifiedViews: null }).hours, 24);
    assert.equal(payoutHold({ verificationStatus: "verified", isSuspicious: true, acceptedViews: 10, verifiedViews: 100 }).hours, 24);
    assert.equal(payoutHold({ verificationStatus: "verified", isSuspicious: false, acceptedViews: 2000, verifiedViews: 1000 }).hours, 24);
  });
});
