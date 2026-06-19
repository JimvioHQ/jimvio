import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 3 * 60 * 1000;

function sanitizeTerm(s: string) {
  return s.replace(/[%_\\]/g, "").trim().slice(0, 80);
}

function getProductImage(images: unknown): string | null {
  if (!images) return null;
  if (Array.isArray(images)) return (images[0] as string) ?? null;
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed[0] ?? null : null;
    } catch {
      return images;
    }
  }
  return null;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K`;
  return String(n);
}

export async function GET(req: NextRequest) {
  const term = sanitizeTerm(req.nextUrl.searchParams.get("q") ?? "");
  const type = req.nextUrl.searchParams.get("type") ?? "all";

  if (term.length < 2) {
    return NextResponse.json({ products: [], campaigns: [], communities: [] });
  }

  const cacheKey = `${type}:${term.toLowerCase()}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    const supabase = await createClient();
    const pattern = `%${term}%`;

    const [productsRes, campaignsRes, communitiesRes] = await Promise.all([
      type === "campaigns" || type === "communities"
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("products")
            .select("id, name, slug, price, price_usd, images, inventory_quantity, affiliate_commission_rate")
            .eq("status", "active")
            .eq("is_active", true)
            .ilike("name", pattern)
            .order("view_count", { ascending: false })
            .limit(4),
      type === "products" || type === "communities"
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("ugc_campaigns")
            .select("id, title, campaign_type, rate_per_1k_views")
            .eq("status", "active")
            .ilike("title", pattern)
            .order("rate_per_1k_views", { ascending: false })
            .limit(4),
      type === "products" || type === "campaigns"
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("communities")
            .select("id, name, slug, member_count, avatar_url, tagline")
            .eq("is_active", true)
            .ilike("name", pattern)
            .order("member_count", { ascending: false })
            .limit(4),
    ]);

    const products = (productsRes.data ?? []).map((p) => {
      const amount = p.price_usd ?? p.price ?? 0;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: amount > 0 ? `$${Number(amount).toLocaleString()}` : "View price",
        mqo: `${p.inventory_quantity ?? 1} pcs`,
        image: getProductImage(p.images),
        commission: p.affiliate_commission_rate
          ? `${Number(p.affiliate_commission_rate)}%`
          : null,
      };
    });

    const campaigns = (campaignsRes.data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      type: (c.campaign_type ?? "UGC").replace(/_/g, " "),
      rate: c.rate_per_1k_views
        ? `$${Number(c.rate_per_1k_views).toFixed(0)} / 1K views`
        : "Paid per view",
      slug: c.id,
    }));

    const communities = (communitiesRes.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      members: formatCount(c.member_count ?? 0),
      avatar: c.avatar_url,
      tagline: c.tagline,
    }));

    const payload = { products, campaigns, communities };
    CACHE.set(cacheKey, { data: payload, ts: Date.now() });

    return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });
  } catch (e) {
    console.error("GET /api/ai/recommendations:", e);
    return NextResponse.json({ products: [], campaigns: [], communities: [] });
  }
}
