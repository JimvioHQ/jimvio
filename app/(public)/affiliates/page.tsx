import type { Metadata } from "next";
import { AffiliatesMarketingPage } from "@/components/affiliate/affiliates-marketing-page";
import {
  getAffiliateById,
  getAffiliateDiscoveryProducts,
  getAffiliateSpotlightProducts,
} from "@/services/affiliates";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { createClient } from "@/lib/supabase/server";
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

async function loadAffiliateHeroCta(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "/register?role=affiliate";
    const affiliateRow = await getAffiliateById(user.id);
    return affiliateRow && affiliateRow.is_active !== false
      ? "/affiliates/dashboard"
      : "/activate/affiliate";
  } catch (err) {
    console.error("[affiliates] hero cta", err);
    return "/register?role=affiliate";
  }
}

async function loadAffiliateHeroRate(defaultRate: number): Promise<number> {
  try {
    const spotlight = await getAffiliateSpotlightProducts(10);
    const topRate = (spotlight.products ?? []).reduce((max, product) => {
      const mapped = mapAffiliateSpotlightProduct(
        product as Parameters<typeof mapAffiliateSpotlightProduct>[0],
        defaultRate,
      );
      return Math.max(max, mapped.rate);
    }, 0);
    return topRate > 0 ? topRate : defaultRate;
  } catch (err) {
    console.error("[affiliates] hero rate", err);
    return defaultRate;
  }
}

async function loadAffiliateDiscovery(input: {
  category: AffiliateDiscoveryCategoryId;
  search: string;
  defaultRate: number;
}) {
  try {
    const result = await getAffiliateDiscoveryProducts({
      category: input.category,
      search: input.search,
      limit: 10,
      offset: 0,
    });
    const products = (result.products ?? []).map((product) =>
      mapAffiliateSpotlightProduct(
        product as Parameters<typeof mapAffiliateSpotlightProduct>[0],
        input.defaultRate,
      ),
    );
    return {
      products,
      total: Number(result.total ?? 0),
      pickedProductIds: await listPickedAffiliateProductIds(products.map((product) => product.id)),
      loadError: null as string | null,
    };
  } catch (err) {
    console.error("[affiliates] discovery", err);
    return {
      products: [] as ReturnType<typeof mapAffiliateSpotlightProduct>[],
      total: null as number | null,
      pickedProductIds: [] as string[],
      loadError: "Could not load affiliate products",
    };
  }
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
  const defaultRate = settings.fees.default_affiliate_commission_percent;

  const [primaryCtaHref, heroRate, discovery] = await Promise.all([
    loadAffiliateHeroCta(),
    loadAffiliateHeroRate(defaultRate),
    loadAffiliateDiscovery({ category, search, defaultRate }),
  ]);
  const { products, total, pickedProductIds, loadError } = discovery;

  return (
    <AffiliatesMarketingPage
      category={category}
      search={search}
      replaceUrl={replaceUrl}
      products={products}
      total={total}
      pickedProductIds={pickedProductIds}
      loadError={loadError}
      heroRate={heroRate}
      primaryCtaHref={primaryCtaHref}
      categoryChosen={Boolean(requested)}
    />
  );
}
