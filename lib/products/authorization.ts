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

export function isBusinessVerified(vendor: Pick<VendorAuthSnapshot, "verification_status"> | null | undefined): boolean {
  return String(vendor?.verification_status || "").toLowerCase() === "verified";
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
      message: "Business verification is required to sell physical products on Jimvio.",
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
