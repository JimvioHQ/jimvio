import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { toPublicCampaignListItem } from "@/lib/ugc/public-campaign-list";
import { attachPublicFunding } from "@/lib/ugc/public-campaign-funding";
import type { UGCCampaign } from "@/types/ugc";

/**
 * Active public campaigns for server rendering (P0-6).
 * Same select and public mapping as GET /api/ugc/campaigns, so search
 * engines, link previews and first paint show real campaigns instead of an
 * empty filter bar.
 */
export async function loadPublicActiveCampaigns(
  limit = 24,
): Promise<{ campaigns: UGCCampaign[]; total: number }> {
  try {
    const db = createServiceRoleClient();
    const { data, count, error } = await db
      .from("ugc_campaigns")
      .select(
        `
        *,
        media:ugc_campaign_media(*),
        vendor:vendors!brand_id (
          business_name,
          business_logo,
          business_slug,
          business_country,
          verification_status,
          verified_at,
          owner:profiles!user_id (
            avatar_url,
            full_name
          )
        )
      `,
        { count: "exact" },
      )
      .eq("status", "active")
      .order("created_at", { ascending: false, nullsFirst: false })
      .range(0, limit - 1);
    if (error || !data) return { campaigns: [], total: 0 };
    const rows = await attachPublicFunding(
      db,
      data.map((row) => toPublicCampaignListItem(row as Record<string, unknown>)),
    );
    // The public board lists only campaigns whose full budget Jimvio holds.
    const funded = rows.filter((r) => (r as { funding?: { state?: string } }).funding?.state === "funded");
    return {
      campaigns: funded as unknown as UGCCampaign[],
      total: Math.max(0, (count ?? data.length) - (rows.length - funded.length)),
    };
  } catch {
    return { campaigns: [], total: 0 };
  }
}
