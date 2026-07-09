import { getAdminDB } from "./base";

/** Slimmer select for homepage UGC cards (public Affiliates / UGC surfaces). */
export async function getHomepageCampaigns(limit = 8) {
  const db = await getAdminDB();
  const { data, error } = await db
    .from("ugc_campaigns")
    .select(`
      id, title, payment_model, fixed_rate, rate_per_1k_views,
      ends_at, approved_count, submission_count, status, campaign_type,
      media:ugc_campaign_media(id, url, usage, type),
      vendor:vendors!brand_id ( business_name, business_slug, business_logo )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching homepage campaigns:", JSON.stringify(error, null, 2));
    return [];
  }
  return data ?? [];
}
