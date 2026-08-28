import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";
import { duplicateCampaign } from "@/lib/ugc/platform/duplicate-campaign";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const access = await requireCampaignPermission(user.id, id, "campaigns.manage");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const result = await duplicateCampaign(access.db, {
      campaignId: id,
      brandId: access.campaign.brand_id,
      actorUserId: user.id,
    });
    return NextResponse.json({
      campaign: result.campaign,
      draftForm: result.draftForm,
      redirectTo: `/ugc/campaign-center/create?duplicate=${result.campaign.id}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Duplicate failed" },
      { status: 400 }
    );
  }
}
