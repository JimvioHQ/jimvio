import { getDB } from "./base";

// ─────────────────────────────────────────────────────────────
// INFLUENCER CAMPAIGNS
// ─────────────────────────────────────────────────────────────

export async function getCampaigns(limit = 6) {
  const db = await getDB();
  const { data } = await db
    .from("influencer_campaigns")
    .select(`
      id, title, description, campaign_type, budget,
      commission_type, commission_rate, status, start_date, end_date,
      total_views, total_clicks, total_conversions, total_revenue,
      vendors ( business_name, business_slug ),
      products ( name, slug, images )
    `)
    .eq("status", "active")
    .order("total_revenue", { ascending: false })
    .limit(limit);
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
