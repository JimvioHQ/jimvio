import { NextResponse } from "next/server";
import { getAdminDB } from "@/services/base";

export const revalidate = 60;

export async function GET() {
  try {
    const db = await getAdminDB();

    const [
      productsRes,
      campaignsRes,
      postsRes,
      profilesCountRes,
      payoutsSumRes,
      payoutsCountRes,
      countriesRes,
      testimonialsRes,
    ] = await Promise.all([
      db
        .from("products")
        .select("id, name, slug, price, currency, images, sale_count, rating, product_type")
        .eq("status", "active")
        .eq("is_active", true)
        .order("sale_count", { ascending: false })
        .limit(6),

      db
        .from("ugc_campaigns")
        .select("id, title, campaign_type, rate_per_1k_views, status, submission_count, total_budget, vendor:vendors!brand_id(business_name)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(4),

      db
        .from("community_posts")
        .select("id, title, like_count, comment_count, post_type, created_at, author:profiles!community_posts_author_id_fkey(full_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(3),

      db
        .from("profiles")
        .select("id", { count: "exact", head: true }),

      db
        .from("payouts")
        .select("amount")
        .in("status", ["completed", "paid"]),

      db
        .from("payouts")
        .select("id", { count: "exact", head: true })
        .in("status", ["completed", "paid"]),

      db
        .from("profiles")
        .select("country")
        .not("country", "is", null),

      db
        .from("testimonials")
        .select("id, name, role, avatar_url, text, rating")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const products = (productsRes.data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      currency: p.currency ?? "$",
      image: Array.isArray(p.images) ? p.images[0] : typeof p.images === "string" ? JSON.parse(p.images)[0] : null,
      sales: p.sale_count ?? 0,
      rating: Number(p.rating ?? 4.5),
      type: p.product_type ?? "digital",
    }));

    const campaigns = (campaignsRes.data ?? []).map((c: any) => ({
      id: c.id,
      title: c.title,
      type: c.campaign_type ?? "UGC",
      rate: c.rate_per_1k_views ? `$${Number(c.rate_per_1k_views).toFixed(0)} / 1K views` : "Paid per view",
      status: c.status === "active" ? "Open" : c.status,
      brand: c.vendor?.business_name ?? "Brand",
      budget: c.total_budget ? `$${Number(c.total_budget).toLocaleString()}` : null,
      submissions: c.submission_count ?? 0,
    }));

    const posts = (postsRes.data ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      author: p.author?.full_name ?? "Creator",
      avatar: p.author?.avatar_url ?? null,
      likes: p.like_count ?? 0,
      replies: p.comment_count ?? 0,
      tag: p.post_type ?? "Discussion",
    }));

    const totalUsers = profilesCountRes.count ?? 0;
    const totalPaid = (payoutsSumRes.data ?? []).reduce(
      (sum: number, p: any) => sum + Number(p.amount ?? 0),
      0
    );
    const totalPayouts = payoutsCountRes.count ?? 0;
    const uniqueCountries = new Set(
      (countriesRes.data ?? []).map((r: any) => r.country).filter(Boolean)
    ).size;

    const stats = {
      totalUsers,
      totalUsersFormatted: formatCount(totalUsers),
      totalPaid,
      totalPaidFormatted: formatMoney(totalPaid),
      totalPayouts,
      totalPayoutsFormatted: formatCount(totalPayouts),
      countries: uniqueCountries,
      countriesFormatted: `${uniqueCountries}+`,
    };

    const testimonials = (testimonialsRes.data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      role: t.role,
      avatar: t.avatar_url,
      text: t.text,
      rating: Number(t.rating ?? 5),
    }));

    return NextResponse.json({ products, campaigns, posts, stats, testimonials });
  } catch (err) {
    console.error("[landing-data] error:", err);
    return NextResponse.json(
      { products: [], campaigns: [], posts: [], stats: null, testimonials: [] },
      { status: 200 }
    );
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`;
  return n > 0 ? `${n}` : "0";
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `$${Math.floor(n / 1_000)}K+`;
  return n > 0 ? `$${n.toLocaleString()}` : "$0";
}
