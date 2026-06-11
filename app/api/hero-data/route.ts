import { NextResponse } from "next/server";
import { getAdminDB } from "@/services/base";

export const revalidate = 30; // revalidate every 30 seconds

export async function GET() {
  try {
    const db = await getAdminDB();

    const [productRes, campaignRes, saleRes, communityRes, statsRes] = await Promise.all([
      // Trending product
      db
        .from("products")
        .select("id, name, slug, price, currency, images, sale_count, rating")
        .eq("status", "active")
        .eq("is_active", true)
        .order("sale_count", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Active UGC campaign with highest rate
      db
        .from("ugc_campaigns")
        .select("id, title, campaign_type, rate_per_1k_views, total_budget")
        .eq("status", "active")
        .order("rate_per_1k_views", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Most recent completed order (for "just sold" notification)
      db
        .from("orders")
        .select("id, total_amount, currency, created_at, shipping_address")
        .in("status", ["completed", "confirmed", "delivered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Top community by member count
      db
        .from("communities")
        .select("id, name, slug, member_count, avatar_url, tagline")
        .eq("is_active", true)
        .order("member_count", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Platform stats
      db
        .from("profiles")
        .select("id", { count: "exact", head: true }),
    ]);

    const product = productRes.data as any;
    const campaign = campaignRes.data as any;
    const sale = saleRes.data as any;
    const community = communityRes.data as any;
    const totalUsers = statsRes.count ?? 0;

    // Format sale amount
    let saleAmount = "$24";
    if (sale?.total_amount) {
      const amt = Number(sale.total_amount);
      saleAmount = `$${amt >= 1000 ? (amt / 1000).toFixed(1) + "k" : amt.toFixed(0)}`;
    }

    // Extract product image
    let productImage: string | null = null;
    if (product?.images) {
      const imgs = Array.isArray(product.images)
        ? product.images
        : typeof product.images === "string"
        ? JSON.parse(product.images)
        : [];
      productImage = imgs[0] ?? null;
    }

    return NextResponse.json({
      product: product
        ? {
            name: product.name,
            slug: product.slug,
            price: `${product.currency ?? "$"}${Number(product.price).toFixed(0)}`,
            saleCount: product.sale_count ?? 0,
            rating: product.rating ?? 4.5,
            image: productImage,
          }
        : null,
      campaign: campaign
        ? {
            title: campaign.title,
            id: campaign.id,
            rate: campaign.rate_per_1k_views
              ? `$${Number(campaign.rate_per_1k_views).toFixed(0)} / 1K views`
              : "Paid per view",
            type: campaign.campaign_type ?? "UGC",
          }
        : null,
      sale: {
        amount: saleAmount,
        timeAgo: sale?.created_at
          ? formatTimeAgo(new Date(sale.created_at))
          : "just now",
      },
      community: community
        ? {
            name: community.name,
            slug: community.slug,
            memberCount: formatCount(community.member_count ?? 0),
            avatar: community.avatar_url,
          }
        : null,
      stats: {
        totalUsers: formatCount(totalUsers),
      },
    });
  } catch (err) {
    console.error("[hero-data] error:", err);
    return NextResponse.json(
      {
        product: null,
        campaign: null,
        sale: { amount: "$24", timeAgo: "just now" },
        community: null,
        stats: { totalUsers: "10K+" },
      },
      { status: 200 }
    );
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`;
  return n > 0 ? `${n}+` : "0";
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
