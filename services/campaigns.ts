// import { getDB, getAdminDB } from "./base";

// // ─────────────────────────────────────────────────────────────
// // INFLUENCER CAMPAIGNS
// // ─────────────────────────────────────────────────────────────

// export async function getCampaigns(limit = 12) {
//   const db = getAdminDB();
//   const { data, error } = await db
//     .from("ugc_campaigns")
//     .select(`
//       *,
//       media:ugc_campaign_media(*),
//       vendor:vendors!brand_id (
//         business_name,
//         business_slug,
//         business_logo
//       )
//     `)
//     .eq("status", "active")
//     .order("created_at", { ascending: false })
//     .limit(limit);

//   if (error) {
//     console.error("Error fetching campaigns:", JSON.stringify(error, null, 2));
//     return [];
//   }
//   return data ?? [];
// }

// export async function getVendorCampaigns(vendorId: string) {
//   const db = await getDB();
//   const { data } = await db
//     .from("influencer_campaigns")
//     .select(`
//       *, products ( name, slug, images ),
//       influencers ( display_name, profile_image, social_platforms )
//     `)
//     .eq("vendor_id", vendorId)
//     .order("created_at", { ascending: false });
//   return data ?? [];
// }

import { getDB, getAdminDB } from "./base";

export async function getCampaigns(limit = 12) {
  const db = await getAdminDB(); // FIX: was missing await
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

/** Slimmer select for homepage UGC cards. */
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

export async function getVendorCampaigns(vendorId: string) {
  const db = await getDB();
  const { data } = await db
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
    .eq("brand_id", vendorId) // FIX: vendor_id → brand_id (the FK column name on ugc_campaigns)
    .order("created_at", { ascending: false });
  return data ?? [];
}