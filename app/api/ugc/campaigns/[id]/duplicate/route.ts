import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";
import { duplicateCampaign } from "@/lib/ugc/platform/duplicate-campaign";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  try {
    const result = await duplicateCampaign(db, {
      campaignId: id,
      brandId: vendor.id,
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
