import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAffiliateLink } from "@/lib/affiliate/campaigns";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";
import { generateAffiliateUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function requireAffiliate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!affiliate?.is_active) {
    return { error: NextResponse.json({ error: "Affiliate profile required" }, { status: 403 }) };
  }
  return { user, affiliate, supabase };
}

/** GET — list affiliate links for the signed-in creator. */
export async function GET(req: NextRequest) {
  const auth = await requireAffiliate();
  if ("error" in auth && auth.error) return auth.error;

  const includeInactive = req.nextUrl.searchParams.get("all") === "1";
  const client = createServiceRoleClient() as any;
  let query = client
    .from("affiliate_links")
    .select(
      "id, link_code, custom_slug, destination_url, full_url, commission_rate, total_clicks, unique_clicks, total_conversions, total_earnings, is_active, expires_at, created_at, product_id, products(id, name, slug, images, currency, price)"
    )
    .eq("affiliate_id", auth.affiliate!.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load affiliate links" }, { status: 400 });
  }

  const site = getSiteUrl();
  const links = (data ?? []).map((l: any) => ({
    id: l.id,
    linkCode: l.link_code,
    customSlug: l.custom_slug,
    destinationUrl: l.destination_url,
    fullUrl:
      l.full_url?.startsWith("http")
        ? l.full_url
        : generateAffiliateUrl(site, l.link_code),
    shortUrl: `${site}/ref/${l.link_code}`,
    commissionRate: l.commission_rate != null ? Number(l.commission_rate) : null,
    clicks: Number(l.total_clicks ?? 0),
    uniqueClicks: Number(l.unique_clicks ?? 0),
    conversions: Number(l.total_conversions ?? 0),
    earnings: Number(l.total_earnings ?? 0),
    isActive: Boolean(l.is_active),
    expiresAt: l.expires_at,
    createdAt: l.created_at,
    product: l.products
      ? {
          id: l.products.id,
          name: l.products.name,
          slug: l.products.slug,
          currency: l.products.currency,
          price: l.products.price != null ? Number(l.products.price) : null,
          images: l.products.images ?? null,
        }
      : null,
  }));

  return NextResponse.json({ links });
}

/** POST — create or reuse an affiliate short link (LNK-) for a product pick. */
export async function POST(req: NextRequest) {
  const auth = await requireAffiliate();
  if ("error" in auth && auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const productId =
    typeof body?.productId === "string" && body.productId.trim()
      ? body.productId.trim()
      : null;

  const client = createServiceRoleClient() as any;
  let destinationUrl =
    typeof body?.destinationUrl === "string" ? body.destinationUrl.trim() : "";
  let vendorId =
    typeof body?.vendorId === "string" ? body.vendorId : null;
  let commissionRate =
    body?.commissionRate != null && Number.isFinite(Number(body.commissionRate))
      ? Number(body.commissionRate)
      : null;

  if (productId) {
    const { data: product, error: productError } = await client
      .from("products")
      .select(
        "id, slug, vendor_id, status, is_active, deleted_at, affiliate_enabled, affiliate_commission_rate"
      )
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (
      product.deleted_at ||
      product.status !== "active" ||
      product.is_active === false
    ) {
      return NextResponse.json({ error: "Product is not available" }, { status: 400 });
    }
    if (!product.affiliate_enabled) {
      return NextResponse.json(
        { error: "Product is not available for affiliate promotion" },
        { status: 400 }
      );
    }
    if (!product.slug) {
      return NextResponse.json(
        { error: "Product is missing a storefront URL" },
        { status: 400 }
      );
    }

    const site = getSiteUrl();
    const canonicalDest = `${site}/marketplace/${product.slug}`;
    // Never trust a client destination that points away from this product.
    if (
      !destinationUrl ||
      !destinationUrl.includes(`/marketplace/${product.slug}`)
    ) {
      destinationUrl = canonicalDest;
    }
    vendorId = product.vendor_id ?? vendorId;
    if (commissionRate == null && product.affiliate_commission_rate != null) {
      commissionRate = Number(product.affiliate_commission_rate);
    }
  }

  if (!destinationUrl) {
    return NextResponse.json({ error: "destinationUrl is required" }, { status: 400 });
  }

  try {
    const link = await createAffiliateLink({
      affiliateId: auth.affiliate!.id,
      destinationUrl,
      productId,
      vendorId,
      campaignId: body?.campaignId ?? null,
      commissionRate,
    });

    if (typeof body?.customSlug === "string" && body.customSlug.trim()) {
      const slug = body.customSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 48);
      if (slug) {
        await client
          .from("affiliate_links")
          .update({ custom_slug: slug })
          .eq("id", link.id)
          .eq("affiliate_id", auth.affiliate!.id);
        link.custom_slug = slug;
      }
    }

    const site = getSiteUrl();
    const shortUrl = `${site}/ref/${link.link_code}`;
    return NextResponse.json({
      ok: true,
      picked: true,
      link: {
        ...link,
        short_url: shortUrl,
        full_url:
          link.full_url?.startsWith("http")
            ? link.full_url
            : generateAffiliateUrl(site, link.link_code),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not create affiliate link" },
      { status: 400 }
    );
  }
}
