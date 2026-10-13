import {
  affiliatePlainText,
  deriveAffiliateBenefits,
  extractSafeDescriptionImages,
  isSafeProductImageUrl,
} from "@/lib/affiliate/rich-content";
import {
  AFFILIATE_PROMOTION_ASSETS,
  type AffiliateAuthoritativeContext,
} from "@/lib/ai/affiliate-workspace";
import {
  DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  PLATFORM_CURRENCY,
  estimateAffiliateCommissionUsd,
  toPlatformUsd,
} from "@/lib/currency/platform";
import { getSiteUrl } from "@/lib/site-url";

export type AffiliateProductSource = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  short_description?: string | null;
  price?: number | null;
  currency?: string | null;
  images?: unknown;
  features?: string[] | null;
  affiliate_enabled?: boolean | null;
  affiliate_commission_rate?: number | null;
  affiliate_price?: number | null;
  product_type?: string | null;
  product_categories?: { name?: string | null } | { name?: string | null }[] | null;
};

export function affiliateCategoryName(row: AffiliateProductSource): string {
  const categories = row.product_categories;
  const named = Array.isArray(categories) ? categories[0]?.name : categories?.name;
  return named || row.product_type || "General";
}

function collectImageUrls(images: unknown, description: string): string[] {
  const urls: string[] = [];
  const push = (value: unknown) => {
    if (typeof value !== "string") return;
    const url = value.trim();
    if (!isSafeProductImageUrl(url) || urls.includes(url) || urls.length >= 4) return;
    urls.push(url);
  };
  let list: unknown[] = [];
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images) as unknown;
      list = Array.isArray(parsed) ? parsed : [images];
    } catch {
      list = [images];
    }
  } else if (Array.isArray(images)) {
    list = images;
  }
  for (const item of list) {
    if (typeof item === "string") push(item);
    else if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      push(record.url ?? record.src ?? record.image_url);
    }
  }
  for (const url of extractSafeDescriptionImages(description)) push(url);
  return urls;
}

/**
 * Builds promotion context from a database row.
 * Client-supplied prices and commissions are intentionally not parameters.
 */
export function assembleAffiliateProductContext(
  row: AffiliateProductSource,
  options: {
    defaultCommissionPercent?: number;
    trackingPath?: string | null;
    assetTypes?: string[];
    platform?: string | null;
    siteUrl?: string;
  } = {},
): AffiliateAuthoritativeContext | null {
  if (!row.affiliate_enabled || !row.id || !row.slug || !row.name?.trim()) return null;
  const site = (options.siteUrl ?? getSiteUrl()).replace(/\/$/, "");
  const descriptionSource = row.description || row.short_description || "";
  const description = affiliatePlainText(descriptionSource).slice(0, 700);
  const benefits = deriveAffiliateBenefits(descriptionSource, row.features ?? []);
  const price = toPlatformUsd(Number(row.price ?? 0), row.currency);
  const commissionPercent = Number(
    row.affiliate_commission_rate ?? options.defaultCommissionPercent ?? DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  );
  const fixed = row.affiliate_price != null ? toPlatformUsd(Number(row.affiliate_price), row.currency) : 0;
  const estimated =
    fixed > 0 ? fixed : estimateAffiliateCommissionUsd(price, commissionPercent).amount;
  const trackingPath = options.trackingPath?.trim() || null;
  return {
    productId: row.id,
    slug: row.slug,
    name: row.name.trim(),
    description,
    benefits,
    productUrl: `${site}/marketplace/${row.slug}`,
    trackingUrl: trackingPath ? `${site}${trackingPath.startsWith("/") ? trackingPath : `/${trackingPath}`}` : null,
    commissionPercent,
    price,
    currency: PLATFORM_CURRENCY,
    estimatedEarning: estimated,
    imageUrls: collectImageUrls(row.images, descriptionSource),
    assetTypes: (options.assetTypes?.length ? options.assetTypes : [...AFFILIATE_PROMOTION_ASSETS]).slice(0, 16),
    platform: options.platform?.trim() || null,
  };
}

export function promotionInputFromContext(
  context: AffiliateAuthoritativeContext & { category: string },
): {
  productName: string;
  category: string;
  price: number;
  currency: string;
  commissionRate: number;
  features: string[];
  description: string;
} {
  return {
    productName: context.name,
    category: context.category || "General",
    price: context.price,
    currency: context.currency,
    commissionRate: context.commissionPercent,
    features: context.benefits,
    description: context.description,
  };
}
