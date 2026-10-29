import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { evaluateJoinEligibility } from "@/lib/ugc/join-engine";
import { resolveJoinConfig, resolveJoinMode } from "@/lib/ugc/join-engine";
import { countAcceptedParticipants, loadCreatorProfile, type CampaignJoinRow } from "@/lib/ugc/join-service";
import { canAccessCampaignJoinSurfaces } from "@/lib/ugc/enterprise/brand-access";
import { loadCreatorProfileCompletion } from "@/lib/identity/sync";
import { countryPolicyFromJoinConfig } from "@/lib/ugc/campaign-brief";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return NextResponse.json({ error: "Invalid campaign ID format" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const db = createServiceRoleClient();
  const { data: campaign } = await db.from("ugc_campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const allowed = await canAccessCampaignJoinSurfaces(db, user?.id ?? null, {
    id: campaign.id,
    status: campaign.status,
    brand_id: campaign.brand_id,
  });
  if (!allowed) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const participantCount = await countAcceptedParticipants(db, id);
  let profile = null;
  let profileCompletion = null;
  if (user) {
    [profile, profileCompletion] = await Promise.all([
      loadCreatorProfile(db, user.id),
      loadCreatorProfileCompletion(user.id),
    ]);
  }
  const countryPolicy = countryPolicyFromJoinConfig(campaign.join_config);

  const eligibility = evaluateJoinEligibility(
    campaign as CampaignJoinRow,
    profile,
    participantCount,
  );

  return NextResponse.json({
    joinMode: resolveJoinMode(campaign as CampaignJoinRow),
    joinConfig: resolveJoinConfig(campaign as CampaignJoinRow),
    eligibility,
    participantCount,
    profileCompletion,
    country: profile
      ? {
          verified: profile.country ?? null,
          declared: profile.declaredCountry ?? null,
          confidence: profile.countryConfidence ?? "none",
          vpnSuspected: Boolean(profile.vpnSuspected),
        }
      : null,
    countryPolicy,
  });
}
