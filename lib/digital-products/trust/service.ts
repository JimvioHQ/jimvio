import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/notify-user";
import { configuredMaxFileBytes } from "./files";
import {
  assessLicense,
  assessSubmission,
  auditMetadata,
  contentDigest,
  mayPurchaseDigitalListing,
  registerCustomerIssue,
  sanitizePublicText,
} from "./policy";
import { cloudmersiveMaxBytes } from "./cloudmersive";
import { loadScannableFileBytes } from "./private-bytes";
import { runSecurityScan, scannerEnvFromProcess } from "./scanner";
import {
  POLICY_VERSION,
  type AcquisitionModel,
  type CustomerIssueStatus,
  type CustomerIssueType,
  type LicenseRights,
  type SubmissionInput,
  type VerificationState,
} from "./types";

type Admin = ReturnType<typeof createAdminClient>;

function db(): Admin {
  return createAdminClient();
}

export async function verificationSchemaReady(): Promise<boolean> {
  const { error } = await db().from("products").select("digital_verification_state").limit(1);
  return !error;
}

function missingSchema(error: { message?: string } | null): boolean {
  const message = error?.message || "";
  return /digital_verification_state|product_license_records|product_security_scans|schema cache|does not exist/i.test(message);
}

export async function engageProductVerification(input: {
  productId: string;
  vendorId: string;
  actorUserId: string;
  submission: SubmissionInput;
  bytes?: Uint8Array | null;
}): Promise<{ ok: true; state: VerificationState; scanStatus: string; indicators: string[] } | { ok: false; error: string }> {
  const maxBytes = configuredMaxFileBytes(process.env.DIGITAL_PRODUCT_MAX_BYTES);
  const admin = db();
  const { data: existing, error: existingError } = await admin
    .from("products")
    .select("id, file_digest, acquisition_model, digital_verification_state, vendor_id")
    .eq("id", input.productId)
    .eq("vendor_id", input.vendorId)
    .maybeSingle();

  if (existingError) {
    if (missingSchema(existingError)) {
      return { ok: false, error: "Apply database migration 168 before submitting digital products for verification." };
    }
    return { ok: false, error: "Could not load the product for verification." };
  }
  if (!existing) return { ok: false, error: "Product not found." };

  const scanLimit = cloudmersiveMaxBytes(process.env.DIGITAL_PRODUCT_SCANNER_MAX_BYTES);
  const provided = input.bytes && input.bytes.byteLength > 0 ? input.bytes : null;
  const loadedBytes = provided
    ? (provided.byteLength > scanLimit
      ? { ok: false as const, code: "too_large" as const }
      : { ok: true as const, bytes: provided })
    : input.submission.fileUrl
      ? await loadScannableFileBytes(input.submission.fileUrl, scanLimit)
      : { ok: false as const, code: "not_private" as const };
  const digest = loadedBytes.ok ? contentDigest(loadedBytes.bytes) : null;
  let duplicate = false;
  if (digest) {
    const { count } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("file_digest", digest)
      .neq("id", input.productId);
    duplicate = (count ?? 0) > 0;
  }

  const submission = { ...input.submission, duplicateDigest: duplicate };
  const assessment = assessSubmission(submission, maxBytes, input.bytes);
  if (submission.intent === "submit" && !assessment.ok) {
    return { ok: false, error: assessment.errors[0] || "The submission is incomplete." };
  }

  const materialChange =
    (existing.file_digest || null) !== digest ||
    (existing.acquisition_model || null) !== submission.acquisitionModel;

  const { count: evidenceCount } = await admin
    .from("product_license_evidence")
    .select("id", { count: "exact", head: true })
    .eq("product_id", input.productId);

  const licensePreview = assessLicense({
    acquisitionModel: (submission.acquisitionModel || "original_vendor_product") as AcquisitionModel,
    reviewerRights: null,
    reviewerAccepted: false,
    evidenceCount: (evidenceCount ?? 0) + (submission.evidenceUrl ? 1 : 0),
    declarationsAccepted: submission.declarationsAccepted,
    revoked: false,
  });

  const scan = await runSecurityScan(
    {
      fulfillment: assessment.fulfillment,
      hasDeliverable: assessment.fulfillment === "download" && Boolean(submission.fileUrl),
      structuralFailure: assessment.fulfillment === "download" && !assessment.file.ok,
      encryptedArchive: assessment.file.encryptedArchive,
      suspiciousExecutable: assessment.file.suspiciousExecutable,
      fileDigest: digest,
      fileName: submission.fileName,
      mime: submission.fileMime,
      sizeBytes: loadedBytes.ok ? loadedBytes.bytes.byteLength : submission.fileSizeBytes,
      bytes: loadedBytes.ok ? loadedBytes.bytes : null,
    },
    scannerEnvFromProcess(),
  );

  let state: VerificationState = "draft";
  if (submission.intent === "submit") {
    state = scan.status === "quarantined" || scan.status === "failed" ? "quarantined" : "submitted";
  }

  const productPatch = {
    acquisition_model: submission.acquisitionModel,
    fulfillment_mode: assessment.fulfillment,
    affiliate_destination_url: assessment.fulfillment === "affiliate_redirect" ? submission.affiliateDestinationUrl : null,
    rightsholder_name: sanitizePublicText(submission.rightsholderName || ""),
    buyer_license_summary: submission.buyerLicenseSummary ? sanitizePublicText(submission.buyerLicenseSummary).slice(0, 500) : null,
    digital_verification_state: state,
    file_digest: digest,
    digital_file_url: assessment.fulfillment === "affiliate_redirect" ? null : submission.fileUrl,
    digital_file_size: submission.fileSizeBytes,
    refund_policy_note: submission.refundPolicyNote ? sanitizePublicText(submission.refundPolicyNote).slice(0, 500) : null,
    compatibility_notes: submission.compatibilityNotes ? sanitizePublicText(submission.compatibilityNotes).slice(0, 500) : null,
    update_policy: submission.updatePolicy ? sanitizePublicText(submission.updatePolicy).slice(0, 500) : null,
    content_language: submission.contentLanguage ? sanitizePublicText(submission.contentLanguage).slice(0, 80) : null,
    intended_audience: submission.intendedAudience ? sanitizePublicText(submission.intendedAudience).slice(0, 160) : null,
    declarations_accepted_at: submission.declarationsAccepted ? new Date().toISOString() : null,
    status: state === "draft" ? "draft" : state === "quarantined" ? "paused" : "pending_review",
    is_active: state !== "quarantined",
    published_at: null,
    approved_file_digest: materialChange ? null : undefined,
    submitted_for_review_at: submission.intent === "submit" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await admin.from("products").update(productPatch).eq("id", input.productId);
  if (updateError) {
    if (missingSchema(updateError)) {
      return { ok: false, error: "Apply database migration 168 before submitting digital products for verification." };
    }
    return { ok: false, error: "Could not store the verification submission." };
  }

  if (submission.intent === "submit" && state === "submitted") {
    const { error: reviewError } = await admin
      .from("products")
      .update({ digital_verification_state: "under_review", status: "pending_review", updated_at: new Date().toISOString() })
      .eq("id", input.productId);
    if (!reviewError) state = "under_review";
  }

  const { data: currentLicense } = await admin
    .from("product_license_records")
    .select("id, status")
    .eq("product_id", input.productId)
    .is("superseded_at", null)
    .maybeSingle();

  const licenseStatus = materialChange || !currentLicense ? licensePreview.status : currentLicense.status;
  const licenseRow = {
    product_id: input.productId,
    vendor_id: input.vendorId,
    rightsholder_name: sanitizePublicText(submission.rightsholderName || ""),
    acquisition_model: submission.acquisitionModel || "original_vendor_product",
    status: licenseStatus,
    requires_human_review: licenseStatus !== "accepted",
    declarations_accepted_at: submission.declarationsAccepted ? new Date().toISOString() : null,
    policy_version: POLICY_VERSION,
    updated_at: new Date().toISOString(),
    ...(materialChange
      ? {
          permits_commercial_sale: false,
          permits_marketplace: false,
          permits_digital_delivery: false,
          reviewer_id: null,
          reviewed_at: null,
          rationale: null,
        }
      : {}),
  };

  let licenseId = currentLicense?.id as string | undefined;
  if (currentLicense) {
    await admin.from("product_license_records").update(licenseRow).eq("id", currentLicense.id);
  } else if (submission.acquisitionModel) {
    const { data: inserted } = await admin.from("product_license_records").insert(licenseRow).select("id").single();
    licenseId = inserted?.id;
  }

  if (licenseId && submission.evidenceUrl) {
    const { data: existingEvidence } = await admin
      .from("product_license_evidence")
      .select("id")
      .eq("license_id", licenseId)
      .eq("storage_url", submission.evidenceUrl)
      .maybeSingle();
    if (!existingEvidence) {
      await admin.from("product_license_evidence").insert({
        license_id: licenseId,
        product_id: input.productId,
        vendor_id: input.vendorId,
        storage_url: submission.evidenceUrl,
        original_filename: submission.evidenceFileName,
        uploaded_by: input.actorUserId,
      });
    }
  }

  await admin.from("product_security_scans").insert({
    product_id: input.productId,
    file_digest: digest,
    status: scan.status,
    engine: scan.engine,
    engine_version: scan.engineVersion,
    detail: scan.detail,
    metadata: {
      ...auditMetadata({ indicators: assessment.indicators.join("; ") || null }),
      bytesInspected: scan.bytesInspected === true,
    },
  });

  await admin.from("product_verification_events").insert({
    product_id: input.productId,
    actor_id: input.actorUserId,
    action: "submission",
    from_state: existing.digital_verification_state,
    to_state: state,
    outcome: assessment.ok ? "recorded" : "draft",
    metadata: auditMetadata({
      scanStatus: scan.status,
      engine: scan.engine,
      fulfillment: assessment.fulfillment,
      materialChange,
    }),
  });

  return { ok: true, state, scanStatus: scan.status, indicators: assessment.indicators };
}

export type ReviewQueueRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  verificationState: string | null;
  acquisitionModel: string | null;
  fulfillmentMode: string | null;
  vendorName: string | null;
  vendorVerification: string | null;
  rightsholder: string | null;
  submittedAt: string | null;
  licenseStatus: string | null;
  licenseExpiresAt: string | null;
  scanStatus: string | null;
  assigneeId: string | null;
};

export async function listDigitalReviewQueue(input: {
  state?: string | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: ReviewQueueRow[]; total: number; error?: string }> {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize || 20));
  const admin = db();
  await sweepExpiredLicenses(admin);

  let query = admin
    .from("products")
    .select(
      "id, name, slug, status, digital_verification_state, acquisition_model, fulfillment_mode, rightsholder_name, submitted_for_review_at, verification_assignee_id, vendor_id, vendors(business_name, verification_status)",
      { count: "exact" },
    )
    .eq("is_digital", true)
    .not("digital_verification_state", "is", null);

  if (input.state && input.state !== "all") query = query.eq("digital_verification_state", input.state);
  if (input.q?.trim()) {
    const term = input.q.trim().replace(/[%_,]/g, " ").slice(0, 80);
    query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,rightsholder_name.ilike.%${term}%`);
  }

  const { data, error, count } = await query
    .order("submitted_for_review_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    return { rows: [], total: 0, error: missingSchema(error) ? "Migration 168 has not been applied." : "Could not load the review queue." };
  }

  const ids = (data ?? []).map((row) => row.id as string);
  const licenses = new Map<string, { status: string; expires_at: string | null }>();
  const scans = new Map<string, string>();
  if (ids.length) {
    const { data: licenseRows } = await admin
      .from("product_license_records")
      .select("product_id, status, expires_at, created_at")
      .in("product_id", ids)
      .is("superseded_at", null);
    for (const row of licenseRows ?? []) licenses.set(row.product_id, row);
    const { data: scanRows } = await admin
      .from("product_security_scans")
      .select("product_id, status, created_at")
      .in("product_id", ids)
      .order("created_at", { ascending: false });
    for (const row of scanRows ?? []) {
      if (!scans.has(row.product_id)) scans.set(row.product_id, row.status);
    }
  }

  const rows: ReviewQueueRow[] = (data ?? []).map((row) => {
    const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    const license = licenses.get(row.id);
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      verificationState: row.digital_verification_state,
      acquisitionModel: row.acquisition_model,
      fulfillmentMode: row.fulfillment_mode,
      vendorName: vendor?.business_name ?? null,
      vendorVerification: vendor?.verification_status ?? null,
      rightsholder: row.rightsholder_name,
      submittedAt: row.submitted_for_review_at,
      licenseStatus: license?.status ?? null,
      licenseExpiresAt: license?.expires_at ?? null,
      scanStatus: scans.get(row.id) ?? null,
      assigneeId: row.verification_assignee_id,
    };
  });

  return { rows, total: count ?? rows.length };
}

export async function sweepExpiredLicenses(admin?: Admin, limit = 25): Promise<{ examined: number; schemaReady: boolean }> {
  const client = admin ?? db();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("product_license_records")
    .select("id, product_id")
    .is("superseded_at", null)
    .eq("status", "accepted")
    .lt("expires_at", now)
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) return { examined: 0, schemaReady: !missingSchema(error) };
  for (const row of data ?? []) {
    await client.from("product_license_records").update({
      status: "expired",
      requires_human_review: true,
      updated_at: now,
    }).eq("id", row.id);
    const { data: product } = await client
      .from("products")
      .select("digital_verification_state")
      .eq("id", row.product_id)
      .maybeSingle();
    if (product?.digital_verification_state === "published") {
      await client.rpc("apply_digital_product_decision", {
        p_product_id: row.product_id,
        p_actor: null,
        p_to_state: "expired",
        p_reason: "The recorded license end date has passed.",
        p_expected_state: "published",
        p_internal_notes: null,
        p_case_type: "license_dispute",
        p_blocks_delivery: true,
      });
    }
  }
  return { examined: (data ?? []).length, schemaReady: true };
}

export async function saveLicenseReview(input: {
  productId: string;
  reviewerId: string;
  accept: boolean;
  rights: LicenseRights;
  rationale: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.rationale.trim().length < 8) return { ok: false, error: "Record why this rights decision was made." };
  const admin = db();
  const { data: product } = await admin
    .from("products")
    .select("id, vendor_id, acquisition_model, vendors(user_id)")
    .eq("id", input.productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "Product not found." };
  const vendor = Array.isArray(product.vendors) ? product.vendors[0] : product.vendors;
  if (vendor?.user_id === input.reviewerId) return { ok: false, error: "You cannot review your own product." };

  const { count } = await admin
    .from("product_license_evidence")
    .select("id", { count: "exact", head: true })
    .eq("product_id", input.productId);
  const model = (product.acquisition_model || "original_vendor_product") as AcquisitionModel;
  const assessment = assessLicense({
    acquisitionModel: model,
    reviewerRights: input.accept ? input.rights : null,
    reviewerAccepted: input.accept,
    evidenceCount: count ?? 0,
    declarationsAccepted: true,
    revoked: false,
  });
  if (input.accept && assessment.status !== "accepted") {
    return { ok: false, error: assessment.blockers[0] || "The rights record is not sufficient to accept." };
  }

  const patch = {
    status: input.accept ? "accepted" : "rejected",
    permits_commercial_sale: input.accept ? input.rights.commercialSale : false,
    permits_marketplace: input.accept ? input.rights.marketplaceDistribution : false,
    permits_digital_delivery: input.accept ? input.rights.digitalDelivery : false,
    permits_modification: input.rights.allowsModification,
    permits_bundling: input.rights.allowsBundling,
    permits_sublicense: input.rights.allowsSublicense,
    territories: input.rights.territories,
    expires_at: input.rights.expiresAt,
    reviewer_id: input.reviewerId,
    reviewed_at: new Date().toISOString(),
    rationale: sanitizePublicText(input.rationale).slice(0, 2000),
    requires_human_review: assessment.requiresHumanReview,
    policy_version: POLICY_VERSION,
    updated_at: new Date().toISOString(),
  };

  const { data: current } = await admin
    .from("product_license_records")
    .select("id")
    .eq("product_id", input.productId)
    .is("superseded_at", null)
    .maybeSingle();
  if (!current) return { ok: false, error: "No license record exists for this product." };
  const { error } = await admin.from("product_license_records").update(patch).eq("id", current.id);
  if (error) return { ok: false, error: "Could not save the license review." };

  await admin.from("product_verification_events").insert({
    product_id: input.productId,
    actor_id: input.reviewerId,
    action: "license_review",
    outcome: patch.status,
    metadata: auditMetadata({ status: patch.status }),
  });
  return { ok: true };
}

const DECISIONS: Record<string, { to: VerificationState; caseType: string | null; blocksDelivery: boolean }> = {
  approve: { to: "approved", caseType: null, blocksDelivery: false },
  request_changes: { to: "needs_changes", caseType: null, blocksDelivery: false },
  reject: { to: "rejected", caseType: null, blocksDelivery: false },
  publish: { to: "published", caseType: null, blocksDelivery: false },
  suspend: { to: "suspended", caseType: "other", blocksDelivery: false },
  takedown: { to: "takedown_pending", caseType: "copyright", blocksDelivery: true },
  quarantine: { to: "quarantined", caseType: "malware", blocksDelivery: true },
  reinstate: { to: "under_review", caseType: null, blocksDelivery: false },
  remove: { to: "removed", caseType: "other", blocksDelivery: true },
};

export async function applyReviewDecision(input: {
  productId: string;
  actorId: string;
  action: keyof typeof DECISIONS;
  expectedState: string;
  reason: string;
  internalNotes?: string | null;
  caseType?: string | null;
}): Promise<{ ok: true; state: string } | { ok: false; error: string }> {
  const decision = DECISIONS[input.action];
  if (!decision) return { ok: false, error: "Unknown decision." };
  if (input.reason.trim().length < 8) return { ok: false, error: "A reason of at least 8 characters is required." };
  const admin = db();
  const { data, error } = await admin.rpc("apply_digital_product_decision", {
    p_product_id: input.productId,
    p_actor: input.actorId,
    p_to_state: decision.to,
    p_reason: sanitizePublicText(input.reason).slice(0, 2000),
    p_expected_state: input.expectedState,
    p_internal_notes: input.internalNotes ? sanitizePublicText(input.internalNotes).slice(0, 4000) : null,
    p_case_type: input.caseType || decision.caseType,
    p_blocks_delivery: decision.blocksDelivery,
  });
  if (error) {
    return { ok: false, error: missingSchema(error) ? "Migration 168 has not been applied." : "The decision could not be saved." };
  }
  const body = (data ?? {}) as { ok?: boolean; error?: string; state?: string };
  if (!body.ok) {
    const messages: Record<string, string> = {
      conflict: "This product was updated by someone else. Refresh the queue.",
      invalid_transition: "That status change is not allowed from the current state.",
      self_approval: "You cannot approve your own product.",
      reason_required: "A reason is required.",
      human_approval_required: "Approve the product before publishing it.",
      license_not_accepted: "Accepted license evidence is required.",
      license_expired: "The license has expired.",
      scan_not_passed: "A passing security scan is required. An unconfigured scanner cannot publish a file.",
      scan_not_applicable: "Affiliate listings cannot be published as scanned downloads.",
      affiliate_fulfillment: "Affiliate listings cannot include a downloadable file.",
      enforcement_block: "An open enforcement case blocks publication.",
      file_required: "A private deliverable file is required.",
    };
    return { ok: false, error: messages[body.error || ""] || "The decision was rejected." };
  }

  const { data: product } = await admin
    .from("products")
    .select("name, vendor_id, vendors(user_id)")
    .eq("id", input.productId)
    .maybeSingle();
  const vendor = Array.isArray(product?.vendors) ? product?.vendors[0] : product?.vendors;
  if (vendor?.user_id) {
    try {
      await notifyUser(admin, {
        userId: vendor.user_id,
        type: "system",
        title: "Digital product review updated",
        message: `“${product?.name || "Your product"}” is now ${body.state}. ${sanitizePublicText(input.reason).slice(0, 240)}`,
        actionUrl: "/seller/products",
        data: { kind: "digital_product_review", state: body.state },
      });
    } catch {
      // Notification failure does not undo the decision.
    }
  }

  await admin.from("admin_audit_events").insert({
    actor_id: input.actorId,
    action: `digital_product_${input.action}`,
    entity_type: "product",
    entity_id: input.productId,
    metadata: auditMetadata({ state: body.state }),
  }).then(() => undefined, () => undefined);

  return { ok: true, state: body.state || decision.to };
}

export async function getDeliveryGate(productId: string): Promise<{
  verificationState: VerificationState | null;
  fulfillment: "download" | "affiliate_redirect" | null;
  acquisitionModel: AcquisitionModel | null;
  fileUrl: string | null;
  licenseExpired: boolean;
  licenseRevoked: boolean;
  enforcementBlocksDelivery: boolean;
  scanStatus: string | null;
  fileDigest: string | null;
  scanDigest: string | null;
  scanBytesInspected: boolean;
  schemaReady: boolean;
}> {
  const admin = db();
  const { data, error } = await admin
    .from("products")
    .select("digital_verification_state, fulfillment_mode, acquisition_model, digital_file_url, file_digest")
    .eq("id", productId)
    .maybeSingle();
  if (error || !data) {
    return {
      verificationState: null,
      fulfillment: null,
      acquisitionModel: null,
      fileUrl: null,
      licenseExpired: false,
      licenseRevoked: false,
      enforcementBlocksDelivery: false,
      scanStatus: null,
      fileDigest: null,
      scanDigest: null,
      scanBytesInspected: false,
      schemaReady: !missingSchema(error),
    };
  }
  const { data: license } = await admin
    .from("product_license_records")
    .select("status, expires_at, revoked_at")
    .eq("product_id", productId)
    .is("superseded_at", null)
    .maybeSingle();
  const { data: scan } = await admin
    .from("product_security_scans")
    .select("status, file_digest, metadata")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { count } = await admin
    .from("product_enforcement_cases")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .in("status", ["open", "takedown_pending"])
    .eq("blocks_delivery", true);
  const expires = license?.expires_at ? new Date(license.expires_at).getTime() <= Date.now() : false;
  return {
    verificationState: data.digital_verification_state,
    fulfillment: data.fulfillment_mode,
    acquisitionModel: data.acquisition_model,
    fileUrl: data.digital_file_url,
    licenseExpired: expires || license?.status === "expired",
    licenseRevoked: Boolean(license?.revoked_at) || license?.status === "revoked",
    enforcementBlocksDelivery: (count ?? 0) > 0,
    scanStatus: scan?.status ?? null,
    fileDigest: data.file_digest ?? null,
    scanDigest: scan?.file_digest ?? null,
    scanBytesInspected: Boolean(scan?.metadata && typeof scan.metadata === "object" && (scan.metadata as { bytesInspected?: boolean }).bytesInspected === true),
    schemaReady: true,
  };
}

export async function evaluateDigitalPurchase(productId: string) {
  try {
    const gate = await getDeliveryGate(productId);
    return mayPurchaseDigitalListing({
      isDigital: true,
      schemaReady: gate.schemaReady,
      verificationState: gate.verificationState,
      fulfillment: gate.fulfillment,
      acquisitionModel: gate.acquisitionModel,
      fileDigest: gate.fileDigest,
      scanDigest: gate.scanDigest,
      scanBytesInspected: gate.scanBytesInspected,
      scanStatus: gate.scanStatus as never,
      licenseExpired: gate.licenseExpired,
      licenseRevoked: gate.licenseRevoked,
      enforcementBlocksDelivery: gate.enforcementBlocksDelivery,
    });
  } catch {
    return { allowed: false as const, reason: "This digital product cannot be purchased right now." };
  }
}

export async function createCustomerIssue(input: {
  reporterId: string;
  productId: string;
  orderId?: string | null;
  orderItemId?: string | null;
  issueType: CustomerIssueType;
  details: string;
  refund?: boolean;
}): Promise<{ ok: true; duplicate: boolean; id: string } | { ok: false; error: string }> {
  const decision = registerCustomerIssue(null, { refund: input.refund });
  if (decision.error) return { ok: false, error: decision.error };
  const details = sanitizePublicText(input.details);
  if (details.length < 8) return { ok: false, error: "Describe the issue in a little more detail." };
  const admin = db();
  if (input.orderId) {
    const { data: order } = await admin.from("orders").select("id, buyer_id").eq("id", input.orderId).maybeSingle();
    if (!order || order.buyer_id !== input.reporterId) return { ok: false, error: "That order is not available to this account." };
  }
  const { data: product } = await admin.from("products").select("id, vendor_id").eq("id", input.productId).maybeSingle();
  if (!product) return { ok: false, error: "Product not found." };

  const { data, error } = await admin
    .from("product_customer_issues")
    .insert({
      reporter_id: input.reporterId,
      product_id: input.productId,
      order_id: input.orderId || null,
      order_item_id: input.orderItemId || null,
      vendor_id: product.vendor_id,
      issue_type: input.issueType,
      details,
      status: "open",
      financial_action_count: 0,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" || /duplicate/i.test(error.message)) {
      const { data: existing } = await admin
        .from("product_customer_issues")
        .select("id, financial_action_count")
        .eq("reporter_id", input.reporterId)
        .eq("product_id", input.productId)
        .eq("issue_type", input.issueType)
        .in("status", ["open", "in_review"])
        .limit(1)
        .maybeSingle();
      if (existing) return { ok: true, duplicate: true, id: existing.id };
    }
    return { ok: false, error: missingSchema(error) ? "Issue tracking is not available until migration 168 is applied." : "Could not save the issue." };
  }

  await admin.from("product_verification_events").insert({
    product_id: input.productId,
    actor_id: input.reporterId,
    action: "customer_issue",
    outcome: "open",
    metadata: auditMetadata({ issueType: input.issueType, issueId: data.id }),
  });
  return { ok: true, duplicate: false, id: data.id };
}

export async function assignDigitalReviewer(input: {
  productId: string;
  actorId: string;
  assigneeId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = db();
  const { data: product } = await admin
    .from("products")
    .select("id, vendor_id, vendors(user_id)")
    .eq("id", input.productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "Product not found." };
  const vendor = Array.isArray(product.vendors) ? product.vendors[0] : product.vendors;
  if (vendor?.user_id && vendor.user_id === input.assigneeId) {
    return { ok: false, error: "The selling account cannot be assigned as its own reviewer." };
  }
  const { error } = await admin
    .from("products")
    .update({ verification_assignee_id: input.assigneeId, updated_at: new Date().toISOString() })
    .eq("id", input.productId);
  if (error) return { ok: false, error: "Could not assign the reviewer." };
  await admin.from("product_verification_events").insert({
    product_id: input.productId,
    actor_id: input.actorId,
    action: "reviewer_assigned",
    outcome: "recorded",
    metadata: auditMetadata({ assigneeId: input.assigneeId }),
  });
  return { ok: true };
}

export async function updateCustomerIssue(input: {
  issueId: string;
  actorId: string;
  status: CustomerIssueStatus;
  resolution: string;
  refund?: boolean;
  revokeAccess?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.refund) return { ok: false, error: "This screen does not issue refunds or payment actions." };
  if (input.resolution.trim().length < 8) return { ok: false, error: "A resolution note is required." };
  const admin = db();
  const { data: existing } = await admin
    .from("product_customer_issues")
    .select("id, financial_action_count, product_id, order_id")
    .eq("id", input.issueId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Issue not found." };
  if (input.revokeAccess) {
    if (!existing.order_id) return { ok: false, error: "This issue is not linked to an order, so access was not changed." };
    const { data: order } = await admin.from("orders").select("buyer_id").eq("id", existing.order_id).maybeSingle();
    if (!order?.buyer_id) return { ok: false, error: "The order has no buyer, so access was not changed." };
    const { revokeDigitalAccess } = await import("@/lib/actions/digital-access");
    await revokeDigitalAccess(order.buyer_id, existing.product_id, "manual");
  }
  const { error } = await admin
    .from("product_customer_issues")
    .update({
      status: input.status,
      resolution: sanitizePublicText(input.resolution).slice(0, 2000),
      financial_action_count: existing.financial_action_count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.issueId);
  if (error) return { ok: false, error: "Could not update the issue." };
  await admin.from("product_verification_events").insert({
    product_id: existing.product_id,
    actor_id: input.actorId,
    action: input.revokeAccess ? "entitlement_revocation_recorded" : "customer_issue_update",
    outcome: input.status,
    metadata: auditMetadata({
      financialActionCount: existing.financial_action_count ?? 0,
      accessRevoked: Boolean(input.revokeAccess),
      paymentAction: false,
    }),
  });
  return { ok: true };
}

export async function listCustomerIssues(limit = 20) {
  const admin = db();
  const { data, error } = await admin
    .from("product_customer_issues")
    .select("id, issue_type, status, details, created_at, financial_action_count, product_id, order_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

export async function loadPublicTrust(productId: string) {
  const admin = db();
  const { data: product } = await admin
    .from("products")
    .select("digital_verification_state, fulfillment_mode, buyer_license_summary, refund_policy_note, compatibility_notes, update_policy, content_language, digital_file_size, acquisition_model, vendor_id, vendors(verification_status)")
    .eq("id", productId)
    .maybeSingle();
  if (!product?.digital_verification_state) return null;
  const { data: license } = await admin
    .from("product_license_records")
    .select("status, expires_at, revoked_at")
    .eq("product_id", productId)
    .is("superseded_at", null)
    .maybeSingle();
  const { data: scan } = await admin
    .from("product_security_scans")
    .select("status, metadata")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { count } = await admin
    .from("product_review_decisions")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("to_state", "approved");
  const vendor = Array.isArray(product.vendors) ? product.vendors[0] : product.vendors;
  return {
    vendorVerificationStatus: vendor?.verification_status ?? null,
    licenseStatus: license?.status ?? null,
    licenseExpired: Boolean(license?.expires_at && new Date(license.expires_at).getTime() <= Date.now()) || license?.status === "expired",
    licenseRevoked: Boolean(license?.revoked_at) || license?.status === "revoked",
    scanStatus: scan?.status ?? null,
    scanBytesInspected: Boolean(scan?.metadata && typeof scan.metadata === "object" && (scan.metadata as { bytesInspected?: boolean }).bytesInspected === true),
    verificationState: product.digital_verification_state,
    humanApproved: (count ?? 0) > 0 && product.digital_verification_state === "published",
    fulfillment: product.fulfillment_mode,
    buyerLicenseSummary: product.buyer_license_summary,
    refundPolicyNote: product.refund_policy_note,
    compatibilityNotes: product.compatibility_notes,
    updatePolicy: product.update_policy,
    contentLanguage: product.content_language,
    fileSize: product.digital_file_size,
    acquisitionModel: product.acquisition_model,
  };
}
