import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";
import { runCampaignActivationChecker } from "@/lib/ugc/campaign-activation-checker";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireCampaignPermission(user.id, id, "campaigns.manage");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: campaign } = await access.db
    .from("ugc_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const [{ data: escrow }, { data: media }, { count: dupCount }] = await Promise.all([
    access.db
      .from("ugc_campaign_escrow")
      .select("status, amount, currency, refunded_amount")
      .eq("campaign_id", id),
    access.db
      .from("ugc_campaign_media")
      .select("url")
      .eq("campaign_id", id)
      .limit(40),
    access.db
      .from("ugc_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", campaign.brand_id)
      .eq("title", campaign.title)
      .neq("id", id),
  ]);

  const report = runCampaignActivationChecker({
    campaign: campaign as Record<string, unknown>,
    escrow: escrow ?? [],
    mediaUrls: (media ?? []).map((m) => String(m.url ?? "")).filter(Boolean),
    duplicateTitleCount: dupCount ?? 0,
  });

  return NextResponse.json({ report });
}
