import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveBrandVerification,
  resolveCampaignBrandBadge,
  resolveCreatorVerification,
  resolvePersonalVerification,
  vendorVerificationStatus,
} from "./status.ts";

describe("verification status resolver", () => {
  it("does not treat email-style profile flags as identity verified", () => {
    const personal = resolvePersonalVerification({ identityVerified: false });
    assert.equal(personal.verified, false);
    assert.equal(personal.source, "none");
  });

  it("uses jip_identity for personal blue badge", () => {
    const personal = resolvePersonalVerification({ identityVerified: true });
    assert.equal(personal.verified, true);
    assert.equal(personal.source, "jip_identity");
  });

  it("maps vendor verification_status only when verified", () => {
    assert.equal(vendorVerificationStatus("verified"), "verified");
    assert.equal(vendorVerificationStatus("pending"), "pending");
    assert.equal(vendorVerificationStatus("rejected"), "rejected");
    assert.equal(resolveBrandVerification({ vendorStatus: "suspended" }).verified, false);
    assert.equal(resolveBrandVerification({ vendorStatus: "verified" }).verified, true);
  });

  it("revoked/suspended brands are not shown as verified", () => {
    assert.equal(resolveBrandVerification({ vendorStatus: "revoked" }).verified, false);
    assert.equal(resolveBrandVerification({ vendorStatus: "suspended" }).verified, false);
  });

  it("creator badge prefers influencer flag then identity", () => {
    assert.equal(
      resolveCreatorVerification({ influencerVerified: true, identityVerified: false }).source,
      "influencers",
    );
    assert.equal(
      resolveCreatorVerification({ influencerVerified: false, identityVerified: true }).source,
      "jip_identity",
    );
    assert.equal(
      resolveCreatorVerification({ influencerVerified: false, identityVerified: false }).verified,
      false,
    );
  });

  it("campaign brand badge falls back to personal KYC", () => {
    const badge = resolveCampaignBrandBadge({
      vendorStatus: "pending",
      identityVerified: true,
    });
    assert.equal(badge.verified, true);
    assert.equal(badge.source, "jip_identity");
  });
});
