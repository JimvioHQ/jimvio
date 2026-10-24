import type {
  FulfillmentMode,
  LicenseStatus,
  PublicTrust,
  ScanStatus,
  VerificationState,
} from "./types";

export function sanitizePublicText(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

export function publicTrustView(input: {
  vendorVerificationStatus: string | null;
  licenseStatus: LicenseStatus | null;
  licenseExpired: boolean;
  licenseRevoked: boolean;
  scanStatus: ScanStatus | null;
  scanBytesInspected?: boolean;
  verificationState: VerificationState | null;
  humanApproved: boolean;
  fulfillment: FulfillmentMode | null;
  buyerLicenseSummary: string | null;
  refundPolicyNote: string | null;
}): PublicTrust {
  const affiliate = input.fulfillment === "affiliate_redirect";
  const licenseEvidenceReviewed =
    input.licenseStatus === "accepted" && !input.licenseExpired && !input.licenseRevoked;
  const securityChecksCompleted = input.scanStatus === "passed" && input.scanBytesInspected === true;
  const productReviewedAndApproved = input.verificationState === "published" && input.humanApproved;
  const statements: string[] = [];
  if (input.vendorVerificationStatus === "verified") statements.push("Seller identity is verified.");
  else statements.push("Seller identity has not been verified.");
  if (licenseEvidenceReviewed) statements.push("License evidence was reviewed for this listing.");
  else statements.push("License evidence has not been accepted for this listing.");
  if (affiliate) statements.push("Jimvio does not host a download for this listing.");
  else if (securityChecksCompleted) statements.push("Configured security checks completed for the current file.");
  else statements.push("Security checks have not produced a passing result for the current file.");
  if (productReviewedAndApproved) statements.push("A reviewer approved and published this listing.");
  else statements.push("This listing does not have a completed human approval on record.");

  return {
    vendorIdentityVerified: input.vendorVerificationStatus === "verified",
    licenseEvidenceReviewed,
    securityChecksCompleted,
    productReviewedAndApproved,
    hostedDownload: !affiliate,
    affiliateOnly: affiliate,
    guaranteesSafety: false,
    buyerLicenseSummary: input.buyerLicenseSummary,
    refundDisclosure:
      input.refundPolicyNote?.trim() ||
      "Refunds follow the marketplace policy for this order. Downloading a file does not by itself end eligibility.",
    deliveryLabel: affiliate ? "External affiliate offer" : "Download after confirmed payment",
    statements,
  };
}
