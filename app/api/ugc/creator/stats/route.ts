import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

function campaignOf(raw: unknown): { id: string; title: string } | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const c = row as { id?: string; title?: string };
  return c.id && c.title ? { id: c.id, title: c.title } : null;
}

export async function GET(_req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, influencer, ready, completion } = await requireInfluencer(user.id);

  if (!ready || !influencer) {
    return NextResponse.json({
      needsProfile: true,
      complete: false,
      missing: completion.missing,
    });
  }

  const { data: balanceRow } = await db
    .from("influencers")
    .select("available_balance, pending_balance, total_earnings")
    .eq("id", influencer.id)
    .maybeSingle();

  const { data: submissions } = await db
    .from("ugc_submissions")
    .select(
      `
      id,
      status,
      platform,
      total_views_earned,
      total_earnings,
      created_at,
      campaign:ugc_campaigns!campaign_id (id, title, campaign_type)
    `,
    )
    .eq("influencer_id", influencer.id)
    .order("created_at", { ascending: false });

  const subs = submissions ?? [];
  const approved = subs.filter((s) => s.status === "approved");
  const pending = subs.filter((s) => s.status === "pending");
  const rejected = subs.filter((s) => s.status === "rejected");

  const totalViews = subs.reduce((a, s) => a + (s.total_views_earned ?? 0), 0);
  const ugcEarnings = subs.reduce((a, s) => a + Number(s.total_earnings ?? 0), 0);
  const approvalRate = subs.length > 0 ? Math.round((approved.length / subs.length) * 100) : 0;

  const byCampaign = new Map<
    string,
    { id: string; title: string; views: number; earnings: number; submissions: number }
  >();
  for (const s of subs) {
    const camp = campaignOf(s.campaign);
    if (!camp) continue;
    const cur = byCampaign.get(camp.id) ?? {
      id: camp.id,
      title: camp.title,
      views: 0,
      earnings: 0,
      submissions: 0,
    };
    cur.views += s.total_views_earned ?? 0;
    cur.earnings += Number(s.total_earnings ?? 0);
    cur.submissions += 1;
    byCampaign.set(camp.id, cur);
  }

  const topCampaigns = [...byCampaign.values()]
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);

  const topVideos = [...subs]
    .sort((a, b) => (b.total_views_earned ?? 0) - (a.total_views_earned ?? 0))
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      platform: s.platform,
      views: s.total_views_earned ?? 0,
      earnings: Number(s.total_earnings ?? 0),
      status: s.status,
      campaign: campaignOf(s.campaign),
    }));

  const { data: participations } = await db
    .from("ugc_campaign_participants")
    .select("status")
    .eq("influencer_id", influencer.id);

  const activeProjects = (participations ?? []).filter((p) => p.status === "accepted").length;
  const pendingApplications = (participations ?? []).filter(
    (p) => p.status === "pending" || p.status === "waitlisted",
  ).length;

  return NextResponse.json({
    summary: {
      totalViews,
      ugcEarnings,
      availableBalance: Number(balanceRow?.available_balance ?? 0),
      pendingBalance: Number(balanceRow?.pending_balance ?? 0),
      lifetimeEarnings: Number(balanceRow?.total_earnings ?? ugcEarnings),
      approvalRate,
      totalSubmissions: subs.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      activeProjects,
      pendingApplications,
      rpm: totalViews > 0 ? (ugcEarnings / totalViews) * 1000 : 0,
      cpm: totalViews > 0 ? (ugcEarnings / totalViews) * 1000 : 0,
    },
    topCampaigns,
    topVideos,
    recentSubmissions: subs.slice(0, 10),
  });
}
