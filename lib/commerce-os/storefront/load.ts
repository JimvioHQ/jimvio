import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeThemeSettings, type ThemeDraft, type ThemeSettings } from "../themes/registry";
import { cosTable } from "../db";

export type StorefrontStore = {
  id: string;
  vendor_id: string;
  name: string;
  handle: string;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  status: string;
  default_currency: string;
  theme_settings: ThemeSettings;
  theme_draft: ThemeDraft | null;
  announcement_bar: string | null;
  seo: Record<string, unknown>;
  social: Record<string, unknown>;
  settings: Record<string, unknown>;
};

export async function loadPublishedStoreByHandle(
  db: SupabaseClient,
  handle: string,
  opts?: { allowDraftForVendorId?: string | null; preview?: boolean }
): Promise<StorefrontStore | null> {
  let query = cosTable(db, "jimvio_stores").select("*").eq("handle", handle);
  const { data } = await query.maybeSingle();
  if (!data) return null;

  const isOwnerPreview =
    opts?.preview &&
    opts.allowDraftForVendorId &&
    data.vendor_id === opts.allowDraftForVendorId;

  if (data.status !== "published" && !isOwnerPreview) return null;

  const draft = (data.theme_draft as ThemeDraft) || null;
  const settings = mergeThemeSettings(
    data.theme_settings as Partial<ThemeSettings>,
    draft?.settings
  );

  return {
    id: data.id,
    vendor_id: data.vendor_id,
    name: data.name,
    handle: data.handle,
    description: data.description,
    logo_url: data.logo_url,
    favicon_url: data.favicon_url,
    status: data.status,
    default_currency: data.default_currency,
    theme_settings: settings,
    theme_draft: draft,
    announcement_bar: data.announcement_bar,
    seo: (data.seo as Record<string, unknown>) || {},
    social: (data.social as Record<string, unknown>) || {},
    settings: (data.settings as Record<string, unknown>) || {},
  };
}

export async function loadStoreProducts(
  db: SupabaseClient,
  storeId: string,
  opts?: { limit?: number; search?: string }
) {
  const { data: links } = await cosTable(db, "jimvio_store_products")
    .select("product_id, sort_order")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .limit(opts?.limit ?? 48);

  const ids = (links ?? []).map((l) => l.product_id);
  if (!ids.length) return [];

  let q = db
    .from("products")
    .select(
      "id, name, slug, price, compare_at_price, currency, images, short_description, inventory_quantity, track_inventory, status"
    )
    .in("id", ids)
    .eq("status", "active");

  if (opts?.search?.trim()) {
    q = q.ilike("name", `%${opts.search.trim()}%`);
  }

  const { data: products } = await q;
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export async function loadStoreProductBySlug(
  db: SupabaseClient,
  storeId: string,
  slug: string
) {
  const { data: product } = await db
    .from("products")
    .select(
      "id, name, slug, description, short_description, price, compare_at_price, currency, images, inventory_quantity, track_inventory, vendor_id, status"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!product || product.status !== "active") return null;

  const { data: link } = await cosTable(db, "jimvio_store_products")
    .select("id, status")
    .eq("store_id", storeId)
    .eq("product_id", product.id)
    .eq("status", "published")
    .maybeSingle();

  if (!link) return null;

  const { data: variants } = await db
    .from("product_variants")
    .select("id, sku, price, compare_at_price, inventory_quantity, attributes, cj_vid")
    .eq("product_id", product.id);

  return { product, variants: variants ?? [] };
}
