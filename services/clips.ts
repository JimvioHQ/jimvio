import { getAdminDB, getDB } from "./base";

// ─────────────────────────────────────────────────────────────
// UGC SUBMISSIONS (Replacing legacy viral clips)
// ─────────────────────────────────────────────────────────────

export async function getViralClips(limit = 6) {
  const db = await getDB();
  const { data } = await db
    .from("ugc_submissions")
    .select(`
      id,
      post_url,
      view_count,
      status,
      influencers ( id, display_name, profile_image ),
      ugc_campaigns ( 
        id, 
        title, 
        description, 
        vendors ( id, business_name, business_slug, logo_url:business_logo ) 
      )
    `)
    .eq("status", "approved")
    .order("view_count", { ascending: false })
    .limit(limit);

  return (data ?? []).map((clip: any) => {
    const campaign = Array.isArray(clip.ugc_campaigns) ? clip.ugc_campaigns[0] : clip.ugc_campaigns;
    const vendor = campaign?.vendors ? (Array.isArray(campaign.vendors) ? campaign.vendors[0] : campaign.vendors) : null;
    return {
      id: clip.id,
      title: campaign?.title || "UGC Content",
      description: campaign?.description || "",
      thumbnail_url: "",
      video_url: clip.post_url,
      duration: 0,
      total_views: Number(clip.view_count) || 0,
      total_shares: 0,
      total_downloads: 0,
      total_conversions: 0,
      vendors: vendor,
      products: null
    };
  });
}

/** For TikTok-style feed: clips from vendors or creators (influencers) */
export async function getFeedClips(limit = 30) {
  const db = await getDB();
  const { data } = await db
    .from("ugc_submissions")
    .select(`
      id,
      post_url,
      view_count,
      status,
      influencers ( id, user_id, display_name, profile_image ),
      ugc_campaigns ( 
        id, 
        title, 
        description, 
        vendors ( id, user_id, business_name, business_slug, business_logo ) 
      )
    `)
    .eq("status", "approved")
    .order("view_count", { ascending: false })
    .limit(limit);

  return (data ?? []).map((clip: any) => {
    const campaign = Array.isArray(clip.ugc_campaigns) ? clip.ugc_campaigns[0] : clip.ugc_campaigns;
    const vendor = campaign?.vendors ? (Array.isArray(campaign.vendors) ? campaign.vendors[0] : campaign.vendors) : null;
    const influencer = Array.isArray(clip.influencers) ? clip.influencers[0] : clip.influencers;
    return {
      id: clip.id,
      title: campaign?.title || "UGC Content",
      description: campaign?.description || "",
      thumbnail_url: "",
      video_url: clip.post_url,
      total_views: Number(clip.view_count) || 0,
      vendor_id: vendor?.id,
      influencer_id: influencer?.id,
      vendors: vendor,
      influencers: influencer,
      products: null
    };
  });
}

export async function getVendorClips(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("ugc_submissions")
    .select(`
      id, post_url, view_count, status, created_at,
      ugc_campaigns!inner(id, brand_id)
    `)
    .eq("ugc_campaigns.brand_id", vendorId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Clips with details for profile feed */
export async function getVendorClipsWithDetails(vendorId: string, limit = 50) {
  const db = await getDB();
  const { data } = await db
    .from("ugc_submissions")
    .select(`
      id, post_url, view_count, status,
      influencers ( id, display_name ),
      ugc_campaigns!inner(
        id, brand_id, title, description,
        vendors ( id, business_name, business_slug, business_logo )
      )
    `)
    .eq("ugc_campaigns.brand_id", vendorId)
    .eq("status", "approved")
    .order("view_count", { ascending: false })
    .limit(limit);

  return (data ?? []).map((clip: any) => {
    const campaign = Array.isArray(clip.ugc_campaigns) ? clip.ugc_campaigns[0] : clip.ugc_campaigns;
    const vendor = campaign?.vendors ? (Array.isArray(campaign.vendors) ? campaign.vendors[0] : campaign.vendors) : null;
    return {
      id: clip.id,
      title: campaign?.title || "UGC Campaign",
      description: campaign?.description || "",
      video_url: clip.post_url,
      thumbnail_url: null,
      total_views: Number(clip.view_count) || 0,
      total_shares: 0,
      vendor_id: vendor?.id,
      vendors: vendor,
      products: null
    };
  });
}

/**
 * Influencers who have approved submissions sorted by rank
 */
export async function getTopCreators(limit = 6) {
  const admin = getAdminDB();
  const { data: clipRows } = await admin
    .from("ugc_submissions")
    .select("influencer_id, view_count")
    .eq("status", "approved");
    
  if (!clipRows?.length) return [];

  const viewsByInfluencer = new Map<string, number>();
  for (const r of clipRows as { influencer_id: string; view_count?: number | null }[]) {
    const id = r.influencer_id;
    viewsByInfluencer.set(id, (viewsByInfluencer.get(id) ?? 0) + Number(r.view_count ?? 0));
  }
  
  const rankedIds = [...viewsByInfluencer.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, Math.max(limit * 3, limit));

  if (rankedIds.length === 0) return [];

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
    full_name: inf.display_name || "Creator",
    avatar_url: inf.profile_image || null,
    total_earnings: 0,
    total_conversions: Number(inf.total_conversions || 0),
    total_clicks: Number(inf.total_clicks || 0),
    total_views: viewsByInfluencer.get(inf.id) || 0,
  }));
}

/** 
 * NEW: Fetch real short videos from the short_videos table
 */
export async function getShortVideos(limit = 8) {
  const db = await getDB();
  const { data } = await db
    .from("short_videos")
    .select(`
      id, title, description, video_url, thumbnail_url, view_count, like_count, comment_count, status,
      creator_id,
      video_type, community_id, external_link,
      communities ( id, name, slug, cover_image ),
      influencers ( user_id, display_name, profile_image ),
      products ( id, name, slug, price, currency, images, vendor_id )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  
  return data.map((v: any) => {
    const influencer = v.influencers;
    const prod = v.products;
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      video_url: v.video_url,
      thumbnail_url: v.thumbnail_url,
      total_views: v.view_count || 0,
      total_likes: v.like_count || 0,
      total_comments: v.comment_count || 0,
      video_type: v.video_type || "product",
      creator: {
        id: influencer?.id,
        name: influencer?.display_name || "Creator",
        avatar: influencer?.profile_image || null
      },
      product: prod ? {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        price: prod.price,
        currency: prod.currency,
        image: Array.isArray(prod.images) ? prod.images[0] : null
      } : null,
      community: v.communities
    };
  });
}
