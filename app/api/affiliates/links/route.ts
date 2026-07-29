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
      "id, link_code, custom_slug, destination_url, full_url, commission_rate, total_clicks, unique_clicks, total_conversions, total_earnings, is_active, expires_at, created_at, product_id, products(id, name, slug, images, currency)"
    )
    .eq("affiliate_id", auth.affiliate!.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
        }
      : null,
  }));

  return NextResponse.json({ links });
}

/** POST — create an affiliate short link (LNK-). */
export async function POST(req: NextRequest) {
  const auth = await requireAffiliate();
  if ("error" in auth && auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const destinationUrl =
    typeof body?.destinationUrl === "string" ? body.destinationUrl.trim() : "";
  if (!destinationUrl) {
    return NextResponse.json({ error: "destinationUrl is required" }, { status: 400 });
  }

  try {
    const link = await createAffiliateLink({
      affiliateId: auth.affiliate!.id,
      destinationUrl,
      productId: body?.productId ?? null,
      vendorId: body?.vendorId ?? null,
      campaignId: body?.campaignId ?? null,
      commissionRate:
        body?.commissionRate != null ? Number(body.commissionRate) : null,
    });

    if (typeof body?.customSlug === "string" && body.customSlug.trim()) {
      const slug = body.customSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 48);
      if (slug) {
        const client = createServiceRoleClient() as any;
        await client
          .from("affiliate_links")
          .update({ custom_slug: slug })
          .eq("id", link.id)
          .eq("affiliate_id", auth.affiliate!.id);
        link.custom_slug = slug;
      }
    }

    return NextResponse.json({ ok: true, link });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create link" },
      { status: 400 }
    );
  }
}
