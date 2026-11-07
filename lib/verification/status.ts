/**
 * Central verification status resolver for UI badges.
 * Maps existing Jimvio stores — does not invent new account types.
 *
 * Sources (priority for display):
 * - Personal: jip_identity.identity_verified (Didit KYC)
 * - Business/brand/seller: vendors.verification_status === "verified"
 * - Creator program: influencers.is_verified
 * - profiles.is_verified is intentionally NOT used alone (overloaded with email)
 */

export type VerificationCategory =
  | "personal"
  | "creator"
  | "brand"
  | "business"
  | "merchant"
  | "community_owner";

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "under_review"
  | "verified"
  | "rejected"
  | "suspended"
  | "revoked";

export type VerificationSnapshot = {
  category: VerificationCategory;
  status: VerificationStatus;
  verified: boolean;
  label: string;
  source: "jip_identity" | "vendors" | "influencers" | "none";
};

export function vendorVerificationStatus(
  status: string | null | undefined,
): VerificationStatus {
  switch (String(status ?? "").toLowerCase()) {
    case "verified":
      return "verified";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    case "suspended":
      return "suspended";
    default:
      return "unverified";
  }
}

export function resolvePersonalVerification(input: {
  identityVerified?: boolean | null;
}): VerificationSnapshot {
  const verified = Boolean(input.identityVerified);
  return {
    category: "personal",
    status: verified ? "verified" : "unverified",
    verified,
    label: verified ? "Identity verified" : "Not verified",
    source: verified ? "jip_identity" : "none",
  };
}

export function resolveBrandVerification(input: {
  vendorStatus?: string | null;
}): VerificationSnapshot {
  const status = vendorVerificationStatus(input.vendorStatus);
  return {
    category: "brand",
    status,
    verified: status === "verified",
    label:
      status === "verified"
        ? "Verified brand"
        : status === "pending"
          ? "Brand verification pending"
          : "Brand not verified",
    source: status === "unverified" ? "none" : "vendors",
  };
}

export function resolveCreatorVerification(input: {
  influencerVerified?: boolean | null;
  identityVerified?: boolean | null;
}): VerificationSnapshot {
  if (input.influencerVerified) {
    return {
      category: "creator",
      status: "verified",
      verified: true,
      label: "Verified creator",
      source: "influencers",
    };
  }
  if (input.identityVerified) {
    return resolvePersonalVerification({ identityVerified: true });
  }
  return {
    category: "creator",
    status: "unverified",
    verified: false,
    label: "Creator not verified",
    source: "none",
  };
}

/** Prefer brand verification for campaign cards; fall back to personal KYC. */
export function resolveCampaignBrandBadge(input: {
  vendorStatus?: string | null;
  identityVerified?: boolean | null;
}): VerificationSnapshot {
  const brand = resolveBrandVerification({ vendorStatus: input.vendorStatus });
  if (brand.verified) return brand;
  return resolvePersonalVerification({ identityVerified: input.identityVerified });
}
