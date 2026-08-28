import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { brandIdFromRequest, requireBrandWorkspace } from "@/lib/ugc/enterprise/brand-access";
import { memberCan } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

type DashboardStats = {
  needsProfile?: boolean;
  summary?: {
    activeCampaigns: number;
    draftCampaigns: number;
    pendingFunding: number;
    totalSpend: number | null;
    totalViews: number;
    totalCreators: number;
    activeApplications: number;
    conversionRate: number; // 0-100
  };
  campaignPerformance?: {
    topCampaigns: Array<{
      id: string;
      title: string;
      status: string;
      views: number;
      spend: number | null;
      submissions: number;
      approvals: number;
    }>;
  };
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    category: string | null;
    actionUrl: string | null;
    createdAt: string | null;
    isRead: boolean;
  }>;
  drafts?: Array<{ id: string; title: string }>;
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) {
    return NextResponse.json({ needsProfile: true } satisfies DashboardStats);
  }
  const { db, vendor, role } = ws;
  const showFinance = memberCan(role, "finance.view");

  const { data: campaigns } = await db
    .from("ugc_campaigns")
    .select(
      `
      id,
      title,
      status,
      total_budget,
      spent_budget,
      total_views_tracked,
      submission_count,
      approved_count,
      updated_at,
      ends_at
    `,
    )
    .eq("brand_id", vendor.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const ownedCampaigns = campaigns ?? [];
  const campaignIds = ownedCampaigns.map((c) => c.id);

  const byStatus = {
    active: ownedCampaigns.filter((c) => c.status === "active"),
    draft: ownedCampaigns.filter((c) => c.status === "draft"),
    paused: ownedCampaigns.filter((c) => c.status === "paused"),
    completed: ownedCampaigns.filter((c) => c.status === "completed"),
    cancelled: ownedCampaigns.filter((c) => c.status === "cancelled"),
  };

  const totalSpend = ownedCampaigns.reduce((sum, c) => sum + Number(c.spent_budget ?? 0), 0);
  const totalViews = ownedCampaigns.reduce(
    (sum, c) => sum + Number(c.total_views_tracked ?? 0),
    0,
  );

  let totalCreators = 0;
  let activeApplications = 0;
  let conversionRate = 0;

  if (campaignIds.length > 0) {
    const { data: participants } = await db
      .from("ugc_campaign_participants")
      .select("influencer_id, status")
      .in("campaign_id", campaignIds);

    const list = participants ?? [];
    const creatorSet = new Set<string>();
    let accepted = 0;
    let reviewQueue = 0; // pending + waitlisted
    for (const p of list) {
      if (!p.influencer_id) continue;
      creatorSet.add(String(p.influencer_id));
      if (p.status === "accepted") accepted += 1;
      if (p.status === "pending" || p.status === "waitlisted") reviewQueue += 1;
    }

    // conversion = accepted / (accepted + pending + waitlisted)
    totalCreators = creatorSet.size;
    activeApplications = reviewQueue;
    conversionRate = accepted + reviewQueue > 0 ? Math.round((accepted / (accepted + reviewQueue)) * 100) : 0;
  }

  const topCampaigns = [...ownedCampaigns]
    .sort((a, b) => Number(b.total_views_tracked ?? 0) - Number(a.total_views_tracked ?? 0))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      views: Number(c.total_views_tracked ?? 0),
      spend: showFinance ? Number(c.spent_budget ?? 0) : null,
      submissions: Number(c.submission_count ?? 0),
      approvals: Number(c.approved_count ?? 0),
    }));

  const { data: notifications } = await db
    .from("notifications")
    .select("id, title, message, type, category, action_url, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const drafts = byStatus.draft
    .slice(0, 10)
    .map((c) => ({ id: c.id, title: c.title }));

  return NextResponse.json({
    summary: {
      activeCampaigns: byStatus.active.length,
      draftCampaigns: byStatus.draft.length,
      pendingFunding: byStatus.draft.length,
      totalSpend: showFinance ? totalSpend : null,
      totalViews,
      totalCreators,
      activeApplications,
      conversionRate,
    },
    campaignPerformance: { topCampaigns },
    notifications: (notifications ?? []).map((n) => ({
      id: String(n.id),
      title: n.title ?? "Update",
      message: n.message ?? "",
      type: n.type ?? "system",
      category: n.category ?? null,
      actionUrl: n.action_url ?? null,
      createdAt: n.created_at ? String(n.created_at) : null,
      isRead: Boolean(n.is_read),
    })),
    drafts,
  } satisfies DashboardStats);
}

