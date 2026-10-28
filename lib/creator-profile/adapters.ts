import type {
  CreatorCampaign,
  CreatorCommunity,
  CreatorCourse,
  CreatorLevel,
  CreatorProduct,
  CreatorProfileData,
  CreatorReview,
  CreatorVideo,
} from "./types";

type VendorRow = {
  id: string;
  user_id: string;
  business_name: string;
  business_slug: string;
  business_description?: string | null;
  business_logo?: string | null;
  business_banner?: string | null;
  business_country?: string | null;
  follower_count?: number | null;
  rating?: number | null;
  response_time?: string | null;
  total_sales?: number | null;
  verification_status?: string | null;
  created_at?: string | null;
};

function resolveCreatorLevel(totalSales: number): CreatorLevel {
  if (totalSales >= 10000) return "diamond";
  if (totalSales >= 5000) return "platinum";
  if (totalSales >= 1000) return "gold";
  if (totalSales >= 100) return "silver";
  return "bronze";
}

function mapProduct(row: Record<string, unknown>): CreatorProduct {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    price: Number(row.price ?? 0),
    currency: String(row.currency ?? "USD"),
    compareAtPrice: row.compare_at_price as number | null | undefined,
    images: row.images,
    productType: String(row.product_type ?? "physical"),
    saleCount: row.sale_count as number | null | undefined,
    rating: row.rating as number | null | undefined,
    reviewCount: row.review_count as number | null | undefined,
    pricingType: row.pricing_type as string | null | undefined,
    billingPeriod: row.billing_period as string | null | undefined,
    createdAt: row.created_at as string | null | undefined,
    isFeatured: Number(row.sale_count ?? 0) > 10,
  };
}

function classifyVideo(clip: Record<string, unknown>): CreatorVideo["kind"] {
  const title = String(clip.title ?? "").toLowerCase();
  if (title.includes("live")) return "live-replay";
  if (title.includes("ugc")) return "ugc";
  if (title.includes("product")) return "product";
  return "short";
}

export function mapVendorProducts(rows: Record<string, unknown>[]): CreatorProduct[] {
  return rows.map(mapProduct);
}

export function mapVendorClipsToVideos(
  clips: Record<string, unknown>[],
  slug: string,
): CreatorVideo[] {
  return clips.map((clip) => ({
    id: String(clip.id),
    title: String(clip.title ?? "Video"),
    thumbnailUrl: (clip.thumbnail_url as string | null) ?? null,
    videoUrl: (clip.video_url as string | null) ?? null,
    views: Number(clip.total_views ?? 0),
    kind: classifyVideo(clip),
    href: `/influencers/${slug}`,
  }));
}

export function mapCommunities(
  rows: Array<Record<string, unknown>>,
  role: "owner" | "managed" = "owner",
): CreatorCommunity[] {
  return rows.map((c) => ({
    id: String(c.id),
    name: String(c.name ?? ""),
    slug: String(c.slug ?? ""),
    tagline: c.tagline as string | null | undefined,
    memberCount: Number(c.member_count ?? 0),
    coverImage: (c.cover_image as string | null) ?? null,
    avatarImage: (c.avatar_url as string | null) ?? null,
    isPremium: !c.is_free,
    role,
  }));
}

export function mapVendorToCreatorProfile(
  vendor: VendorRow,
  options?: {
    products?: Record<string, unknown>[];
    clips?: Record<string, unknown>[];
    communities?: CreatorCommunity[];
    followingCount?: number;
  },
): {
  profile: CreatorProfileData;
  products: CreatorProduct[];
  videos: CreatorVideo[];
  communities: CreatorCommunity[];
  courses: CreatorCourse[];
  reviews: CreatorReview[];
  ugcCampaigns: CreatorCampaign[];
  affiliateCampaigns: CreatorCampaign[];
} {
  const products = mapVendorProducts(options?.products ?? []);
  const videos = mapVendorClipsToVideos(options?.clips ?? [], vendor.business_slug);
  const communities = options?.communities ?? [];

  const courses: CreatorCourse[] = products
    .filter((p) => ["course", "ebook", "coaching", "digital"].includes(p.productType))
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      title: p.name,
      slug: p.slug,
      students: Number(p.saleCount ?? 0),
      rating: Number(p.rating ?? 4.8),
      completionRate: 72,
      image: Array.isArray(p.images) ? (p.images[0] as string) : null,
    }));

  const totalReviews = products.reduce((sum, p) => sum + Number(p.reviewCount ?? 0), 0);
  const avgRating =
    products.length > 0
      ? products.reduce((sum, p) => sum + Number(p.rating ?? vendor.rating ?? 4.8), 0) /
        products.length
      : Number(vendor.rating ?? 4.8);

  const reviews: CreatorReview[] =
    totalReviews > 0
      ? [
          {
            id: "review-summary",
            author: "Jimvio Buyers",
            rating: avgRating,
            content: `Verified buyers rate ${vendor.business_name} highly across ${totalReviews} reviews.`,
            verified: true,
            createdAt: new Date().toISOString(),
          },
        ]
      : [];

  const affiliateCampaigns: CreatorCampaign[] = (options?.products ?? [])
    .filter(
      (row) =>
        Number(row.affiliate_commission_rate ?? 0) > 0 ||
        row.affiliate_enabled === true,
    )
    .slice(0, 8)
    .map((row) => ({
      id: `aff-${row.id}`,
      title: String(row.name ?? "Product"),
      href: `/marketplace/${row.slug}`,
      type: "affiliate" as const,
      rateLabel: "Commission available",
      status: "active",
    }));

  const totalSales = Number(vendor.total_sales ?? 0);

  return {
    profile: {
      identity: {
        id: vendor.id,
        vendorId: vendor.id,
        userId: vendor.user_id,
        slug: vendor.business_slug,
        displayName: vendor.business_name,
        bio:
          vendor.business_description ??
          `${vendor.business_name} is a creator and commerce seller on Jimvio.`,
        coverImage: vendor.business_banner ?? null,
        avatarImage: vendor.business_logo ?? null,
        isVerified: vendor.verification_status === "verified",
        level: resolveCreatorLevel(totalSales),
        country: vendor.business_country ?? "Global",
        languages: ["English"],
        joinedAt: vendor.created_at ?? null,
        isOnline: true,
        lastActiveLabel: "Active recently",
        storeHref: `/vendors/${vendor.business_slug}`,
      },
      stats: {
        followers: Number(vendor.follower_count ?? 0),
        following: options?.followingCount ?? 0,
        totalSales,
        rating: avgRating,
        reviewCount: totalReviews,
        responseTime: vendor.response_time ?? "< 24h",
        productsCount: products.length,
        videosCount: videos.length,
        communitiesCount: communities.length,
      },
    },
    products,
    videos,
    communities,
    courses,
    reviews,
    ugcCampaigns: [],
    affiliateCampaigns,
  };
}

export function mapInfluencerUserToCreatorProfile(influencer: {
  id: string;
  user_id: string;
  display_name: string;
  profile_image?: string | null;
  bio?: string | null;
  total_followers?: number | null;
}, clips: Record<string, unknown>[]) {
  const slug = influencer.user_id;
  const videos = clips.map((clip) => ({
    id: String(clip.id),
    title: String(clip.title ?? "Video"),
    thumbnailUrl: (clip.thumbnail_url as string | null) ?? null,
    videoUrl: (clip.video_url as string | null) ?? null,
    views: Number(clip.total_views ?? 0),
    kind: "short" as const,
    href: "/shorts",
  }));

  return {
    profile: {
      identity: {
        id: influencer.id,
        userId: influencer.user_id,
        slug,
        displayName: influencer.display_name,
        bio: influencer.bio ?? "Creator on Jimvio.",
        coverImage: null,
        avatarImage: influencer.profile_image ?? null,
        isVerified: false,
        level: "bronze" as CreatorLevel,
        country: "Global",
        languages: ["English"],
        joinedAt: null,
        isOnline: true,
        lastActiveLabel: "Active recently",
      },
      stats: {
        followers: Number(influencer.total_followers ?? 0),
        following: 0,
        totalSales: 0,
        rating: 4.8,
        reviewCount: 0,
        responseTime: "< 24h",
        productsCount: 0,
        videosCount: videos.length,
        communitiesCount: 0,
      },
    },
    products: [] as CreatorProduct[],
    videos,
    communities: [] as CreatorCommunity[],
    courses: [] as CreatorCourse[],
    reviews: [] as CreatorReview[],
    ugcCampaigns: [] as CreatorCampaign[],
    affiliateCampaigns: [] as CreatorCampaign[],
  };
}
