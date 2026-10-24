"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { slugify } from "@/lib/utils";
import {
  assertCanCreateProductType,
  businessVerificationCustomerStatus,
  initialStatusForVendorSubmit,
  isBusinessVerified,
  toProductTypeBucket,
  type ProductTypeBucket,
  type VendorAuthSnapshot,
} from "@/lib/products/authorization";
import { configuredMaxFileBytes } from "@/lib/digital-products/trust/files";
import { assessSubmission } from "@/lib/digital-products/trust/policy";
import type { AcquisitionModel, SubmissionInput } from "@/lib/digital-products/trust/types";

/** Loaded only for a digital save. Keeps the service-role client off unrelated imports. */
function verificationRuntime() {
  return import("@/lib/digital-products/trust/service");
}

export type SellerProductUpsertInput = {
  id?: string;
  name: string;
  slug?: string;
  short_description?: string | null;
  description?: string | null;
  /** UI bucket */
  product_type: ProductTypeBucket;
  /** Optional digital subtype written to products.product_type when digital */
  product_subtype?: string | null;
  price: number;
  currency?: string;
  pricing_type?: string | null;
  billing_period?: string | null;
  category_id?: string | null;
  digital_file_url?: string | null;
  track_inventory?: boolean;
  inventory_quantity?: number;
  weight?: number | null;
  dimensions?: string | null;
  affiliate_enabled?: boolean;
  affiliate_commission_rate?: number | null;
  is_featured?: boolean;
  button_text?: string | null;
  tags?: string[] | null;
  images?: string[];
  show_author?: boolean;
  show_reviews?: boolean;
  enable_discussions?: boolean;
  compare_at_price?: number | null;
  discount_label?: string | null;
  is_flash_deal?: boolean;
  /** draft | submit — submit enters pending_review */
  intent: "draft" | "submit";
  acquisition_model?: AcquisitionModel | null;
  affiliate_destination_url?: string | null;
  rightsholder_name?: string | null;
  buyer_license_summary?: string | null;
  refund_policy_note?: string | null;
  compatibility_notes?: string | null;
  update_policy?: string | null;
  content_language?: string | null;
  intended_audience?: string | null;
  declarations_accepted?: boolean;
  file_name?: string | null;
  file_mime?: string | null;
  file_size_bytes?: number | null;
  evidence_url?: string | null;
  evidence_file_name?: string | null;
};

function fileNameFromUrl(url?: string | null): string {
  try {
    return decodeURIComponent(new URL(url || "").pathname.split("/").pop() || "");
  } catch {
    return "";
  }
}

function mimeFromName(name: string, fallback?: string | null): string | null {
  if (fallback && fallback !== "application/octet-stream") return fallback;
  const ext = name.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    zip: "application/zip",
    epub: "application/epub+zip",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    txt: "text/plain",
    csv: "text/csv",
  };
  return (ext && map[ext]) || fallback || null;
}

function digitalSubmission(input: SellerProductUpsertInput): SubmissionInput {
  const fileName = input.file_name || fileNameFromUrl(input.digital_file_url);
  return {
    intent: input.intent,
    name: input.name,
    description: input.description ?? null,
    categoryId: input.category_id ?? null,
    acquisitionModel: input.acquisition_model ?? "original_vendor_product",
    fulfillmentMode: input.acquisition_model === "affiliate_only_product" ? "affiliate_redirect" : "download",
    affiliateDestinationUrl: input.affiliate_destination_url ?? null,
    rightsholderName: input.rightsholder_name ?? null,
    buyerLicenseSummary: input.buyer_license_summary ?? null,
    declarationsAccepted: Boolean(input.declarations_accepted),
    fileName: fileName || null,
    fileMime: mimeFromName(fileName, input.file_mime),
    fileSizeBytes: input.file_size_bytes ?? null,
    fileUrl: input.digital_file_url ?? null,
    evidenceUrl: input.evidence_url ?? null,
    evidenceFileName: input.evidence_file_name ?? null,
    duplicateDigest: false,
    refundPolicyNote: input.refund_policy_note ?? null,
    compatibilityNotes: input.compatibility_notes ?? null,
    updatePolicy: input.update_policy ?? null,
    contentLanguage: input.content_language ?? null,
    intendedAudience: input.intended_audience ?? null,
  };
}

export type SellerProductUpsertResult =
  | { success: true; id: string; status: string; message: string }
  | { success: false; error: string; code?: string };

async function loadVendor(userId: string): Promise<VendorAuthSnapshot | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("id, user_id, is_active, verification_status")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as VendorAuthSnapshot | null) ?? null;
}

/** Ensure every authenticated user can sell digital — light seller row if missing. */
export async function ensureSellerVendor(userId: string): Promise<VendorAuthSnapshot | null> {
  const existing = await loadVendor(userId);
  if (existing) return existing;

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, username, email")
    .eq("id", userId)
    .maybeSingle();

  const display =
    String(profile?.full_name || profile?.username || profile?.email || "Jimvio Seller").trim() ||
    "Jimvio Seller";
  const baseSlug = slugify(display) || `seller-${userId.slice(0, 8)}`;
  let businessSlug = baseSlug;
  const { data: clash } = await admin
    .from("vendors")
    .select("id")
    .eq("business_slug", businessSlug)
    .maybeSingle();
  if (clash) businessSlug = `${baseSlug}-${userId.slice(0, 6)}`;

  const { data: inserted, error } = await admin
    .from("vendors")
    .insert({
      user_id: userId,
      business_name: display,
      business_slug: businessSlug,
      verification_status: "pending",
      is_active: true,
    })
    .select("id, user_id, is_active, verification_status")
    .single();

  if (error || !inserted) {
    console.error("[ensureSellerVendor]", error?.message || "insert failed");
    return null;
  }
  return inserted as VendorAuthSnapshot;
}

export async function getSellerUploadContext(): Promise<{
  authenticated: boolean;
  vendor: VendorAuthSnapshot | null;
  businessVerified: boolean;
  canSellPhysical: boolean;
  businessStatus: ReturnType<typeof businessVerificationCustomerStatus>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      authenticated: false,
      vendor: null,
      businessVerified: false,
      canSellPhysical: false,
      businessStatus: businessVerificationCustomerStatus(null),
    };
  }
  const vendor = await ensureSellerVendor(user.id);
  const businessVerified = isBusinessVerified(vendor);
  const businessStatus = businessVerificationCustomerStatus(vendor?.verification_status);
  return {
    authenticated: true,
    vendor,
    businessVerified,
    canSellPhysical: businessVerified,
    businessStatus,
  };
}

export async function upsertSellerProduct(
  input: SellerProductUpsertInput,
): Promise<SellerProductUpsertResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized", code: "unauthenticated" };

  const vendor = await ensureSellerVendor(user.id);
  const auth = assertCanCreateProductType(user.id, vendor, input.product_type);
  if (!auth.ok) {
    return { success: false, error: auth.message, code: auth.code };
  }
  const seller = auth.vendor;
  const sellerUserId = user.id;

  const isDigital = input.product_type === "digital";
  const resolvedType =
    isDigital && input.product_subtype && input.product_subtype.trim()
      ? input.product_subtype.trim()
      : isDigital
        ? "digital"
        : "physical";

  // Prevent Digital → Physical bypass on edit
  if (input.id) {
    const { data: existing } = await supabase
      .from("products")
      .select("id, vendor_id, product_type, status")
      .eq("id", input.id)
      .maybeSingle();
    if (!existing || existing.vendor_id !== seller.id) {
      return { success: false, error: "Product not found.", code: "not_found" };
    }
    const existingBucket = toProductTypeBucket(existing.product_type);
    if (existingBucket === "digital" && input.product_type === "physical") {
      const gate = assertCanCreateProductType(sellerUserId, seller, "physical");
      if (!gate.ok) {
        return { success: false, error: gate.message, code: gate.code };
      }
    }
  }

  const trustReady = isDigital
    ? await (await verificationRuntime()).verificationSchemaReady()
    : false;
  if (isDigital && !trustReady) {
    return {
      success: false,
      error: "Digital listings cannot be saved until verification storage is available. Apply migration 168. Nothing was published.",
      code: "verification_unavailable",
    };
  }
  if (isDigital && trustReady) {
    const assessed = assessSubmission(
      digitalSubmission(input),
      configuredMaxFileBytes(process.env.DIGITAL_PRODUCT_MAX_BYTES),
    );
    if (input.intent === "submit" && !assessed.ok) {
      return { success: false, error: assessed.errors[0] || "The submission is incomplete.", code: "verification" };
    }
  } else if (isDigital && input.intent === "submit" && !input.digital_file_url) {
    return {
      success: false,
      error: "Add a digital file or access URL before submitting for review.",
      code: "digital_file_required",
    };
  }

  if (!input.category_id && input.intent === "submit") {
    return { success: false, error: "Select a category before submitting.", code: "category_required" };
  }

  const status = initialStatusForVendorSubmit(input.intent);
  const name = input.name.trim();
  if (name.length < 3) {
    return { success: false, error: "Product title must be at least 3 characters." };
  }
  if (!(input.price >= 0)) {
    return { success: false, error: "Price cannot be negative." };
  }

  let slug = (input.slug || slugify(name)).trim() || slugify(name);
  const { data: slugClash } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (slugClash && slugClash.id !== input.id) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const payload = {
    name,
    slug,
    short_description: input.short_description || null,
    description: input.description || null,
    product_type: resolvedType,
    price: input.price,
    currency: input.currency || "USD",
    pricing_type: isDigital ? input.pricing_type || "one_time" : "one_time",
    billing_period:
      isDigital && input.pricing_type === "recurring" ? input.billing_period || null : null,
    category_id: input.category_id || null,
    is_digital: isDigital,
    requires_shipping: !isDigital,
    digital_file_url: isDigital ? input.digital_file_url || null : null,
    track_inventory: !isDigital && Boolean(input.track_inventory),
    inventory_quantity: isDigital ? 0 : Number(input.inventory_quantity || 0),
    weight: !isDigital ? input.weight ?? null : null,
    dimensions: !isDigital ? input.dimensions || null : null,
    affiliate_enabled: Boolean(input.affiliate_enabled),
    affiliate_commission_rate: input.affiliate_enabled
      ? input.affiliate_commission_rate ?? 10
      : null,
    is_featured: false, // never allow self-feature
    button_text: input.button_text || null,
    tags: input.tags || null,
    images: input.images || [],
    show_author: input.show_author ?? true,
    show_reviews: input.show_reviews ?? true,
    enable_discussions: input.enable_discussions ?? false,
    compare_at_price: input.compare_at_price ?? null,
    discount_label: input.discount_label || null,
    is_flash_deal: Boolean(input.is_flash_deal),
    status,
    is_active: status === "pending_review" || status === "draft",
    vendor_id: seller.id,
    source: "vendor",
    submitted_for_review_at: input.intent === "submit" ? new Date().toISOString() : null,
    // Force unpublished until approved — marketplace requires status=active
    published_at: null,
  };

  if (trustReady && isDigital) {
    Object.assign(payload, {
      acquisition_model: input.acquisition_model || "original_vendor_product",
      fulfillment_mode: input.acquisition_model === "affiliate_only_product" ? "affiliate_redirect" : "download",
      affiliate_destination_url: input.affiliate_destination_url || null,
      rightsholder_name: input.rightsholder_name || null,
      digital_verification_state: input.intent === "submit" ? "submitted" : "draft",
      buyer_license_summary: input.buyer_license_summary || null,
      refund_policy_note: input.refund_policy_note || null,
      compatibility_notes: input.compatibility_notes || null,
      update_policy: input.update_policy || null,
      content_language: input.content_language || null,
      intended_audience: input.intended_audience || null,
      declarations_accepted_at: input.declarations_accepted ? new Date().toISOString() : null,
    });
  }

  async function recordTrust(productId: string): Promise<string | null> {
    if (!isDigital || !trustReady) return null;
    const { engageProductVerification } = await verificationRuntime();
    const recorded = await engageProductVerification({
      productId,
      vendorId: seller.id,
      actorUserId: sellerUserId,
      submission: digitalSubmission(input),
    });
    if (!recorded.ok) return recorded.error;
    if (input.intent === "submit" && recorded.scanStatus === "unavailable") {
      return "SUBMITTED_UNSCANNED";
    }
    return null;
  }

  // Strip fields clients must never force to active/published
  if (input.intent === "submit") {
    (payload as { status: string }).status = "pending_review";
    (payload as { is_active: boolean }).is_active = true;
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("products")
      .update(payload as never)
      .eq("id", input.id)
      .eq("vendor_id", seller.id)
      .select("id, status")
      .single();
    if (error) {
      console.error("[upsertSellerProduct] update", error.message);
      return { success: false, error: "Could not save product." };
    }
    const trustNote = await recordTrust(data.id);
    if (trustNote && trustNote !== "SUBMITTED_UNSCANNED") {
      return { success: false, error: trustNote, code: "verification" };
    }
    revalidatePath("/seller/products");
    revalidatePath("/marketplace/new");
    return {
      success: true,
      id: data.id,
      status: data.status as string,
      message:
        trustNote === "SUBMITTED_UNSCANNED"
          ? "Submitted for review. No malware scanner is configured, so this file cannot be published until scanning is available and a reviewer approves it."
          : input.intent === "submit"
            ? "Submitted for review. It can be published only after the required checks and a reviewer approval."
            : "Draft saved.",
    };
  }

  const { data, error } = await supabase
    .from("products")
    .insert(payload as never)
    .select("id, status")
    .single();

  if (error) {
    console.error("[upsertSellerProduct] insert", error.message);
    // Fallback via service role if RLS blocks pending_review before types refresh
    const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: adminErr } = await admin
      .from("products")
      .insert({ ...payload, vendor_id: seller.id })
      .select("id, status")
      .single();
    if (adminErr || !inserted) {
      return { success: false, error: "Could not create product." };
    }
    const trustNote = await recordTrust(inserted.id);
    if (trustNote && trustNote !== "SUBMITTED_UNSCANNED") {
      return { success: false, error: trustNote, code: "verification" };
    }
    revalidatePath("/seller/products");
    return {
      success: true,
      id: inserted.id,
      status: inserted.status,
      message:
        trustNote === "SUBMITTED_UNSCANNED"
          ? "Submitted for review. No malware scanner is configured, so this file cannot be published until scanning is available and a reviewer approves it."
          : input.intent === "submit"
            ? "Submitted for review. It can be published only after the required checks and a reviewer approval."
            : "Draft saved.",
    };
  }

  const trustNote = await recordTrust(data.id);
  if (trustNote && trustNote !== "SUBMITTED_UNSCANNED") {
    return { success: false, error: trustNote, code: "verification" };
  }
  revalidatePath("/seller/products");
  revalidatePath("/marketplace/new");
  return {
    success: true,
    id: data.id,
    status: data.status as string,
    message:
      trustNote === "SUBMITTED_UNSCANNED"
        ? "Submitted for review. No malware scanner is configured, so this file cannot be published until scanning is available and a reviewer approves it."
        : input.intent === "submit"
          ? "Submitted for review. It can be published only after the required checks and a reviewer approval."
          : "Draft saved.",
  };
}

export async function duplicateSellerProduct(
  productId: string,
): Promise<SellerProductUpsertResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized", code: "unauthenticated" };

  const vendor = await ensureSellerVendor(user.id);
  if (!vendor) {
    return { success: false, error: "A seller account is required.", code: "vendor_required" };
  }

  const { data: source, error: fetchErr } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("vendor_id", vendor.id)
    .maybeSingle();
  if (fetchErr || !source) {
    return { success: false, error: "Product not found.", code: "not_found" };
  }

  const bucket = toProductTypeBucket(source.product_type);
  const auth = assertCanCreateProductType(user.id, vendor, bucket);
  if (!auth.ok) {
    return { success: false, error: auth.message, code: auth.code };
  }

  return upsertSellerProduct({
    name: `${String(source.name || "Product").trim() || "Product"} (Copy)`,
    short_description: source.short_description,
    description: source.description,
    product_type: bucket,
    product_subtype: bucket === "digital" ? source.product_type : null,
    price: Number(source.price || 0),
    currency: source.currency || "USD",
    pricing_type: source.pricing_type,
    billing_period: source.billing_period,
    category_id: source.category_id,
    digital_file_url: source.digital_file_url,
    track_inventory: Boolean(source.track_inventory),
    inventory_quantity: Number(source.inventory_quantity || 0),
    weight: source.weight,
    dimensions: typeof source.dimensions === "string" ? source.dimensions : null,
    affiliate_enabled: Boolean(source.affiliate_enabled),
    affiliate_commission_rate: source.affiliate_commission_rate,
    button_text: source.button_text,
    tags: Array.isArray(source.tags)
      ? source.tags.filter((tag): tag is string => typeof tag === "string")
      : null,
    images: Array.isArray(source.images)
      ? source.images.filter((url): url is string => typeof url === "string")
      : [],
    show_author: source.show_author ?? true,
    show_reviews: source.show_reviews ?? true,
    enable_discussions: Boolean(source.enable_discussions),
    compare_at_price: source.compare_at_price,
    discount_label: source.discount_label,
    is_flash_deal: Boolean(source.is_flash_deal),
    intent: "draft",
  });
}
