import { getVendorTokenByVendorId, buildShopifyHeaders, buildShopifyBaseUrl } from "@/lib/shopifyToken";
import { getPlatformShopifyVendorIdFromEnv, isPlatformShopifyEnvCredentialsComplete } from "@/lib/platform-shopify";
import { htmlToReadablePlainText } from "@/lib/htmlToPlainText";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface ShopifyProductRecord {
  id: number;
  title: string;
  handle: string;
  body_html?: string | null;
  status: string;
  /** Shopify "Product category" field (vendor-defined string); used to pick Jimvio `category_id`. */
  product_type?: string | null;
  tags?: string;
  images: Array<{ src: string }>;
  variants: Array<{
    id?: number;
    price?: string;
    sku?: string | null;
    inventory_quantity?: number;
  }>;
}

const DEFAULT_CATEGORY_SLUG = "electronics";

/** Normalized Shopify `product_type` token → Jimvio `product_categories.slug` (see seeds/001_categories.sql). */
const SHOPIFY_TYPE_SLUG_ALIASES: Record<string, string> = {
  apparel: "fashion",
  clothing: "fashion",
  footwear: "fashion",
  shoes: "fashion",
  accessories: "fashion",
  jewelry: "fashion",
  jewellery: "fashion",
  bags: "fashion",
  beauty: "health-beauty",
  cosmetics: "health-beauty",
  skincare: "health-beauty",
  makeup: "health-beauty",
  wellness: "health-beauty",
  health: "health-beauty",
  home: "home-garden",
  homeware: "home-garden",
  kitchen: "home-garden",
  garden: "home-garden",
  furniture: "home-garden",
  decor: "home-garden",
  bedding: "home-garden",
  food: "food-beverage",
  beverage: "food-beverage",
  groceries: "food-beverage",
  auto: "automotive",
  automotive: "automotive",
  tools: "industrial",
  machinery: "industrial",
  stationery: "office-supplies",
  office: "office-supplies",
  software: "software",
  ebook: "ebooks",
  ebooks: "ebooks",
  course: "courses",
  courses: "courses",
  template: "templates",
  templates: "templates",
  music: "music-audio",
  audio: "music-audio",
  photo: "photography",
  photography: "photography",
  art: "graphics-design",
  design: "graphics-design",
  agricultural: "agriculture",
  farm: "agriculture",
  building: "construction",
};

function normalizeShopifyProductType(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  return s
    .replace(/\s*&\s*/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Target `product_categories.slug` for this Shopify product type (existing seeded row, alias, or new Shopify slug). */
function categorySlugForShopifyType(raw: string | null | undefined, slugToId: Map<string, string>): string {
  const normalized = normalizeShopifyProductType(raw);
  if (!normalized) return DEFAULT_CATEGORY_SLUG;

  if (slugToId.has(normalized)) return normalized;

  const aliasSlug = SHOPIFY_TYPE_SLUG_ALIASES[normalized];
  if (aliasSlug && slugToId.has(aliasSlug)) return aliasSlug;

  for (const part of normalized.split("-").filter((p) => p.length >= 3)) {
    if (slugToId.has(part)) return part;
    const alias = SHOPIFY_TYPE_SLUG_ALIASES[part];
    if (alias && slugToId.has(alias)) return alias;
  }

  return normalized.length > 96 ? normalized.slice(0, 96).replace(/-+$/, "") : normalized;
}

async function loadCategorySlugToId(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("product_categories").select("id, slug").eq("is_active", true);
  if (error) throw new Error(`Categories load error: ${error.message}`);
  return new Map((data ?? []).map((c) => [c.slug, c.id]));
}

/** Insert missing `product_categories` rows so Shopify `product_type` labels appear on the platform. */
async function ensureCategoriesFromShopifyProductTypes(
  shopifyProducts: ShopifyProductRecord[],
  slugToId: Map<string, string>,
): Promise<Map<string, string>> {
  const displayBySlug = new Map<string, string>();
  for (const p of shopifyProducts) {
    const raw = p.product_type?.trim() ?? "";
    const slug = categorySlugForShopifyType(raw || null, slugToId);
    if (!slugToId.has(slug)) {
      const label = (raw || slug.replace(/-/g, " ")).slice(0, 120);
      displayBySlug.set(slug, label);
    }
  }

  if (displayBySlug.size === 0) return slugToId;

  const rows = [...displayBySlug.entries()].map(([slug, name]) => ({
    slug,
    name: name || slug,
    description: "Imported from Shopify product type",
    is_active: true,
    sort_order: 900,
    source: "shopify" as const,
    icon: "🛍️",
    color: "#64748b",
  }));

  const { error: upsertError } = await supabase.from("product_categories").upsert(rows, { onConflict: "slug" });
  if (upsertError) {
    const { error: fallbackErr } = await supabase
      .from("product_categories")
      .upsert(
        rows.map(({ source: _s, ...r }) => r),
        { onConflict: "slug" },
      );
    if (fallbackErr) throw new Error(`Shopify category upsert: ${upsertError.message} / ${fallbackErr.message}`);
  }

  return loadCategorySlugToId();
}

async function fetchShopifyProducts(shopDomain: string, accessToken: string, apiVersion: string) {
  const baseUrl = buildShopifyBaseUrl(shopDomain, apiVersion);
  const headers = buildShopifyHeaders(accessToken);
  const products: ShopifyProductRecord[] = [];
  let pageUrl: string | null = `${baseUrl}/products.json?limit=250&status=active`;

  while (pageUrl) {
    const response: Response = await fetch(pageUrl, { headers });
    if (!response.ok) throw new Error(`Shopify API error ${response.status}: ${await response.text()}`);
    const data = (await response.json()) as { products: ShopifyProductRecord[] };
    products.push(...data.products);
    const linkHeader: string = response.headers.get("Link") || "";
    const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = nextMatch?.[1] ?? null;
  }
  return products;
}

function transformToJimvioProduct(
  product: ShopifyProductRecord,
  vendorId: string,
  slugToId: Map<string, string>,
) {
  const variant = product.variants[0];
  const slug = `${product.handle}-${product.id}`;
  const plainDescription = htmlToReadablePlainText(product.body_html ?? "");
  const catSlug = categorySlugForShopifyType(product.product_type, slugToId);
  const categoryId = slugToId.get(catSlug);
  if (!categoryId) {
    throw new Error(`Missing product_categories row for slug "${catSlug}" after sync — check DB constraints.`);
  }

  return {
    vendor_id: vendorId,
    category_id: categoryId,
    name: product.title,
    slug,
    short_description: plainDescription.slice(0, 200),
    description: plainDescription,
    price: parseFloat(variant?.price ?? "0"),
    currency: "USD",
    sku: variant?.sku ?? null,
    inventory_quantity: variant?.inventory_quantity ?? 0,
    product_type: "physical" as const,
    status: product.status === "active" ? ("active" as const) : ("draft" as const),
    images: (product.images ?? []).map((img) => img.src),
    tags:
      product.tags
        ?.split(",")
        .map((t: string) => t.trim())
        .filter(Boolean) ?? [],
    shopify_product_id: String(product.id),
    shopify_variant_id: variant?.id ?? null,
    shopify_handle: product.handle,
    shopify_synced_at: new Date().toISOString(),
    source: "shopify",
    affiliate_enabled: false,
    influencer_enabled: false,
    is_active: true,
    track_inventory: true,
    requires_shipping: true,
    updated_at: new Date().toISOString(),
  };
}

export async function syncVendorShopifyProducts(vendorId: string) {
  const creds = await getVendorTokenByVendorId(vendorId);

  let slugToId = await loadCategorySlugToId();
  if (slugToId.size === 0) {
    throw new Error(
      "No active rows in product_categories — seed categories (e.g. database/seeds/001_categories.sql) before Shopify sync.",
    );
  }

  const shopifyProducts = await fetchShopifyProducts(creds.shopDomain, creds.accessToken, creds.apiVersion);

  slugToId = await ensureCategoriesFromShopifyProductTypes(shopifyProducts, slugToId);

  const transformed = shopifyProducts.map((p) => transformToJimvioProduct(p, vendorId, slugToId));

  for (let i = 0; i < transformed.length; i += 100) {
    const batch = transformed.slice(i, i + 100);
    const { error } = await supabase.from("products").upsert(batch, { onConflict: "slug" });
    if (error) throw new Error(`Product upsert error: ${error.message}`);
  }

  await supabase
    .from("shopify_credentials")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("vendor_id", vendorId);

  return { synced: transformed.length };
}

export async function syncAllShopifyVendors() {
  const ids = new Set<string>();
  const { data: vendors } = await supabase.from("shopify_credentials").select("vendor_id").eq("is_active", true);
  vendors?.forEach((v) => ids.add(v.vendor_id));
  const platformVid = getPlatformShopifyVendorIdFromEnv();
  if (platformVid && isPlatformShopifyEnvCredentialsComplete()) {
    ids.add(platformVid);
  }

  if (ids.size === 0) return { succeeded: 0, failed: 0 };

  const results = await Promise.allSettled([...ids].map((id) => syncVendorShopifyProducts(id)));

  return {
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}
