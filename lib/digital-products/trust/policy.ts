import { createHash } from "node:crypto";
import { contentDigest as hashFileBytes } from "./cloudmersive";
import {
  extensionOf,
  inspectZip,
  isHttpsUrl,
  isPrivateCloudinaryUrl,
  validateDeclaredFile,
  validateMagicBytes,
  type FileCheck,
} from "./files";
import type {
  AcquisitionModel,
  CustomerIssueStatus,
  FulfillmentMode,
  LicenseAssessmentInput,
  LicenseStatus,
  ScanStatus,
  SubmissionInput,
  VerificationState,
} from "./types";
import { POLICY_VERSION } from "./types";

export const TRANSITIONS: Record<VerificationState, readonly VerificationState[]> = {
  draft: ["submitted"],
  submitted: ["automated_checks", "needs_changes", "rejected", "quarantined"],
  automated_checks: ["under_review", "quarantined", "needs_changes"],
  under_review: ["approved", "needs_changes", "rejected", "quarantined", "suspended"],
  needs_changes: ["submitted"],
  approved: ["published", "needs_changes", "rejected"],
  published: ["suspended", "takedown_pending", "needs_changes", "expired", "removed", "submitted"],
  rejected: ["submitted"],
  suspended: ["under_review", "removed"],
  quarantined: ["under_review", "removed"],
  takedown_pending: ["removed", "under_review"],
  removed: ["under_review"],
  expired: ["submitted", "under_review"],
};

const INCOME_CLAIM = /\b(guaranteed (income|returns|profits?)|get rich quick|risk[- ]free profits?)\b/i;
const UNSUPPORTED_LEGAL_CLAIM = /\b(copyright[- ]free|100% safe|legally certified)\b/i;
const RESELL_LABEL = /\b(resell rights|plr|mrr|master resell)\b/i;

export function canTransition(from: VerificationState, to: VerificationState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function decideTransition(input: {
  current: VerificationState;
  expected: VerificationState;
  to: VerificationState;
}): { ok: true } | { ok: false; code: "conflict" | "invalid_transition"; message: string } {
  if (input.current !== input.expected) {
    return {
      ok: false,
      code: "conflict",
      message: "The product changed while this decision was in progress. Refresh and try again.",
    };
  }
  if (!canTransition(input.current, input.to)) {
    return {
      ok: false,
      code: "invalid_transition",
      message: `A product in “${input.current}” cannot move to “${input.to}”.`,
    };
  }
  return { ok: true };
}

export function fulfillmentFor(model: AcquisitionModel | null, requested: FulfillmentMode | null): FulfillmentMode {
  if (model === "affiliate_only_product") return "affiliate_redirect";
  return requested === "affiliate_redirect" ? "affiliate_redirect" : "download";
}

export function assessLicense(
  input: LicenseAssessmentInput,
  now = new Date(),
): { status: LicenseStatus; blockers: string[]; requiresHumanReview: boolean } {
  const blockers: string[] = [];
  const sample = input.documentTextSample || "";
  const labelOnly = RESELL_LABEL.test(sample);

  if (input.revoked) {
    return { status: "revoked", blockers: ["Distribution rights were revoked."], requiresHumanReview: true };
  }

  if (input.reviewerRights?.expiresAt) {
    const expiry = new Date(input.reviewerRights.expiresAt);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime()) {
      return { status: "expired", blockers: ["The license term has expired."], requiresHumanReview: true };
    }
  }

  if (!input.declarationsAccepted) {
    blockers.push("The seller has not accepted the marketplace declarations.");
  }

  const affiliate = input.acquisitionModel === "affiliate_only_product";
  if (!affiliate && input.evidenceCount < 1 && input.acquisitionModel !== "original_vendor_product") {
    blockers.push("License or distribution evidence is required for this source.");
  }
  if (affiliate && input.evidenceCount < 1) {
    blockers.push("Affiliate program authorization is required.");
  }
  if (input.acquisitionModel === "original_vendor_product" && input.evidenceCount < 1 && !input.reviewerAccepted) {
    blockers.push("Original-vendor claims still require human review of ownership.");
  }

  if (labelOnly && !input.reviewerAccepted) {
    blockers.push("A resale label such as PLR or MRR is not proof of distribution rights.");
  }

  if (!input.reviewerAccepted || !input.reviewerRights) {
    return {
      status: "requires_human_review",
      blockers: blockers.length ? blockers : ["A reviewer must confirm the rights and the authority of the grantor."],
      requiresHumanReview: true,
    };
  }

  const rights = input.reviewerRights;
  if (affiliate && rights.digitalDelivery) {
    blockers.push("Affiliate-only products cannot include digital delivery rights.");
  }
  if (!affiliate && !rights.commercialSale) blockers.push("Commercial sale is not confirmed.");
  if (!rights.marketplaceDistribution) blockers.push("Marketplace distribution is not confirmed.");
  if (!affiliate && !rights.digitalDelivery) blockers.push("Digital delivery to customers is not confirmed.");
  if (rights.territories.length === 0) blockers.push("At least one territory or “worldwide” must be recorded.");

  if (blockers.length) {
    return { status: "requires_human_review", blockers, requiresHumanReview: true };
  }

  return { status: "accepted", blockers: [], requiresHumanReview: false };
}

export function assessQuality(input: {
  name: string;
  description: string | null;
  categoryId: string | null;
  fileSizeBytes: number | null;
  duplicateDigest: boolean;
  fulfillment: FulfillmentMode;
}): { blockers: string[]; indicators: string[] } {
  const blockers: string[] = [];
  const indicators: string[] = [];
  const text = `${input.name}\n${input.description || ""}`.replace(/<[^>]+>/g, " ");
  const description = (input.description || "").replace(/<[^>]+>/g, " ").trim();
  if (description.length < 40) blockers.push("The description is missing or too short to review.");
  if (!input.categoryId) blockers.push("A category is required.");
  if (INCOME_CLAIM.test(text)) blockers.push("The listing promises unsupported financial returns.");
  if (UNSUPPORTED_LEGAL_CLAIM.test(text)) {
    blockers.push("The listing uses an unsupported safety or copyright claim.");
  }
  if (input.fulfillment === "download" && input.fileSizeBytes === 0) {
    blockers.push("The deliverable file is empty.");
  }
  if (input.duplicateDigest) {
    indicators.push("Another submission uses the same file digest. This is a risk indicator, not a copyright finding.");
  }
  return { blockers, indicators };
}

export type PreparedFile = {
  ok: boolean;
  reasons: string[];
  suspiciousExecutable: boolean;
  encryptedArchive: boolean;
  digestSource: string | null;
};

export function prepareDeliverable(input: {
  fulfillment: FulfillmentMode;
  fileName: string | null;
  fileMime: string | null;
  fileSizeBytes: number | null;
  fileUrl: string | null;
  maxBytes: number;
  bytes?: Uint8Array | null;
}): PreparedFile {
  if (input.fulfillment === "affiliate_redirect") {
    if (input.fileUrl) {
      return {
        ok: false,
        reasons: ["Affiliate-only products cannot include a Jimvio download file."],
        suspiciousExecutable: false,
        encryptedArchive: false,
        digestSource: null,
      };
    }
    return { ok: true, reasons: [], suspiciousExecutable: false, encryptedArchive: false, digestSource: null };
  }

  const reasons: string[] = [];
  const declared = validateDeclaredFile({
    fileName: input.fileName,
    mime: input.fileMime,
    sizeBytes: input.fileSizeBytes,
    maxBytes: input.maxBytes,
  });
  if (!declared.ok) reasons.push(...declared.reasons);
  if (!isPrivateCloudinaryUrl(input.fileUrl)) {
    reasons.push("Downloadable files must be stored as private files, not public URLs.");
  }
  const ext = extensionOf(input.fileName);
  let suspicious = Boolean(ext && ["exe", "dll", "scr", "bat", "cmd", "ps1", "msi"].includes(ext));
  let encrypted = false;
  if (input.bytes && input.bytes.length) {
    const magic: FileCheck = validateMagicBytes(input.bytes, ext);
    if (!magic.ok) {
      reasons.push(...magic.reasons);
      suspicious = suspicious || magic.reasons.some((r) => /executable/i.test(r));
    }
    if (ext === "zip" || ext === "epub" || ext === "docx") {
      const zip = inspectZip(input.bytes);
      encrypted = zip.encrypted;
      if (!zip.ok) reasons.push(...zip.reasons);
    }
  }
  return {
    ok: reasons.length === 0 && !encrypted,
    reasons,
    suspiciousExecutable: suspicious,
    encryptedArchive: encrypted,
    digestSource: input.fileUrl,
  };
}

export function assessSubmission(input: SubmissionInput, maxBytes: number, bytes?: Uint8Array | null): {
  ok: boolean;
  errors: string[];
  indicators: string[];
  fulfillment: FulfillmentMode;
  file: PreparedFile;
} {
  const errors: string[] = [];
  const fulfillment = fulfillmentFor(input.acquisitionModel, input.fulfillmentMode);
  if (input.intent === "draft" && input.name.trim().length < 3) {
    return {
      ok: false,
      errors: ["Product title must be at least 3 characters."],
      indicators: [],
      fulfillment,
      file: prepareDeliverable({ fulfillment, fileName: input.fileName, fileMime: input.fileMime, fileSizeBytes: input.fileSizeBytes, fileUrl: input.fileUrl, maxBytes, bytes }),
    };
  }
  if (input.intent === "draft") {
    return { ok: true, errors: [], indicators: [], fulfillment, file: prepareDeliverable({ fulfillment, fileName: input.fileName, fileMime: input.fileMime, fileSizeBytes: input.fileSizeBytes, fileUrl: fulfillment === "download" ? input.fileUrl : null, maxBytes, bytes }) };
  }

  if (!input.acquisitionModel) errors.push("Choose how Jimvio is allowed to offer this product.");
  if (!input.declarationsAccepted) errors.push("Accept the marketplace declarations before submitting.");
  if (!input.rightsholderName?.trim()) errors.push("Name the creator or rightsholder.");
  const quality = assessQuality({
    name: input.name,
    description: input.description,
    categoryId: input.categoryId,
    fileSizeBytes: input.fileSizeBytes,
    duplicateDigest: input.duplicateDigest,
    fulfillment,
  });
  errors.push(...quality.blockers);

  if (fulfillment === "affiliate_redirect") {
    if (!isHttpsUrl(input.affiliateDestinationUrl)) {
      errors.push("Affiliate listings need an https destination URL.");
    }
    if (!input.evidenceUrl) errors.push("Upload the affiliate program terms or approval.");
  } else if (input.acquisitionModel && input.acquisitionModel !== "original_vendor_product" && !input.evidenceUrl) {
    errors.push("Upload the license, contract, or distribution authorization.");
  }

  const file = prepareDeliverable({
    fulfillment,
    fileName: input.fileName,
    fileMime: input.fileMime,
    fileSizeBytes: input.fileSizeBytes,
    fileUrl: input.fileUrl,
    maxBytes,
    bytes,
  });
  errors.push(...file.reasons);

  return { ok: errors.length === 0, errors, indicators: quality.indicators, fulfillment, file };
}

export type PublicationInput = {
  verificationState: VerificationState | null;
  humanApproved: boolean;
  reviewerIsSubmitter: boolean;
  vendorSuspended: boolean;
  licenseStatus: LicenseStatus | null;
  licenseExpired: boolean;
  licenseRevoked: boolean;
  commercialSale: boolean;
  marketplaceDistribution: boolean;
  digitalDelivery: boolean;
  fulfillment: FulfillmentMode;
  acquisitionModel: AcquisitionModel | null;
  affiliateUrl: string | null;
  fileUrl: string | null;
  fileDigest?: string | null;
  scanDigest?: string | null;
  scanBytesInspected?: boolean;
  scanStatus: ScanStatus | null;
  qualityBlockers: string[];
  enforcementBlocksPublication: boolean;
  openTakedown: boolean;
};

export function evaluatePublication(input: PublicationInput): { publishable: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.verificationState) reasons.push("This listing is not in the digital verification workflow.");
  if (input.verificationState !== "approved") {
    reasons.push("An authorized reviewer must approve the product. Automated checks cannot publish it.");
  }
  if (!input.humanApproved) reasons.push("Human approval has not been recorded.");
  if (input.reviewerIsSubmitter) reasons.push("The submitting vendor cannot approve their own product.");
  if (input.vendorSuspended) reasons.push("The vendor authorization is not valid.");
  if (input.licenseStatus !== "accepted" || input.licenseExpired || input.licenseRevoked) {
    reasons.push("Accepted, unexpired license evidence is required.");
  }
  if (!input.marketplaceDistribution) reasons.push("Marketplace distribution rights are not confirmed.");
  if (input.qualityBlockers.length) reasons.push(...input.qualityBlockers);
  if (input.enforcementBlocksPublication || input.openTakedown) {
    reasons.push("An open enforcement or takedown case blocks publication.");
  }

  const affiliate = input.fulfillment === "affiliate_redirect" || input.acquisitionModel === "affiliate_only_product";
  if (affiliate) {
    if (input.fileUrl) reasons.push("Affiliate-only products cannot be published with a downloadable file.");
    if (!isHttpsUrl(input.affiliateUrl)) reasons.push("An affiliate destination URL is required.");
    if (input.digitalDelivery) reasons.push("Affiliate-only products must not grant digital delivery rights.");
    if (input.scanStatus !== "not_applicable") {
      reasons.push("Affiliate listings must not be treated as scanned downloads.");
    }
  } else {
    if (!input.commercialSale) reasons.push("Commercial sale rights are not confirmed.");
    if (!input.digitalDelivery) reasons.push("Digital delivery rights are not confirmed.");
    if (!input.fileUrl) reasons.push("A private deliverable file is required.");
    if (!scanAuthorizesCurrentFile(input)) {
      reasons.push(
        input.scanStatus === "unavailable"
          ? "Security scanning is unavailable, so the file cannot be published as clean."
          : "A byte-level scan bound to this exact file version is required before publication.",
      );
    }
  }

  return { publishable: reasons.length === 0, reasons };
}

export function scanAuthorizesCurrentFile(input: {
  scanStatus: ScanStatus | null;
  fileDigest?: string | null;
  scanDigest?: string | null;
  scanBytesInspected?: boolean;
}): boolean {
  return input.scanStatus === "passed"
    && input.scanBytesInspected === true
    && Boolean(input.fileDigest)
    && input.scanDigest === input.fileDigest;
}

/** New activation only. An already-public legacy row is left unchanged and is not called verified. */
export function mayNewlyActivateDigital(input: {
  isDigital: boolean;
  verificationState: VerificationState | null;
  previousStatus: string | null;
  nextStatus: string;
  fileChanged: boolean;
}): { allowed: boolean; reason: string } {
  if (!input.isDigital) return { allowed: true, reason: "Physical products are outside digital verification." };
  if (input.nextStatus !== "active") return { allowed: true, reason: "The listing is not being published." };
  if (input.verificationState === "published" && !input.fileChanged) {
    return { allowed: true, reason: "The listing already completed verification." };
  }
  if (input.verificationState == null && input.previousStatus === "active" && !input.fileChanged) {
    return { allowed: true, reason: "An already-public legacy listing can remain public. It is not verified." };
  }
  return { allowed: false, reason: "A digital listing cannot be newly published without completed verification." };
}

export function mayGrantNewDelivery(input: {
  paymentConfirmed: boolean;
  verificationState: VerificationState | null;
  fulfillment: FulfillmentMode | null;
  acquisitionModel: AcquisitionModel | null;
  fileUrl: string | null;
  fileDigest?: string | null;
  scanDigest?: string | null;
  scanBytesInspected?: boolean;
  licenseExpired: boolean;
  licenseRevoked: boolean;
  enforcementBlocksDelivery: boolean;
  scanStatus: ScanStatus | null;
}): { allowed: boolean; reason: string } {
  if (!input.paymentConfirmed) return { allowed: false, reason: "Payment has not been confirmed." };
  const affiliate = input.fulfillment === "affiliate_redirect" || input.acquisitionModel === "affiliate_only_product";
  if (affiliate) return { allowed: false, reason: "Affiliate-only products are not delivered as downloads." };
  if (input.enforcementBlocksDelivery) return { allowed: false, reason: "Delivery is blocked by an enforcement case." };
  if (input.licenseExpired || input.licenseRevoked) return { allowed: false, reason: "License rights are expired or revoked." };
  if (input.scanStatus === "failed" || input.scanStatus === "quarantined") {
    return { allowed: false, reason: "The file failed security checks." };
  }
  if (input.verificationState !== "published") {
    return { allowed: false, reason: "An unverified digital listing cannot be newly purchased or granted." };
  }
  if (input.verificationState === "published" && !scanAuthorizesCurrentFile(input)) {
    return { allowed: false, reason: "The current file does not have a byte-level scan bound to this version." };
  }
  if (!input.fileUrl) return { allowed: false, reason: "No deliverable file is available." };
  return { allowed: true, reason: "Entitlement can be granted." };
}

/**
 * Stored order-item URLs exist for purchases made before digital_access rows.
 * They are not a second entitlement. A missing gate, an unpaid order, or any
 * verification state refuses the redirect.
 */
export function mayPurchaseDigitalListing(input: {
  isDigital: boolean;
  schemaReady: boolean;
  verificationState: VerificationState | null;
  fulfillment: FulfillmentMode | null;
  acquisitionModel: AcquisitionModel | null;
  fileDigest?: string | null;
  scanDigest?: string | null;
  scanBytesInspected?: boolean;
  scanStatus: ScanStatus | null;
  licenseExpired: boolean;
  licenseRevoked: boolean;
  enforcementBlocksDelivery: boolean;
}): { allowed: boolean; reason: string } {
  if (!input.isDigital) return { allowed: true, reason: "Physical products are outside digital verification." };
  const affiliate = input.fulfillment === "affiliate_redirect" || input.acquisitionModel === "affiliate_only_product";
  if (affiliate) return { allowed: false, reason: "Affiliate-only products are not sold as Jimvio-hosted downloads." };
  if (!input.schemaReady || input.verificationState !== "published") {
    return { allowed: false, reason: "This digital product has not completed verification and cannot be purchased." };
  }
  if (input.licenseExpired || input.licenseRevoked) {
    return { allowed: false, reason: "License rights are expired or revoked." };
  }
  if (input.enforcementBlocksDelivery) return { allowed: false, reason: "This digital product is not available." };
  if (!scanAuthorizesCurrentFile(input)) {
    return { allowed: false, reason: "This file does not have a current byte-level security scan." };
  }
  return { allowed: true, reason: "The verified digital product can be purchased." };
}

export function mayServeLegacyStoredDownload(input: {
  gateLoaded: boolean;
  verificationState: VerificationState | null;
  fulfillment: FulfillmentMode | null;
  acquisitionModel: AcquisitionModel | null;
  paymentComplete: boolean;
  storedUrlIsHttps: boolean;
  /** True only when this order item was already granted before the current request. */
  previouslyGranted: boolean;
}): { allowed: boolean; reason: string } {
  if (!input.gateLoaded) {
    return { allowed: false, reason: "Delivery status could not be confirmed." };
  }
  if (!input.previouslyGranted) {
    return { allowed: false, reason: "A stored file URL is not a new entitlement." };
  }
  if (!input.paymentComplete) {
    return { allowed: false, reason: "Payment has not been confirmed." };
  }
  if (!input.storedUrlIsHttps) {
    return { allowed: false, reason: "No download entitlement for this order." };
  }
  if (input.verificationState) {
    return { allowed: false, reason: "No download entitlement for this order." };
  }
  const affiliate = input.fulfillment === "affiliate_redirect" || input.acquisitionModel === "affiliate_only_product";
  if (affiliate) {
    return { allowed: false, reason: "This listing has no Jimvio-hosted download." };
  }
  return { allowed: true, reason: "A paid legacy order can use its stored download." };
}

export function mayServeExistingDownload(input: {
  hasEntitlement: boolean;
  verificationState: VerificationState | null;
  fulfillment: FulfillmentMode | null;
  acquisitionModel: AcquisitionModel | null;
  enforcementBlocksDelivery: boolean;
  scanStatus: ScanStatus | null;
}): { allowed: boolean; reason: string } {
  if (!input.hasEntitlement) return { allowed: false, reason: "No entitlement was found for this customer." };
  const affiliate = input.fulfillment === "affiliate_redirect" || input.acquisitionModel === "affiliate_only_product";
  if (affiliate) return { allowed: false, reason: "This listing has no Jimvio-hosted download." };
  if (input.enforcementBlocksDelivery) return { allowed: false, reason: "Delivery is suspended for this product." };
  if (input.scanStatus === "failed" || input.scanStatus === "quarantined") {
    return { allowed: false, reason: "Delivery is blocked by a security finding." };
  }
  const hardStop: Array<VerificationState | null> = ["quarantined", "removed", "takedown_pending", "expired"];
  if (input.verificationState && hardStop.includes(input.verificationState)) {
    return { allowed: false, reason: "This product is not available for delivery." };
  }
  return { allowed: true, reason: "Existing entitlement can be served." };
}

export type CustomerIssueRecord = {
  id: string;
  status: CustomerIssueStatus;
  financialActionCount: number;
};

export function registerCustomerIssue(
  existing: CustomerIssueRecord | null,
  requested: { refund?: boolean },
): { duplicate: boolean; issue: CustomerIssueRecord; financialActionCount: number; error?: string } {
  if (requested.refund) {
    return {
      duplicate: false,
      issue: existing ?? { id: "unsaved", status: "open", financialActionCount: 0 },
      financialActionCount: existing?.financialActionCount ?? 0,
      error: "This workflow does not issue refunds or payment actions.",
    };
  }
  if (existing && (existing.status === "open" || existing.status === "in_review")) {
    return { duplicate: true, issue: existing, financialActionCount: existing.financialActionCount };
  }
  return {
    duplicate: false,
    issue: { id: "new", status: "open", financialActionCount: 0 },
    financialActionCount: 0,
  };
}

export { publicTrustView, sanitizePublicText } from "./public-view";

const SENSITIVE_KEY = /token|secret|password|authorization|signed.?url|api[_-]?key/i;

export function auditMetadata(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { policyVersion: POLICY_VERSION };
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === "string" && /^https?:\/\//i.test(value)) continue;
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

export function contentDigest(bytes: Uint8Array): string {
  return hashFileBytes(bytes);
}

/** Metadata fingerprint. This is not a hash of file bytes and cannot authorize a scan. */
export function fileDigest(url: string | null, size: number | null, name: string | null): string | null {
  if (!url) return null;
  return createHash("sha256").update(`${url}|${size ?? ""}|${name ?? ""}`).digest("hex");
}
