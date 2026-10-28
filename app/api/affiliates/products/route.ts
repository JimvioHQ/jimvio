import { NextRequest, NextResponse } from "next/server";
import { getAffiliateDiscoveryProducts } from "@/services/affiliates";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { mapAffiliateSpotlightProduct } from "@/lib/affiliate/spotlight-product";
import { listPickedAffiliateProductIds } from "@/lib/affiliate/picked-products";
import { affiliatePageHasMore, affiliateProductWindow } from "@/lib/affiliate/catalog-feed";
import {
  normalizeAffiliateSearch,
  parseAffiliateDiscoveryCategory,
} from "@/lib/affiliate/discovery";

export const dynamic = "force-dynamic";

/**
 * GET /api/affiliates/products?limit=&offset=&category=&q=
 * Paginated affiliate-eligible catalog for Affiliate Center discovery.
 * `q` matches name, slug, and short description across every category.
 * `category` applies only when `q` is empty. Commission rates are computed
 * on the server. Client rate params are ignored.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = affiliateProductWindow(
    Number(sp.get("offset") ?? 0),
    Number(sp.get("limit") ?? 10),
  );
  const { limit, offset } = page;
  const rawCategory = sp.get("category");
  const category = rawCategory ? parseAffiliateDiscoveryCategory(rawCategory) : null;
  if (rawCategory && !category) {
    return NextResponse.json({ error: "Unknown affiliate category" }, { status: 400 });
  }
  const search = normalizeAffiliateSearch(sp.get("q"));

  try {
    const [settings, result] = await Promise.all([
      getResolvedPlatformSettings(),
      getAffiliateDiscoveryProducts({
        category,
        search,
        limit,
        offset,
      }),
    ]);

    const defaultRate = settings.fees.default_affiliate_commission_percent;
    const mapped = (result.products ?? []).map((p) =>
      mapAffiliateSpotlightProduct(
        p as Parameters<typeof mapAffiliateSpotlightProduct>[0],
        defaultRate,
      ),
    );
    const total = Number(result.total ?? 0);
    const hasMore = affiliatePageHasMore({
      offset,
      returned: mapped.length,
      limit,
      total,
    });
    const pickedProductIds = await listPickedAffiliateProductIds(mapped.map((product) => product.id));

    return NextResponse.json({
      products: mapped,
      total,
      limit,
      offset,
      nextOffset: offset + mapped.length,
      hasMore,
      pickedProductIds,
      category,
      q: search,
    });
  } catch (err) {
    console.error("[api/affiliates/products]", err);
    return NextResponse.json(
      { error: "Could not load affiliate products" },
      { status: 500 },
    );
  }
}
