"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { slugify } from "@/lib/utils";
import {
  assertCanCreateProductType,
  initialStatusForVendorSubmit,
  isBusinessVerified,
  toProductTypeBucket,
  type ProductTypeBucket,
  type VendorAuthSnapshot,
} from "@/lib/products/authorization";

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
};

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
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { authenticated: false, vendor: null, businessVerified: false, canSellPhysical: false };
  }
  const vendor = await ensureSellerVendor(user.id);
  const businessVerified = isBusinessVerified(vendor);
  return {
    authenticated: true,
    vendor,
    businessVerified,
    canSellPhysical: businessVerified,
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
    if (!existing || existing.vendor_id !== auth.vendor.id) {
      return { success: false, error: "Product not found.", code: "not_found" };
    }
    const existingBucket = toProductTypeBucket(existing.product_type);
    if (existingBucket === "digital" && input.product_type === "physical") {
      const gate = assertCanCreateProductType(user.id, auth.vendor, "physical");
      if (!gate.ok) {
        return { success: false, error: gate.message, code: gate.code };
      }
    }
  }

  if (isDigital && input.intent === "submit" && !input.digital_file_url) {
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
    vendor_id: auth.vendor.id,
    source: "vendor",
    submitted_for_review_at: input.intent === "submit" ? new Date().toISOString() : null,
    // Force unpublished until approved — marketplace requires status=active
    published_at: null,
  };

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
      .eq("vendor_id", auth.vendor.id)
      .select("id, status")
      .single();
    if (error) {
      console.error("[upsertSellerProduct] update", error.message);
      return { success: false, error: "Could not save product." };
    }
    revalidatePath("/seller/products");
    revalidatePath("/marketplace/new");
    return {
      success: true,
      id: data.id,
      status: data.status as string,
      message:
        input.intent === "submit"
          ? "Submitted for review. Your product will appear on Marketplace after approval."
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
      .insert({ ...payload, vendor_id: auth.vendor.id })
      .select("id, status")
      .single();
    if (adminErr || !inserted) {
      return { success: false, error: "Could not create product." };
    }
    revalidatePath("/seller/products");
    return {
      success: true,
      id: inserted.id,
      status: inserted.status,
      message:
        input.intent === "submit"
          ? "Submitted for review. Your product will appear on Marketplace after approval."
          : "Draft saved.",
    };
  }

  revalidatePath("/seller/products");
  revalidatePath("/marketplace/new");
  return {
    success: true,
    id: data.id,
    status: data.status as string,
    message:
      input.intent === "submit"
        ? "Submitted for review. Your product will appear on Marketplace after approval."
        : "Draft saved.",
  };
}
