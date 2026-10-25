/**
 * Reorders one already filtered marketplace page.
 * Shipping groups come only from product_shipping_options rows.
 * Missing rows stay neutral. They are not described as fast local shipping.
 * Pagination stays on the original query, so a later page is not pulled forward.
 */

import { normalizeCountryCode } from "@/lib/geo/buyer-country";

export type MarketplaceRankProduct = {
  id: string;
  view_count?: number | null;
  rating?: number | null;
  sale_count?: number | null;
  is_digital?: boolean | null;
  product_type?: string | null;
  vendors?:
    | { business_country?: string | null }
    | Array<{ business_country?: string | null }>
    | null;
};

export type ShippingRankRow = {
  product_id: string;
  ship_to_country?: string | null;
  min_delivery_days?: number | null;
  is_active?: boolean | null;
};

export type ShippingCoverage = "country" | "global" | "unavailable" | "unknown";

export function shouldLocationRankMarketplace(input: {
  sort: string | null | undefined;
  country: string | null | undefined;
  offset: number;
  limit: number;
  affiliate?: boolean;
}): boolean {
  if (input.affiliate) return false;
  if (!normalizeCountryCode(input.country)) return false;
  const sort = input.sort || "trending";
  if (sort !== "trending") return false;
  return input.offset >= 0 && input.limit >= 1;
}

function sellerCountry(vendors: MarketplaceRankProduct["vendors"]): string | null {
  const row = Array.isArray(vendors) ? vendors[0] : vendors;
  return normalizeCountryCode(row?.business_country);
}

function isDigital(product: MarketplaceRankProduct): boolean {
  if (product.is_digital === true) return true;
  return Boolean(product.product_type && product.product_type !== "physical");
}

export function shippingCoverageForProduct(
  rows: ShippingRankRow[],
  country: string,
): { coverage: ShippingCoverage; minDeliveryDays: number | null } {
  const destination = normalizeCountryCode(country);
  const active = rows.filter((row) => row.is_active !== false);
  if (!destination || active.length === 0) {
    return { coverage: "unknown", minDeliveryDays: null };
  }
  const countryRows = active.filter(
    (row) => normalizeCountryCode(row.ship_to_country) === destination,
  );
  const globalRows = active.filter((row) => {
    const code = row.ship_to_country?.trim().toUpperCase();
    return code === "*" || code === "GLOBAL";
  });
  const chosen = countryRows.length ? countryRows : globalRows;
  if (!chosen.length) return { coverage: "unavailable", minDeliveryDays: null };
  const days = chosen
    .map((row) => row.min_delivery_days)
    .filter((day): day is number => typeof day === "number" && Number.isFinite(day) && day >= 0);
  return {
    coverage: countryRows.length ? "country" : "global",
    minDeliveryDays: days.length ? Math.min(...days) : null,
  };
}

function groupOf(coverage: ShippingCoverage, digital: boolean): number {
  if (coverage === "country") return 0;
  if (coverage === "global") return 1;
  if (coverage === "unknown" || digital) return 2;
  return 3;
}

/**
 * Claim text for a future badge. Discovery UI does not render this.
 * Unknown and unavailable stay silent so the catalog cannot promise shipping.
 */
export function shippingClaim(coverage: ShippingCoverage): string | null {
  if (coverage === "country") return "A listing shipping option includes this destination.";
  if (coverage === "global") return "A listing shipping option is marked global. Delivery time is an estimate when present.";
  return null;
}

export function rankMarketplacePool<T extends MarketplaceRankProduct>(
  products: T[],
  country: string | null | undefined,
  shippingRows: ShippingRankRow[],
): T[] {
  const destination = normalizeCountryCode(country);
  if (!destination) return products;
  const byProduct = new Map<string, ShippingRankRow[]>();
  for (const row of shippingRows) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }

  return [...products].sort((a, b) => {
    const left = shippingCoverageForProduct(byProduct.get(a.id) ?? [], destination);
    const right = shippingCoverageForProduct(byProduct.get(b.id) ?? [], destination);
    const group = groupOf(left.coverage, isDigital(a)) - groupOf(right.coverage, isDigital(b));
    if (group !== 0) return group;

    const coverage = left.coverage;
    if (coverage === "country" || coverage === "global") {
      const leftDays = left.minDeliveryDays ?? Number.POSITIVE_INFINITY;
      const rightDays = right.minDeliveryDays ?? Number.POSITIVE_INFINITY;
      if (leftDays !== rightDays) return leftDays - rightDays;
      const leftDomestic = sellerCountry(a.vendors) === destination ? 1 : 0;
      const rightDomestic = sellerCountry(b.vendors) === destination ? 1 : 0;
      if (leftDomestic !== rightDomestic) return rightDomestic - leftDomestic;
    }

    const views = Number(b.view_count ?? 0) - Number(a.view_count ?? 0);
    if (views !== 0) return views;
    const rating = Number(b.rating ?? 0) - Number(a.rating ?? 0);
    if (rating !== 0) return rating;
    const sales = Number(b.sale_count ?? 0) - Number(a.sale_count ?? 0);
    if (sales !== 0) return sales;
    return a.id.localeCompare(b.id);
  });
}
