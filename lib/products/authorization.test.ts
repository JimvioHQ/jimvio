import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCanCreateProductType,
  businessVerificationCustomerStatus,
  canAppearOnMarketplace,
  initialStatusForVendorSubmit,
  isBusinessVerified,
  toProductTypeBucket,
} from "./authorization";

describe("product upload authorization", () => {
  const vendorPending = {
    id: "v1",
    user_id: "u1",
    is_active: true,
    verification_status: "pending",
  };
  const vendorVerified = {
    ...vendorPending,
    verification_status: "verified",
  };
  const vendorApprovedAlias = {
    ...vendorPending,
    verification_status: "approved",
  };

  it("allows digital for any active seller", () => {
    const r = assertCanCreateProductType("u1", vendorPending, "digital");
    assert.equal(r.ok, true);
  });

  it("blocks physical without business verification", () => {
    const r = assertCanCreateProductType("u1", vendorPending, "physical");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "business_verification_required");
  });

  it("allows physical when business verified", () => {
    const r = assertCanCreateProductType("u1", vendorVerified, "physical");
    assert.equal(r.ok, true);
  });

  it("allows physical when status is approved alias", () => {
    const r = assertCanCreateProductType("u1", vendorApprovedAlias, "physical");
    assert.equal(r.ok, true);
  });

  it("does not treat personal identity as business verified", () => {
    assert.equal(isBusinessVerified({ verification_status: "pending" }), false);
    assert.equal(isBusinessVerified({ verification_status: "in_review" }), false);
    assert.equal(isBusinessVerified({ verification_status: "rejected" }), false);
    assert.equal(isBusinessVerified({ verification_status: null }), false);
    assert.equal(isBusinessVerified({ verification_status: "verified" }), true);
  });

  it("maps customer-facing business status labels", () => {
    assert.equal(businessVerificationCustomerStatus("verified").label, "Business verified");
    assert.equal(businessVerificationCustomerStatus("pending").key, "in_progress");
    assert.equal(businessVerificationCustomerStatus(null).key, "not_started");
    assert.equal(businessVerificationCustomerStatus("rejected").verified, false);
  });

  it("submits into pending_review not active", () => {
    assert.equal(initialStatusForVendorSubmit("submit"), "pending_review");
    assert.equal(initialStatusForVendorSubmit("draft"), "draft");
    assert.equal(canAppearOnMarketplace("pending_review", true), false);
    assert.equal(canAppearOnMarketplace("active", true), true);
  });

  it("maps subtypes to digital bucket", () => {
    assert.equal(toProductTypeBucket("course"), "digital");
    assert.equal(toProductTypeBucket("physical"), "physical");
  });
});
