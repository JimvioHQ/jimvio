import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireCampaignMember } from "@/lib/ugc/enterprise/brand-access";
import { memberCan } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const access = await requireCampaignMember(user.id, id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { db, role } = access;
  const showFinance = memberCan(role, "finance.view");

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id, total_budget, spent_budget, total_views_tracked, status, title")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const [
    activeCreatorsRes,
    pendingAppsRes,
    totalAppsRes,
    pendingSubsRes,
    revisionRes,
    approvalQueueRes,
    totalSubsRes,
    approvedSubsRes,
    rejectedSubsRes,
    earningsRes,
    escrowRes,
    paidPayoutsRes,
  ] = await Promise.all([
    db
      .from("ugc_campaign_participants")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("status", "accepted"),
    db
      .from("ugc_campaign_participants")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .in("status", ["pending", "waitlisted"]),
    db
      .from("ugc_campaign_participants")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id),
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
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id),
    db
      .from("ugc_submissions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("status", "approved"),
    db
      .from("ugc_submissions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("status", "rejected"),
    db
      .from("ugc_submissions")
      .select("total_earnings")
      .eq("campaign_id", id),
    showFinance
      ? db
          .from("ugc_campaign_escrow")
          .select("amount, status")
          .eq("campaign_id", id)
          .eq("status", "held")
      : Promise.resolve({ data: null, error: null }),
    showFinance
      ? db
          .from("ugc_payouts")
          .select("amount, status, submission:ugc_submissions!inner(campaign_id)")
          .eq("submission.campaign_id", id)
          .eq("status", "paid")
      : Promise.resolve({ data: null, error: null }),
  ]);

  const totalBudget = Number(campaign.total_budget ?? 0);
  const spentBudget = Number(campaign.spent_budget ?? 0);
  const earningsSum = (earningsRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.total_earnings ?? 0),
    0
  );
  const escrowHeld = showFinance
    ? (escrowRes.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
    : null;
  const paidRows = paidPayoutsRes.error ? null : paidPayoutsRes.data;
  const confirmedPayoutAmount = showFinance && paidRows
    ? paidRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
    : null;
  const confirmedPayoutCount = showFinance && paidRows ? paidRows.length : null;

  return NextResponse.json({
    campaignId: id,
    title: campaign.title,
    status: campaign.status,
    metrics: {
      activeCreators: activeCreatorsRes.count ?? 0,
      pendingApplications: pendingAppsRes.count ?? 0,
      totalApplications: totalAppsRes.count ?? 0,
      pendingSubmissions: pendingSubsRes.count ?? 0,
      revisionRequested: revisionRes.count ?? 0,
      totalSubmissions: totalSubsRes.count ?? 0,
      approvedSubmissions: approvedSubsRes.count ?? 0,
      rejectedSubmissions: rejectedSubsRes.count ?? 0,
      budgetRemaining: showFinance ? Math.max(0, totalBudget - spentBudget) : null,
      totalBudget: showFinance ? totalBudget : null,
      spentBudget: showFinance ? spentBudget : null,
      escrowHeld,
      confirmedPayoutAmount,
      confirmedPayoutCount,
      views: Number(campaign.total_views_tracked ?? 0),
      earningsSum: showFinance ? earningsSum : null,
      approvalQueueSize: approvalQueueRes.count ?? 0,
    },
  });
}
