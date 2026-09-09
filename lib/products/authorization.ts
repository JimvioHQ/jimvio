/**
 * Canonical product-type authorization for Jimvio upload/create/update.
 * DIGITAL — any authenticated seller (vendor row).
 * PHYSICAL — requires vendors.verification_status === "verified" (business verification).
 * Personal identity_verified is NOT sufficient for physical products.
 */

export type ProductTypeBucket = "digital" | "physical";

export type VendorAuthSnapshot = {
  id: string;
  user_id: string;
  is_active: boolean | null;
  verification_status: string | null;
};

export type ProductCreateAuthResult =
  | { ok: true; vendor: VendorAuthSnapshot }
  | { ok: false; code: "unauthenticated" | "vendor_required" | "business_verification_required" | "vendor_inactive"; message: string };

export function isPhysicalProductType(productType: string | null | undefined): boolean {
  const t = String(productType || "").toLowerCase();
  return t === "physical";
}

export function isDigitalProductType(productType: string | null | undefined): boolean {
  if (!productType) return true;
  return !isPhysicalProductType(productType);
}

/**
 * Only final approved business verification unlocks Physical products.
 * Personal KYC / identity_verified must NEVER be passed here as a substitute.
 */
export function isBusinessVerified(vendor: Pick<VendorAuthSnapshot, "verification_status"> | null | undefined): boolean {
  const s = String(vendor?.verification_status || "").trim().toLowerCase();
  return s === "verified" || s === "approved";
}

/** Customer-facing business verification label (never expose internal codes). */
export function businessVerificationCustomerStatus(
  vendorStatus: string | null | undefined,
): {
  key: "not_started" | "in_progress" | "in_review" | "verified" | "failed" | "expired";
  label: string;
  verified: boolean;
} {
  const s = String(vendorStatus || "").trim().toLowerCase();
  if (s === "verified" || s === "approved") {
    return { key: "verified", label: "Business verified", verified: true };
  }
  if (s === "rejected" || s === "declined" || s === "failed") {
    return { key: "failed", label: "Business verification required", verified: false };
  }
  if (s === "pending" || s === "in_progress" || s === "processing" || s === "resubmitted") {
    return { key: "in_progress", label: "Business verification in progress", verified: false };
  }
  if (s === "in_review" || s === "under_review") {
    return { key: "in_review", label: "Business verification in review", verified: false };
  }
  if (s === "suspended" || s === "revoked" || s === "expired" || s === "cancelled" || s === "canceled") {
    return { key: "expired", label: "Business verification required", verified: false };
  }
  return { key: "not_started", label: "Business verification required", verified: false };
}

/** Resolve UI bucket from DB product_type enum (includes subtypes). */
export function toProductTypeBucket(productType: string | null | undefined): ProductTypeBucket {
  return isPhysicalProductType(productType) ? "physical" : "digital";
}

/**
 * Server-side gate for creating or converting to a product type.
 */
export function assertCanCreateProductType(
  userId: string | null | undefined,
  vendor: VendorAuthSnapshot | null | undefined,
  productType: ProductTypeBucket,
): ProductCreateAuthResult {
  if (!userId) {
    return { ok: false, code: "unauthenticated", message: "Sign in to create a product." };
  }
  if (!vendor) {
    return {
      ok: false,
      code: "vendor_required",
      message: "A seller account is required before you can upload products.",
    };
  }
  if (vendor.is_active === false) {
    return {
      ok: false,
      code: "vendor_inactive",
      message: "Your seller account is inactive.",
    };
  }
  if (productType === "physical" && !isBusinessVerified(vendor)) {
    return {
      ok: false,
      code: "business_verification_required",
      message: "Business verification required",
    };
  }
  return { ok: true, vendor };
}

/** New vendor-submitted products enter review — never auto-publish as active. */
export function initialStatusForVendorSubmit(intent: "draft" | "submit"): "draft" | "pending_review" {
  return intent === "submit" ? "pending_review" : "draft";
}

export function canAppearOnMarketplace(status: string | null | undefined, isActive: boolean | null | undefined): boolean {
  return status === "active" && isActive !== false;
}
