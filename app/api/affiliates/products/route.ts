import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/services/products";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { mapAffiliateSpotlightProduct } from "@/lib/affiliate/spotlight-product";
import { getSessionAffiliate } from "@/lib/affiliate/access";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { affiliatePageHasMore, affiliateProductWindow } from "@/lib/affiliate/catalog-feed";

export const dynamic = "force-dynamic";

/**
 * GET /api/affiliates/products?limit=&offset=
 * Paginated affiliate-eligible catalog for Affiliate Center discovery.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = affiliateProductWindow(
    Number(sp.get("offset") ?? 0),
    Number(sp.get("limit") ?? 10),
  );
  const { limit, offset } = page;

  try {
    const [settings, result] = await Promise.all([
      getResolvedPlatformSettings(),
      getProducts({
        affiliate: true,
        limit,
        offset,
        sort: "sales",
      }),
    ]);

    const defaultRate = settings.fees.default_affiliate_commission_percent;
    const mapped = (result.products ?? []).map((p) =>
      mapAffiliateSpotlightProduct(
        p as Parameters<typeof mapAffiliateSpotlightProduct>[0],
        defaultRate
      )
    );
    const total = Number(result.total ?? 0);
    const hasMore = affiliatePageHasMore({
      offset,
      returned: mapped.length,
      limit,
      total,
    });

    let pickedProductIds: string[] = [];
    try {
      const affiliate = await getSessionAffiliate({ requireActive: true });
      if (affiliate && mapped.length) {
        const admin = createServiceRoleClient();
        const { data: links } = await admin
          .from("affiliate_links")
          .select("product_id")
          .eq("affiliate_id", affiliate.id)
          .eq("is_active", true)
          .in(
            "product_id",
            mapped.map((p) => p.id)
          );
        pickedProductIds = [
          ...new Set(
            (links ?? [])
              .map((l) => l.product_id)
              .filter((id): id is string => Boolean(id))
          ),
        ];
      }
    } catch {
      pickedProductIds = [];
    }

    return NextResponse.json({
      products: mapped,
      total,
      limit,
      offset,
      nextOffset: offset + mapped.length,
      hasMore,
      pickedProductIds,
    });
  } catch (err) {
    console.error("[api/affiliates/products]", err);
    return NextResponse.json(
      { error: "Could not load affiliate products" },
      { status: 500 }
    );
  }
}
