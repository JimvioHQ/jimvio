import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mergeThemeSettings,
  defaultHomeSections,
  type ThemeDraft,
  type ThemeSettings,
  type ThemeSection,
} from "../themes/registry";
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
  /** Published sections only — never draft on public paths */
  published_sections: {
    home: ThemeSection[];
    product?: ThemeSection[];
    collection?: ThemeSection[];
    cart?: ThemeSection[];
  };
  /** Draft for owner preview only */
  theme_draft: ThemeDraft | null;
  announcement_bar: string | null;
  seo: Record<string, unknown>;
  social: Record<string, unknown>;
  settings: Record<string, unknown>;
};

function resolvePublishedTheme(
  data: Record<string, unknown>,
  opts?: { useDraft?: boolean }
): {
  settings: ThemeSettings;
  sections: StorefrontStore["published_sections"];
  draft: ThemeDraft | null;
} {
  const draft = (data.theme_draft as ThemeDraft) || null;
  const published = (data.published_theme as ThemeDraft | null) || null;

  if (opts?.useDraft && draft) {
    return {
      settings: mergeThemeSettings(
        data.theme_settings as Partial<ThemeSettings>,
        draft.settings
      ),
      sections: {
        home:
          draft.sections?.home?.length
            ? draft.sections.home
            : defaultHomeSections(String(data.name || "Store")),
        product: draft.sections?.product,
        collection: draft.sections?.collection,
        cart: draft.sections?.cart,
      },
      draft,
    };
  }

  const pubSettings = published?.settings || (data.theme_settings as Partial<ThemeSettings>);
  const home =
    published?.sections?.home?.length
      ? published.sections.home
      : defaultHomeSections(String(data.name || "Store"));

  return {
    settings: mergeThemeSettings(pubSettings, null),
    sections: {
      home,
      product: published?.sections?.product,
      collection: published?.sections?.collection,
      cart: published?.sections?.cart,
    },
    draft,
  };
}

export async function loadPublishedStoreByHandle(
  db: SupabaseClient,
  handle: string,
  opts?: { allowDraftForVendorId?: string | null; preview?: boolean }
): Promise<StorefrontStore | null> {
  const { data } = await cosTable(db, "jimvio_stores")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();
  if (!data) return null;

  const isOwnerPreview =
    Boolean(opts?.preview) &&
    Boolean(opts?.allowDraftForVendorId) &&
    data.vendor_id === opts?.allowDraftForVendorId;

  if (data.status !== "published" && !isOwnerPreview) return null;

  const resolved = resolvePublishedTheme(data, { useDraft: isOwnerPreview });

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
    theme_settings: resolved.settings,
    published_sections: resolved.sections,
    theme_draft: resolved.draft,
    announcement_bar: data.announcement_bar,
    seo: (data.seo as Record<string, unknown>) || {},
    social: (data.social as Record<string, unknown>) || {},
    settings: (data.settings as Record<string, unknown>) || {},
  };
}

export async function loadPublishedStoreByHostname(
  db: SupabaseClient,
  hostname: string
): Promise<StorefrontStore | null> {
  const host = hostname.toLowerCase().split(":")[0];
  if (!host) return null;

  const { data: domain } = await cosTable(db, "jimvio_store_domains")
    .select("store_id, verification_status")
    .eq("hostname", host)
    .maybeSingle();

  // Only serve custom hosts that are verified (jimvio subdomains may be pending until DNS)
  if (!domain?.store_id) return null;
  if (
    domain.verification_status !== "verified" &&
    domain.verification_status !== "pending"
  ) {
    return null;
  }
  // Custom domains must be verified; jimvio_subdomain can serve while pending
  // (path fallback still works). We only auto-route verified custom domains.
  if (domain.verification_status !== "verified") {
    // Allow jimvio_subdomain pending via explicit kind check
    const { data: full } = await cosTable(db, "jimvio_store_domains")
      .select("kind, verification_status")
      .eq("hostname", host)
      .maybeSingle();
    if (
      !(
        full?.kind === "jimvio_subdomain" ||
        full?.verification_status === "verified"
      )
    ) {
      return null;
    }
  }

  const { data } = await cosTable(db, "jimvio_stores")
    .select("*")
    .eq("id", domain.store_id)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;

  const resolved = resolvePublishedTheme(data);
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
    theme_settings: resolved.settings,
    published_sections: resolved.sections,
    theme_draft: resolved.draft,
    announcement_bar: data.announcement_bar,
    seo: (data.seo as Record<string, unknown>) || {},
    social: (data.social as Record<string, unknown>) || {},
    settings: (data.settings as Record<string, unknown>) || {},
  };
}

export async function loadStoreProducts(
  db: SupabaseClient,
  storeId: string,
  opts?: {
    limit?: number;
    search?: string;
    sort?: "manual" | "newest" | "price_asc" | "price_desc";
  }
) {
  const sort = opts?.sort || "manual";
  const { data: links } = await cosTable(db, "jimvio_store_products")
    .select("product_id, sort_order, published_at, created_at")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order(
      sort === "newest" ? "published_at" : "sort_order",
      { ascending: sort === "newest" ? false : true }
    )
    .limit(Math.min(Math.max(opts?.limit ?? 48, 1), 48));

  const ids = (links ?? []).map((l: { product_id: string }) => l.product_id);
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
  let ordered = ids.map((id: string) => byId.get(id)).filter(Boolean);

  if (sort === "price_asc" || sort === "price_desc") {
    ordered = [...ordered].sort((a, b) => {
      const pa = Number((a as { price?: number }).price ?? 0);
      const pb = Number((b as { price?: number }).price ?? 0);
      return sort === "price_asc" ? pa - pb : pb - pa;
    });
  }

  return ordered;
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
    .select(
      "id, name, sku, price, compare_at_price, inventory_quantity, attributes, options, image_url, cj_vid, is_active"
    )
    .eq("product_id", product.id)
    .eq("is_active", true);

  return { product, variants: variants ?? [] };
}
