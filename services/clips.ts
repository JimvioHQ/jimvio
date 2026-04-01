import { getAdminDB, getDB } from "./base";

// ─────────────────────────────────────────────────────────────
// VIRAL CLIPS
// ─────────────────────────────────────────────────────────────

export async function getViralClips(limit = 6) {
  const db = await getDB();
  const { data } = await db
    .from("viral_clips")
    .select(`
      id, title, description, thumbnail_url, video_url, duration,
      total_views, total_shares, total_downloads, total_conversions,
      vendors ( id, business_name, business_slug, logo_url:business_logo ),
      products ( name, slug, price, images, affiliate_commission_rate, currency )
    `)
    .eq("is_active", true)
    .not("video_url", "is", null)
    .neq("video_url", "")
    .order("total_views", { ascending: false })
    .limit(limit);
  return (data ?? []).map((clip: any) => ({
    ...clip,
    vendors: Array.isArray(clip.vendors) ? clip.vendors[0] : clip.vendors,
    products: Array.isArray(clip.products) ? clip.products[0] : clip.products
  }));
}

/** For TikTok-style feed: clips from vendors or creators (influencers) with product */
export async function getFeedClips(limit = 30) {
  const db = await getDB();
  const { data } = await db
    .from("viral_clips")
    .select(`
      id, title, description, thumbnail_url, video_url, duration,
      total_views, total_shares, total_downloads, total_conversions, total_likes,
      vendor_id, influencer_id, product_id,
      vendors ( id, business_name, business_slug, business_logo ),
      influencers ( id, display_name, profile_image ),
      products ( id, name, slug, price, images, rating, inventory_quantity, currency )
    `)
    .eq("is_active", true)
    .order("total_views", { ascending: false })
    .limit(limit);
  return (data ?? []).map((clip: any) => {
    const vendor = Array.isArray(clip.vendors) ? clip.vendors[0] : clip.vendors;
    const influencer = Array.isArray(clip.influencers) ? clip.influencers[0] : clip.influencers;
    const product = Array.isArray(clip.products) ? clip.products[0] : clip.products;
    const vendors = vendor ?? (influencer ? { id: influencer.id, business_name: influencer.display_name ?? "Creator", business_slug: influencer.id, business_logo: influencer.profile_image } : null);
    return { ...clip, vendors, products: product };
  });
}

export async function getVendorClips(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("viral_clips")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Clips with product/vendor for creator profile feed */
export async function getVendorClipsWithDetails(vendorId: string, limit = 50) {
  const db = await getDB();
  const { data } = await db
    .from("viral_clips")
    .select(`
      id, title, description, thumbnail_url, video_url, duration,
      total_views, total_shares, vendor_id, product_id,
      vendors ( id, business_name, business_slug, business_logo ),
      products ( id, name, slug, price, images, currency )
    `)
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .order("total_views", { ascending: false })
    .limit(limit);
  return (data ?? []).map((clip: any) => ({
    ...clip,
    vendors: Array.isArray(clip.vendors) ? clip.vendors[0] : clip.vendors,
    products: Array.isArray(clip.products) ? clip.products[0] : clip.products
  }));
}

/**
 * Influencers who have at least one active viral clip with a video URL (no empty “creator” cards).
 */
export async function getTopCreators(limit = 6) {
  const admin = getAdminDB();
  const { data: clipRows } = await admin
    .from("viral_clips")
    .select("influencer_id, total_views")
    .eq("is_active", true)
    .not("influencer_id", "is", null)
    .not("video_url", "is", null)
    .neq("video_url", "");
  if (!clipRows?.length) return [];

  const viewsByInfluencer = new Map<string, number>();
  for (const r of clipRows as { influencer_id: string; total_views?: number | null }[]) {
    const id = r.influencer_id;
    viewsByInfluencer.set(id, (viewsByInfluencer.get(id) ?? 0) + Number(r.total_views ?? 0));
  }
  const rankedIds = [...viewsByInfluencer.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, Math.max(limit * 3, limit));

  const { data: influencers } = await admin
    .from("influencers")
    .select("id, user_id, display_name, profile_image, total_followers, total_clicks, total_conversions")
    .in("id", rankedIds)
    .eq("is_active", true);

  const order = new Map(rankedIds.map((id, i) => [id, i]));
  const sorted: any[] = (influencers ?? []).sort((a: any, b: any) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)).slice(0, limit);

  return sorted.map((inf) => ({
    id: inf.id,
    user_id: inf.user_id,
    full_name: inf.display_name ?? "Creator",
    avatar_url: inf.profile_image ?? null,
    total_earnings: 0,
    total_conversions: Number(inf.total_conversions ?? 0),
    total_clicks: Number(inf.total_clicks ?? 0),
    total_views: viewsByInfluencer.get(inf.id) ?? 0,
  }));
}

