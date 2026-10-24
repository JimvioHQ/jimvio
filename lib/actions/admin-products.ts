// "use server";

// import { createClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";

// export async function searchAdminVendors(query: string) {
//   const supabase = await createClient();
//   // Basic admin check
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) return { success: false, error: "Unauthorized" };
  
//   // We should ideally check if the user is an admin.
//   // Assuming a generic check or let RLS handle it, but for admin actions, 
//   // service role or an admin table check is usually done.
//   // Here we'll just query the vendors.
//   const { data, error } = await supabase
//     .from("vendors")
//     .select("id, business_name, owner_email, verification_status, is_active")
//     .ilike("business_name", `%${query}%`)
//     .limit(10);

//   if (error) {
//     return { success: false, error: error.message };
//   }

//   return { success: true, vendors: data };
// }

// export async function moveProductToVendor(productId: string, newVendorId: string) {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) return { success: false, error: "Unauthorized" };

//   const { error } = await supabase
//     .from("products")
//     .update({ vendor_id: newVendorId })
//     .eq("id", productId);

//   if (error) {
//     return { success: false, error: error.message };
//   }

//   revalidatePath("/admin/products");
//   return { success: true };
// }

// lib/actions/admin-products.ts  — add bulk support

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/security";
import { assertPlatformAdmin, isUuid } from "@/lib/auth/platform-admin";
import { MAX_ADMIN_PRODUCT_MOVE } from "@/lib/security/destructive-limits";

async function assertAdminAccess() {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return { ok: true as const, user: auth.user };
}

export type AdminProductUpdateInput = {
  name: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  product_type: string;
  status: string;
  is_active: boolean;
  price: number;
  currency: string;
  pricing_type: string;
  billing_period?: string | null;
  category_id?: string | null;
  is_digital: boolean;
  requires_shipping: boolean;
  digital_file_url?: string | null;
  track_inventory: boolean;
  inventory_quantity: number;
  weight?: number | null;
  dimensions?: string | null;
  affiliate_enabled: boolean;
  affiliate_commission_rate?: number | null;
  is_featured: boolean;
  button_text?: string | null;
  tags?: string[] | null;
  images?: string[];
  show_author?: boolean;
  show_reviews?: boolean;
  enable_discussions?: boolean;
  compare_at_price?: number | null;
  discount_label?: string | null;
  is_flash_deal?: boolean;
};

export async function getAdminProductForEdit(
  productId: string
): Promise<ActionResult<{ product: Record<string, unknown> }>> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Product not found." };

  return { success: true, data: { product: data } };
}

export async function updateAdminProduct(
  productId: string,
  input: AdminProductUpdateInput
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.name.trim()) {
    return { success: false, error: "Product name is required." };
  }

  const admin = createAdminClient();
  const { data: existing, error: fetchErr } = await admin
    .from("products")
    .select("source, source_metadata")
    .eq("id", productId)
    .maybeSingle();

  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!existing) return { success: false, error: "Product not found." };

  const { error } = await admin
    .from("products")
    .update({
      name: input.name.trim(),
      slug: input.slug.trim(),
      short_description: input.short_description ?? null,
      description: input.description ?? null,
      product_type: input.product_type,
      status: input.status,
      is_active: input.is_active,
      price: input.price,
      currency: input.currency,
      pricing_type: input.pricing_type,
      billing_period: input.billing_period ?? null,
      category_id: input.category_id ?? null,
      is_digital: input.is_digital,
      requires_shipping: input.requires_shipping,
      digital_file_url: input.digital_file_url ?? null,
      track_inventory: input.track_inventory,
      inventory_quantity: input.inventory_quantity,
      weight: input.weight ?? null,
      dimensions: input.dimensions ?? null,
      affiliate_enabled: input.affiliate_enabled,
      affiliate_commission_rate: input.affiliate_commission_rate ?? null,
      is_featured: input.is_featured,
      button_text: input.button_text ?? null,
      tags: input.tags ?? null,
      images: input.images ?? [],
      show_author: input.show_author ?? true,
      show_reviews: input.show_reviews ?? true,
      enable_discussions: input.enable_discussions ?? false,
      compare_at_price: input.compare_at_price ?? null,
      discount_label: input.discount_label?.trim() || null,
      is_flash_deal: input.is_flash_deal ?? false,
      source_metadata: existing.source_metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}

export async function publishAdminProduct(
  productId: string
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const adminAny = admin as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
        };
      };
    };
  };
  let productResult = await adminAny
    .from("products")
    .select("images, status, is_digital, digital_verification_state")
    .eq("id", productId)
    .maybeSingle();
  const schemaMissing = Boolean(productResult.error && /digital_verification_state/i.test(productResult.error.message));
  if (schemaMissing) {
    productResult = await adminAny.from("products").select("images, status, is_digital").eq("id", productId).maybeSingle();
  }
  const { data: product, error: fetchErr } = productResult;

  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!product) return { success: false, error: "Product not found." };

  const images = Array.isArray(product.images)
    ? product.images.filter((x): x is string => typeof x === "string" && x.startsWith("http"))
    : [];

  if (images.length === 0) {
    return { success: false, error: "Product has no images — add images before publishing." };
  }

  const verificationState = (product as { digital_verification_state?: string | null }).digital_verification_state;
  const isDigital = (product as { is_digital?: boolean | null }).is_digital === true;
  if (isDigital && (schemaMissing || verificationState !== "published")) {
    return {
      success: false,
      error: schemaMissing
        ? "Digital publishing is blocked until migration 168 is applied. This product was not published."
        : "This digital listing was not published. A null or incomplete verification state is not approval. Use Digital review after a byte-level scan and human approval.",
    };
  }

  const { error } = await admin
    .from("products")
    .update({ status: "active", is_active: true, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/products");
  return { success: true };
}

export async function getCJImportedMap(): Promise<
  ActionResult<{ map: Record<string, string> }>
> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cj_product_map")
    .select("cj_pid, product_id");

  if (error) return { success: false, error: error.message };

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.cj_pid && row.product_id) {
      map[row.cj_pid] = row.product_id;
    }
  }

  return { success: true, data: { map } };
}

export async function searchAdminVendors(query: string) {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const safe = String(query ?? "")
    .replace(/[%_,()\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!safe) return { success: true, vendors: [] };

  try {
    const admin = createAdminClient();
    const pattern = `%${safe}%`;
    const select =
      "id, business_name, business_slug, business_email, verification_status, is_active, profiles(email, avatar_url)";
    const [byName, byEmail] = await Promise.all([
      admin.from("vendors").select(select).ilike("business_name", pattern).limit(20),
      admin.from("vendors").select(select).ilike("business_email", pattern).limit(20),
    ]);
    if (byName.error) return { success: false, error: byName.error.message };
    if (byEmail.error) return { success: false, error: byEmail.error.message };
    const merged = new Map<string, any>();
    for (const row of [...(byName.data ?? []), ...(byEmail.data ?? [])]) {
      merged.set(row.id, row);
    }
    const vendors = [...merged.values()].slice(0, 20).map((v: any) => ({
      ...v,
      owner_email: v.profiles?.email ?? v.business_email ?? "",
      avatar_url:  v.profiles?.avatar_url ?? null,
    }));
    return { success: true, vendors };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ✅ Now accepts one OR many product IDs
export async function moveProductToVendor(
  productIds: string | string[],
  vendorId: string
) {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!isUuid(vendorId)) return { success: false, error: "Invalid vendor id" };

  try {
    const ids = (Array.isArray(productIds) ? productIds : [productIds]).filter(isUuid);
    if (ids.length === 0) return { success: false, error: "No products selected" };
    if (ids.length > MAX_ADMIN_PRODUCT_MOVE) {
      return { success: false, error: `At most ${MAX_ADMIN_PRODUCT_MOVE} products can be moved at once.` };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("products")
      .update({ vendor_id: vendorId })
      .in("id", ids);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/products");
    return { success: true, count: ids.length };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}