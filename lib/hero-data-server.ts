import { unstable_cache } from "next/cache";
import { getAdminDB } from "@/services/base";
import { getDemoPlatformStats } from "@/lib/demo-platform-stats";

export type HeroDataPayload = {
  product: {
    name: string;
    slug: string;
    price: string;
    saleCount: number;
    rating: number;
    image: string | null;
  } | null;
  campaign: {
    title: string;
    id: string;
    rate: string;
    type: string;
  } | null;
  sale: { amount: string; timeAgo: string };
  community: {
    name: string;
    slug: string;
    memberCount: string;
    avatar: string | null;
  } | null;
  stats: { totalUsers: string };
};

const FALLBACK: HeroDataPayload = {
  product: null,
  campaign: null,
  sale: { amount: "$24", timeAgo: "just now" },
  community: null,
  stats: { totalUsers: formatCount(getDemoPlatformStats().users) },
};

const QUERY_MS = 8_000;

type HeroProductRow = {
  name: string;
  slug: string;
  price: number | string;
  currency?: string | null;
  images?: unknown;
  sale_count?: number | null;
  rating?: number | null;
};

type HeroCampaignRow = {
  id: string;
  title: string;
  campaign_type?: string | null;
  rate_per_1k_views?: number | null;
};

type HeroSaleRow = {
  total_amount?: number | string | null;
  created_at?: string | null;
};

type HeroCommunityRow = {
  name: string;
  slug: string;
  member_count?: number | null;
  avatar_url?: string | null;
};

async function withTimeout<T>(
  label: string,
  run: () => PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  try {
    const result = await Promise.race([
      run(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout`)), QUERY_MS),
      ),
    ]);
    if (result.error) {
      console.warn(`[hero-data] ${label}:`, result.error);
      return null;
    }
    return (result.data as T | null) ?? null;
  } catch (err) {
    console.warn(`[hero-data] ${label} failed:`, err);
    return null;
  }
}

async function fetchHeroDataUncached(): Promise<HeroDataPayload> {
  const db = getAdminDB();

  const [product, campaign, sale, community] = await Promise.all([
    withTimeout<HeroProductRow>("product", () =>
      db
        .from("products")
        .select("id, name, slug, price, currency, images, sale_count, rating")
        .eq("status", "active")
        .eq("is_active", true)
        .order("sale_count", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
    withTimeout<HeroCampaignRow>("campaign", () =>
      db
        .from("ugc_campaigns")
        .select("id, title, campaign_type, rate_per_1k_views")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
    withTimeout<HeroSaleRow>("sale", () =>
      db
        .from("orders")
        .select("id, total_amount, currency, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
    withTimeout<HeroCommunityRow>("community", () =>
      db
        .from("communities")
        .select("id, name, slug, member_count, avatar_url")
        .eq("is_active", true)
        .order("member_count", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  ]);

  let saleAmount = "$24";
  if (sale?.total_amount) {
    const amt = Number(sale.total_amount);
    saleAmount = `$${amt >= 1000 ? `${(amt / 1000).toFixed(1)}k` : amt.toFixed(0)}`;
  }

  let productImage: string | null = null;
  if (product?.images) {
    try {
      const imgs = Array.isArray(product.images)
        ? product.images
        : typeof product.images === "string"
          ? JSON.parse(product.images)
          : [];
      productImage = imgs[0] ?? null;
    } catch {
      productImage = null;
    }
  }

  return {
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
      timeAgo: sale?.created_at ? formatTimeAgo(new Date(sale.created_at)) : "just now",
    },
    community: community
      ? {
          name: community.name,
          slug: community.slug,
          memberCount: formatCount(community.member_count ?? 0),
          avatar: community.avatar_url ?? null,
        }
      : null,
    stats: { totalUsers: formatCount(getDemoPlatformStats().users) },
  };
}

export const getHeroData = unstable_cache(fetchHeroDataUncached, ["hero-data-v2"], {
  revalidate: 60,
});

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

export { FALLBACK as HERO_DATA_FALLBACK };
