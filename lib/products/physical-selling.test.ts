import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHYSICAL_SELLER_SUPPORT_SUBJECT,
  isPhysicalSellerSupportSubject,
  physicalSellerSupportHref,
  physicalSellingCustomerCopy,
  physicalSellingStatus,
} from "./physical-selling";

describe("physical selling verification", () => {
  it("maps vendor status without treating a missing request as approved", () => {
    assert.equal(physicalSellingStatus({ verification_status: null }), "not_requested");
    assert.equal(
      physicalSellingStatus({
        verification_status: "pending",
        physical_selling_requested_at: "2026-10-15T00:00:00.000Z",
      }),
      "pending",
    );
    assert.equal(physicalSellingStatus({ verification_status: "verified" }), "approved");
    assert.equal(physicalSellingStatus({ verification_status: "rejected" }), "rejected");
    assert.equal(physicalSellingStatus({ verification_status: "suspended" }), "suspended");
  });

  it("builds a support link without a fee or secret", () => {
    const href = physicalSellerSupportHref();
    assert.match(href, /^\/help\/tickets\/new\?/);
    assert.equal(href.includes("5.65"), false);
    assert.equal(href.includes("token"), false);
    assert.equal(isPhysicalSellerSupportSubject(PHYSICAL_SELLER_SUPPORT_SUBJECT), true);
    assert.equal(physicalSellingCustomerCopy("approved").verified, true);
    assert.equal(physicalSellingCustomerCopy("pending").verified, false);
  });
});
