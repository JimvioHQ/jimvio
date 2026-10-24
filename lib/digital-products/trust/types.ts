/**
 * Digital-product trust model.
 * Marketplace publication still uses products.status.
 * digital_verification_state is the server-enforced review lifecycle.
 * A null verification state means a legacy listing that predates this workflow.
 */

export const POLICY_VERSION = "2026-10-22";

export const ACQUISITION_MODELS = [
  "original_vendor_product",
  "licensed_resale_product",
  "distribution_partner_product",
  "affiliate_only_product",
] as const;

export type AcquisitionModel = (typeof ACQUISITION_MODELS)[number];

export const FULFILLMENT_MODES = ["download", "affiliate_redirect"] as const;
export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export const VERIFICATION_STATES = [
  "draft",
  "submitted",
  "automated_checks",
  "under_review",
  "needs_changes",
  "approved",
  "published",
  "rejected",
  "suspended",
  "quarantined",
  "takedown_pending",
  "removed",
  "expired",
] as const;

export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const SCAN_STATUSES = [
  "pending",
  "scanning",
  "passed",
  "failed",
  "unavailable",
  "quarantined",
  "requires_review",
  "not_applicable",
] as const;

export type ScanStatus = (typeof SCAN_STATUSES)[number];

export const LICENSE_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "expired",
  "revoked",
  "requires_human_review",
] as const;

export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export const ISSUE_TYPES = [
  "corrupted_file",
  "missing_content",
  "unauthorized_product",
  "misleading_listing",
  "other",
] as const;

export type CustomerIssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_STATUSES = ["open", "in_review", "resolved", "rejected"] as const;
export type CustomerIssueStatus = (typeof ISSUE_STATUSES)[number];

export type LicenseRights = {
  commercialSale: boolean;
  marketplaceDistribution: boolean;
  digitalDelivery: boolean;
  territories: string[];
  expiresAt: string | null;
  allowsModification: boolean | null;
  allowsBundling: boolean | null;
  allowsSublicense: boolean | null;
};

export type LicenseAssessmentInput = {
  acquisitionModel: AcquisitionModel;
  /** Rights confirmed by an authorized reviewer. Vendor claims are ignored. */
  reviewerRights: LicenseRights | null;
  reviewerAccepted: boolean;
  evidenceCount: number;
  declarationsAccepted: boolean;
  revoked: boolean;
  /** Optional excerpt used only to detect that a label is not proof. */
  documentTextSample?: string | null;
};

export type SubmissionInput = {
  intent: "draft" | "submit";
  name: string;
  description: string | null;
  categoryId: string | null;
  acquisitionModel: AcquisitionModel | null;
  fulfillmentMode: FulfillmentMode | null;
  affiliateDestinationUrl: string | null;
  rightsholderName: string | null;
  buyerLicenseSummary: string | null;
  declarationsAccepted: boolean;
  fileName: string | null;
  fileMime: string | null;
  fileSizeBytes: number | null;
  fileUrl: string | null;
  evidenceUrl: string | null;
  evidenceFileName: string | null;
  duplicateDigest: boolean;
  refundPolicyNote?: string | null;
  compatibilityNotes?: string | null;
  updatePolicy?: string | null;
  contentLanguage?: string | null;
  intendedAudience?: string | null;
};

export type PublicTrust = {
  vendorIdentityVerified: boolean;
  licenseEvidenceReviewed: boolean;
  securityChecksCompleted: boolean;
  productReviewedAndApproved: boolean;
  hostedDownload: boolean;
  affiliateOnly: boolean;
  guaranteesSafety: false;
  buyerLicenseSummary: string | null;
  refundDisclosure: string;
  deliveryLabel: string;
  statements: string[];
};
