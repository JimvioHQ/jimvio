import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id, total_budget, spent_budget, total_views_tracked, status, title")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.brand_id !== vendor.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    activeCreatorsRes,
    pendingSubsRes,
    revisionRes,
    approvalQueueRes,
    earningsRes,
  ] = await Promise.all([
    db
      .from("ugc_campaign_participants")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("status", "accepted"),
    db
      .from("ugc_submissions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("status", "pending"),
    db
      .from("ugc_submissions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("status", "revision_requested"),
    db
      .from("ugc_submissions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .in("status", ["pending", "revision_requested"]),
    db
      .from("ugc_submissions")
      .select("total_earnings")
      .eq("campaign_id", id),
  ]);

  const totalBudget = Number(campaign.total_budget ?? 0);
  const spentBudget = Number(campaign.spent_budget ?? 0);
  const earningsSum = (earningsRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.total_earnings ?? 0),
    0
  );

  return NextResponse.json({
    campaignId: id,
    title: campaign.title,
    status: campaign.status,
    metrics: {
      activeCreators: activeCreatorsRes.count ?? 0,
      pendingSubmissions: pendingSubsRes.count ?? 0,
      revisionRequested: revisionRes.count ?? 0,
      budgetRemaining: Math.max(0, totalBudget - spentBudget),
      totalBudget,
      spentBudget,
      views: Number(campaign.total_views_tracked ?? 0),
      earningsSum,
      approvalQueueSize: approvalQueueRes.count ?? 0,
    },
  });
}
