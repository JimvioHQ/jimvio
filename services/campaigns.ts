import { getDB } from "./base";

// ─────────────────────────────────────────────────────────────
// INFLUENCER CAMPAIGNS
// ─────────────────────────────────────────────────────────────

export async function getCampaigns(limit = 12) {
  const db = await getDB();
  const { data, error } = await db
    .from("ugc_campaigns")
    .select(`
      *,
      media:ugc_campaign_media(*),
      vendor:vendors!brand_id (
        business_name,
        business_slug,
        business_logo
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error("Error fetching campaigns:", JSON.stringify(error, null, 2));
    return [];
  }
  return data ?? [];
}

export async function getVendorCampaigns(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("influencer_campaigns")
    .select(`
      *, products ( name, slug, images ),
      influencers ( display_name, profile_image, social_platforms )
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
