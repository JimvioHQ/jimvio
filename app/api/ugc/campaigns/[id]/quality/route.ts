import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";
import { computeCampaignQuality } from "@/lib/ugc/enterprise/quality-engine";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.brand_id !== vendor.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quality = await computeCampaignQuality(db, id);
  if (!quality) return NextResponse.json({ error: "Unable to compute quality" }, { status: 500 });

  return NextResponse.json({ quality });
}
