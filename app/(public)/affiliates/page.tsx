import type { Metadata } from "next";
import { AffiliatesMarketingPage } from "@/components/affiliate/affiliates-marketing-page";
import { getAffiliateDiscoveryProducts } from "@/services/affiliates";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { pageMetadata } from "@/lib/seo";
import { mapAffiliateSpotlightProduct } from "@/lib/affiliate/spotlight-product";
import { listPickedAffiliateProductIds } from "@/lib/affiliate/picked-products";
import {
  affiliateDiscoveryHref,
  normalizeAffiliateSearch,
  parseAffiliateDiscoveryCategory,
  type AffiliateDiscoveryCategoryId,
} from "@/lib/affiliate/discovery";

export const metadata: Metadata = pageMetadata("affiliates");

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawCategory = firstParam(params.category);
  const requested = parseAffiliateDiscoveryCategory(rawCategory);
  const search = normalizeAffiliateSearch(firstParam(params.q));
  const category: AffiliateDiscoveryCategoryId = requested ?? "featured";
  const replaceUrl = rawCategory && !requested ? affiliateDiscoveryHref(category, search) : null;
  const settings = await getResolvedPlatformSettings();

  let products: ReturnType<typeof mapAffiliateSpotlightProduct>[] = [];
  let total: number | null = null;
  let loadError: string | null = null;
  let pickedProductIds: string[] = [];

  try {
    const result = await getAffiliateDiscoveryProducts({
      category,
      search,
      limit: 10,
      offset: 0,
    });
    products = (result.products ?? []).map((product) =>
      mapAffiliateSpotlightProduct(
        product as Parameters<typeof mapAffiliateSpotlightProduct>[0],
        settings.fees.default_affiliate_commission_percent,
      ),
    );
    total = Number(result.total ?? 0);
    pickedProductIds = await listPickedAffiliateProductIds(products.map((product) => product.id));
  } catch (err) {
    console.error("[affiliates] discovery", err);
    loadError = "Could not load affiliate products";
  }

  return (
    <AffiliatesMarketingPage
      category={category}
      search={search}
      replaceUrl={replaceUrl}
      products={products}
      total={total}
      pickedProductIds={pickedProductIds}
      loadError={loadError}
    />
  );
}
