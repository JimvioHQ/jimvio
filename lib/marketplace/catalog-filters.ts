/**
 * Marketplace listing filters that correspond to stored product fields.
 * Trending uses sale_count, the cached completed-sales counter.
 * Fast shipping uses delivery_time only. A missing value is not fast.
 * Digital public listings require digital_verification_state = published.
 * AI-powered means the AI & Automation category family, not every digital product.
 */

export const DIGITAL_VERIFIED_STATE = "published";

/** Parent slug for the AI & Automation category and its children. */
export const AI_CATEGORY_SLUG = "digital-ai-automation";

export const FAST_SHIPPING_DELIVERY_VALUES = ["fast", "1", "2", "3", "4", "5", "6", "7"] as const;

export function isFastShippingDelivery(value: string | null | undefined): boolean {
  const text = (value ?? "").trim().toLowerCase();
  if (!text) return false;
  if (text === "fast") return true;
  if (!/^\d+$/.test(text)) return false;
  const days = Number(text);
  return days >= 1 && days <= 7;
}

export function hasTrendingSales(saleCount: number | string | null | undefined): boolean {
  const count = typeof saleCount === "number" ? saleCount : Number(saleCount);
  return Number.isFinite(count) && count > 0;
}

export function isVerifiedDigitalListing(state: string | null | undefined): boolean {
  return state === DIGITAL_VERIFIED_STATE;
}

export function isAiCategorySlug(slug: string | null | undefined): boolean {
  const text = (slug ?? "").trim().toLowerCase();
  return text === AI_CATEGORY_SLUG || text.startsWith("digital-ai-");
}

type ScopedQuery = {
  eq: (column: string, value: string) => ScopedQuery;
  gt: (column: string, value: number) => ScopedQuery;
  gte: (column: string, value: string) => ScopedQuery;
  in: (column: string, values: readonly string[]) => ScopedQuery;
  order: (column: string, options: { ascending: boolean; nullsFirst?: boolean }) => ScopedQuery;
};

export function applyDigitalVerification<T extends ScopedQuery>(query: T, type: "physical" | "digital"): T {
  if (type !== "digital") return query;
  return query.eq("digital_verification_state", DIGITAL_VERIFIED_STATE) as T;
}

export function applyFastShipping<T extends ScopedQuery>(query: T): T {
  return query.in("delivery_time", FAST_SHIPPING_DELIVERY_VALUES) as T;
}

export function applyTrendingSales<T extends ScopedQuery>(query: T): T {
  return query.gt("sale_count", 0).order("sale_count", { ascending: false, nullsFirst: false }) as T;
}

/** Secondary browse order. Call this after applyTrendingSales so sales stay primary. */
export function applyBrowseViewOrder<T extends ScopedQuery>(query: T): T {
  return query.order("view_count", { ascending: false, nullsFirst: false }) as T;
}

export function isVerificationColumnError(error: { message?: string } | null | undefined): boolean {
  return /digital_verification_state/i.test(error?.message ?? "");
}
