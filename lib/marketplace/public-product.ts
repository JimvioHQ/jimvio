/**
 * What a buyer's browser may receive about a product.
 *
 * Product pages and search results used to ship the whole database row to the
 * client: purchase cost, the pricing policy, supplier ids and names, admin and
 * review fields. This module is the single gate: internal fields are removed,
 * supplier metadata is reduced to the few neutral facts the storefront renders,
 * and the supplier source is replaced by a neutral alias.
 *
 * Server code (cart, checkout, fulfilment) keeps reading the database row and is
 * not affected.
 */

/** Neutral name the browser sees for supplier-fulfilled products. */
export const PUBLIC_FULFILLED_SOURCE = "partner";

/** True for products fulfilled through a supplier, whether the raw row or the public copy. */
export function isFulfilledSource(source: string | null | undefined): boolean {
  return source === "cj" || source === PUBLIC_FULFILLED_SOURCE;
}

const INTERNAL_PRODUCT_KEYS = [
  "cost_price",
  "sale_count",
  "sold_count",
  "view_count",
  "wishlist_count",
  "claimed_pct",
  "review_notes",
  "submitted_for_review_at",
  "published_by_admin_override",
  "override_reason",
  "override_user",
  "override_time",
  "auto_unpublished",
  "auto_unpublish_reason",
  "auto_unpublished_at",
  "verification_assignee_id",
  "approved_file_digest",
  "file_digest",
  "digital_file_url",
  "digital_file_size",
  "declarations_accepted_at",
  "acquisition_model",
  "fulfillment_mode",
  "shopify_product_id",
  "shopify_variant_id",
  "shopify_handle",
  "shopify_synced_at",
  "cj_last_synced_at",
  "cj_vid",
  "cj_pid",
  // camelCase shapes used by ranking/intelligence payloads
  "costPrice",
  "supplierCost",
  "supplierCostUsd",
  "saleCount",
  "soldCount",
  "viewCount",
  "wishlistCount",
  "cjVid",
  "cjPid",
  "sourceMetadata",
] as const;

type Meta = Record<string, unknown>;

function asMeta(value: unknown): Meta {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Meta) : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Only facts the storefront shows. Supplier ids, names, categories, raw
 * (often Chinese) titles, costs and pricing policies are never included.
 */
export function publicSourceMetadata(raw: unknown): Meta {
  const meta = asMeta(raw);
  const out: Meta = {};
  const keep = (key: string, value: unknown) => {
    if (value !== null && value !== undefined && value !== "") out[key] = value;
  };
  keep("brand", str(meta.brand));
  keep("material", str(meta.material));
  keep("package_size", str(meta.package_size));
  if (Array.isArray(meta.package_includes)) keep("package_includes", meta.package_includes.filter((v) => typeof v === "string"));
  if (Array.isArray(meta.feature_bullets)) keep("feature_bullets", meta.feature_bullets.filter((v) => typeof v === "string"));
  if (Array.isArray(meta.features)) keep("features", meta.features);
  if (Array.isArray(meta.options)) keep("options", meta.options);
  keep("preview_url", str(meta.preview_url));
  // Shipping facts, under neutral names (read by lib/shipping/regional-shipping).
  keep("ships_from", str(meta.ships_from) ?? str(meta.cj_ships_from) ?? str(meta.cj_source_from));
  keep("processing_days", num(meta.processing_days) ?? num(meta.cj_delivery_cycle));
  keep("shipping_days", num(meta.shipping_days) ?? num(meta.cj_shipping_days));
  if (meta.free_shipping === true || meta.cj_is_free_shipping === true) out.free_shipping = true;
  if (meta.has_tracking === true || meta.cj_has_tracking === true) out.has_tracking = true;
  // Storefront signals.
  if (meta.trending === true || (meta.cj_trending === true && meta.trend_classification !== "cj_order_count")) out.trending = true;
  if (meta.verified === true || meta.cj_supplier_verified === true) out.verified = true;
  const videos = Array.isArray(meta.videos) ? meta.videos : Array.isArray(meta.cj_videos) ? meta.cj_videos : null;
  if (videos?.length) {
    out.has_video = true;
    out.videos = videos;
  }
  return out;
}

function cleanText(copy: Record<string, unknown>) {
  // Products have a slug; variants do not (their names drive option matching, so they stay as-is).
  if (!("slug" in copy)) return;
  if (typeof copy.name === "string") copy.name = cleanProductTitle(copy.name);
  if (typeof copy.description === "string") copy.description = cleanSupplierDescription(copy.description);
  if (typeof copy.short_description === "string") copy.short_description = cleanSupplierDescription(copy.short_description);
}

function publicRow<T extends object>(row: T): T {
  const copy = { ...(row as Record<string, unknown>) };
  for (const key of INTERNAL_PRODUCT_KEYS) delete copy[key];
  if ("source_metadata" in copy) copy.source_metadata = publicSourceMetadata(copy.source_metadata);
  if ("sourceMetadata" in copy) delete copy.sourceMetadata;
  if (copy.source === "cj") copy.source = PUBLIC_FULFILLED_SOURCE;
  cleanText(copy);
  return copy as T;
}

/** Public copy of a product (and its variants) for any page or API a buyer can reach. */
export function toPublicProduct<T extends object>(product: T): T {
  const copy = publicRow(product) as Record<string, unknown>;
  if (Array.isArray(copy.product_variants)) copy.product_variants = copy.product_variants.map((v) => (v && typeof v === "object" ? publicRow(v as object) : v));
  if (Array.isArray(copy.variants)) copy.variants = copy.variants.map((v) => (v && typeof v === "object" ? publicRow(v as object) : v));
  return copy as T;
}

function looksLikeProduct(value: Record<string, unknown>): boolean {
  // Anything that carries an internal product field is cleaned, product or variant.
  if ("source_metadata" in value) return true;
  return INTERNAL_PRODUCT_KEYS.some((key) => key in value);
}

/**
 * Deep variant for API responses and page props whose shape varies
 * (sections, rankings, collections). Every product-like object found is
 * reduced with the same rules as toPublicProduct.
 */
export function toPublicPayload<T>(value: T, depth = 0): T {
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => toPublicPayload(item, depth + 1)) as T;
  const record = value as Record<string, unknown>;
  const base = looksLikeProduct(record) ? (publicRow(record) as Record<string, unknown>) : { ...record };
  for (const [key, child] of Object.entries(base)) {
    if (key === "source_metadata") continue;
    if (child && typeof child === "object") base[key] = toPublicPayload(child, depth + 1);
  }
  return base as T;
}

const SUPPLIER_SENTENCE = /[^.!?<>\n]*(manual measurement|please allow|due to the (different )?(light|monitor|display)|colou?r difference|slight (colou?r|size) (difference|deviation)|1-3 ?cm (error|deviation)|actual (item|product) may be slightly different|dropship|wholesale|factory direct|alibaba|aliexpress|1688|taobao)[^.!?<>\n]*[.!?]?/gi;
const CJK_RUN = /[　-〿㐀-䶿一-鿿＀-￯]+/g;

/** Removes supplier catalog boilerplate and stray Chinese text from a buyer-facing description. */
export function cleanSupplierDescription(html: string | null | undefined): string | null {
  if (typeof html !== "string") return html ?? null;
  const cleaned = html
    .replace(SUPPLIER_SENTENCE, " ")
    .replace(CJK_RUN, " ")
    .replace(/<(p|li|div|span)[^>]*>\s*(note\s*:?)?\s*<\/\1>/gi, "")
    .replace(/[ \t]{2,}/g, " ");
  return cleaned;
}

const TITLE_NOISE = /\b(wholesale|cross-?border|foreign trade|hot sale|hot selling|new arrival|new style|best seller|factory direct|amazon|ebay|tiktok|in stock)\b/gi;

/** Removes catalog marketing noise from a product title (display only; the stored name is unchanged). */
export function cleanProductTitle(name: string | null | undefined): string | null {
  if (typeof name !== "string") return name ?? null;
  const cleaned = name.replace(CJK_RUN, " ").replace(TITLE_NOISE, " ").replace(/\s{2,}/g, " ").replace(/^[\s,;:/-]+|[\s,;:/-]+$/g, "").trim();
  return cleaned.length >= 3 ? cleaned : name.trim();
}
