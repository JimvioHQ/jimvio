import type { SupabaseClient } from "@supabase/supabase-js";
import { memberCan, resolveBrandRole } from "@/lib/ugc/enterprise/permissions";

/** Admin, the submitting creator, or a brand member who can review campaigns. */
export async function assertCanReadSubmission(
  db: SupabaseClient,
  userId: string,
  submission: {
    influencer?: { user_id?: string | null } | { user_id?: string | null }[] | null;
    campaign?: { brand_id?: string | null } | { brand_id?: string | null }[] | null;
  },
) {
  const influencer = Array.isArray(submission.influencer)
    ? submission.influencer[0]
    : submission.influencer;
  const campaign = Array.isArray(submission.campaign)
    ? submission.campaign[0]
    : submission.campaign;
  const { data: adminRole } = await db
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("is_active", true)
    .maybeSingle();
  if (adminRole) return true;
  if (influencer?.user_id === userId) return true;
  if (campaign?.brand_id) {
    const role = await resolveBrandRole(db, campaign.brand_id, userId);
    if (memberCan(role, "campaigns.review")) return true;
  }
  return false;
}
