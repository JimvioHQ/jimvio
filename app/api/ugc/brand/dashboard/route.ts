import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { brandIdFromRequest, requireBrandWorkspace } from "@/lib/ugc/enterprise/brand-access";
import { memberCan } from "@/lib/ugc/enterprise/permissions";
import {
  buildCampaignSchedule,
  scheduleKindLabel,
  type CampaignScheduleEvent,
  type CampaignScheduleKind,
} from "@/lib/ugc/campaign-schedule";
import { isUgcCampaignNotification } from "@/lib/ugc/ugc-notification-filter";

export const dynamic = "force-dynamic";

type AttentionItem = {
  id: string;
  kind: "submission_review" | "application_review" | "funding" | "deadline" | "ending";
  title: string;
  reason: string;
  campaignId: string;
  campaignTitle: string;
  href: string;
  actionLabel: string;
};

type ActiveCampaignCard = {
  id: string;
  title: string;
  status: string;
  bannerUrl: string | null;
  rewardLabel: string | null;
  creators: number;
  submissions: number;
  approvals: number;
  views: number;
  paidViews?: number;
  pendingReview?: number;
  budget?: number | null;
  remaining?: number | null;
  nextDateLabel: string | null;
  nextDate: string | null;
  href: string;
};

type UpcomingItem = {
  id: string;
  date: string;
  label: string;
  kind: string;
  campaignId: string;
  campaignTitle: string;
  href: string;
};

type PerformanceRow = {
  id: string;
  title: string;
  status: string;
  views: number;
  paidViews?: number;
  pendingReview?: number;
  budget?: number | null;
  remaining?: number | null;
  creators: number;
  submissions: number;
  approvals: number;
  spend: number | null;
};

type ActivityItem = {
  id: string;
  title: string;
  message: string;
  campaignTitle: string | null;
  href: string | null;
  createdAt: string | null;
};

type DashboardStats = {
  needsProfile?: boolean;
  summary?: {
    activeCampaigns: number;
    upcomingCampaigns: number;
    pendingApplications: number;
    pendingSubmissions: number;
    pendingFunding: number;
    totalSpend: number | null;
    totalViews: number;
    paidViews?: number;
    remainingBudget?: number | null;
    totalCreators: number;
  };
  attention?: AttentionItem[];
  activeCampaigns?: ActiveCampaignCard[];
  upcoming?: UpcomingItem[];
  campaignPerformance?: PerformanceRow[];
  activity?: ActivityItem[];
  fundableDraft?: { id: string; title: string } | null;
};

function rewardLabel(c: {
  payment_model?: string | null;
  fixed_rate?: number | null;
  max_payout_per_sub?: number | null;
  rate_per_1k_views?: number | null;
}): string | null {
  if (c.payment_model === "fixed_per_content") {
    const rate = Number(c.fixed_rate ?? 0);
    const max = Number(c.max_payout_per_sub ?? rate);
    if (rate <= 0) return null;
    if (max > rate) return `$${rate}–$${max} / video`;
    return `$${rate} / video`;
  }
  const rate = Number(c.rate_per_1k_views ?? 0);
  if (rate <= 0) return null;
  return `$${rate} / 1K views`;
}

function daysUntil(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / (1000 * 60 * 60 * 24));
}

function nextFutureEvent(
  events: CampaignScheduleEvent[],
  now: number,
): CampaignScheduleEvent | null {
  const future = events
    .map((e) => ({ e, t: Date.parse(e.date) }))
    .filter((x) => !Number.isNaN(x.t) && x.t >= now)
    .sort((a, b) => a.t - b.t);
  return future[0]?.e ?? null;
}

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
  const now = Date.now();

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
      payment_model,
      fixed_rate,
      max_payout_per_sub,
      rate_per_1k_views,
      starts_at,
      ends_at,
      content_deadline,
      live_at,
      submission_deadline,
      review_starts_at,
      review_ends_at,
      payment_at,
      created_at,
      updated_at,
      media:ugc_campaign_media(url, usage)
    `,
    )
    .eq("brand_id", vendor.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const ownedCampaigns = campaigns ?? [];
  const campaignIds = ownedCampaigns.map((c) => c.id);
  const titleById = new Map(ownedCampaigns.map((c) => [c.id, c.title]));

  const byStatus = {
    active: ownedCampaigns.filter((c) => c.status === "active"),
    draft: ownedCampaigns.filter((c) => c.status === "draft"),
  };

  const totalSpend = ownedCampaigns.reduce((sum, c) => sum + Number(c.spent_budget ?? 0), 0);
  const totalViews = ownedCampaigns.reduce(
    (sum, c) => sum + Number(c.total_views_tracked ?? 0),
    0,
  );

  const creatorsByCampaign = new Map<string, Set<string>>();
  const pendingAppsByCampaign = new Map<string, number>();
  const pendingSubsByCampaign = new Map<string, number>();
  const subStats = new Map<string, { total: number; approved: number; realViews: number; paidViews: number }>();
  const creatorSet = new Set<string>();

  if (campaignIds.length > 0) {
    const [{ data: participants }, { data: pendingSubs }, { data: customEvents }, { data: activityRows }] =
      await Promise.all([
        db
          .from("ugc_campaign_participants")
          .select("campaign_id, influencer_id, status")
          .in("campaign_id", campaignIds),
        db
          .from("ugc_submissions")
          .select("id, campaign_id, status, accepted_views, latest_views, baseline_views, verification_status")
          .in("campaign_id", campaignIds)
          .limit(5000),
        db
          .from("ugc_campaign_events")
          .select("id, campaign_id, event_type, title, description, starts_at, ends_at, metadata")
          .in("campaign_id", campaignIds)
          .order("starts_at", { ascending: true }),
        db
          .from("ugc_campaign_activity")
          .select("id, campaign_id, event_type, title, description, created_at, submission_id")
          .in("campaign_id", campaignIds)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    for (const p of participants ?? []) {
      const cid = String(p.campaign_id);
      if (p.influencer_id) {
        creatorSet.add(String(p.influencer_id));
        const set = creatorsByCampaign.get(cid) ?? new Set<string>();
        set.add(String(p.influencer_id));
        creatorsByCampaign.set(cid, set);
      }
      if (p.status === "pending" || p.status === "waitlisted") {
        pendingAppsByCampaign.set(cid, (pendingAppsByCampaign.get(cid) ?? 0) + 1);
      }
    }

    // Live counts from the submissions themselves (the stored counters can lag).
    for (const s of (pendingSubs ?? []) as {
      campaign_id: string;
      status: string;
      accepted_views: number | null;
      latest_views: number | null;
      baseline_views: number | null;
      verification_status: string | null;
    }[]) {
      const cid = String(s.campaign_id);
      const st = subStats.get(cid) ?? { total: 0, approved: 0, realViews: 0, paidViews: 0 };
      if (s.status !== "removed") st.total++;
      if (s.status === "approved") {
        st.approved++;
        st.paidViews += Number(s.accepted_views ?? 0);
      }
      if (s.verification_status === "verified" && s.latest_views != null && s.baseline_views != null) {
        st.realViews += Math.max(0, Number(s.latest_views) - Number(s.baseline_views));
      }
      subStats.set(cid, st);
      if (s.status === "pending" || s.status === "revision_requested") {
        pendingSubsByCampaign.set(cid, (pendingSubsByCampaign.get(cid) ?? 0) + 1);
      }
    }

    const eventsByCampaign = new Map<string, CampaignScheduleEvent[]>();
    for (const ev of customEvents ?? []) {
      const cid = String(ev.campaign_id);
      const list = eventsByCampaign.get(cid) ?? [];
      list.push({
        id: String(ev.id),
        kind: (ev.event_type as CampaignScheduleKind) || "custom",
        title: ev.title,
        description: ev.description ?? null,
        date: String(ev.starts_at),
        ends_at: ev.ends_at ? String(ev.ends_at) : null,
        metadata: (ev.metadata as Record<string, unknown> | null) ?? null,
      });
      eventsByCampaign.set(cid, list);
    }

    const attention: AttentionItem[] = [];

    for (const [cid, count] of pendingSubsByCampaign) {
      const title = titleById.get(cid) ?? "Campaign";
      attention.push({
        id: `subs-${cid}`,
        kind: "submission_review",
        title: count === 1 ? "1 submission needs review" : `${count} submissions need review`,
        reason: `Review creator content for ${title}.`,
        campaignId: cid,
        campaignTitle: title,
        href: `/ugc/review?campaign=${cid}`,
        actionLabel: "Review submissions",
      });
    }

    for (const [cid, count] of pendingAppsByCampaign) {
      const title = titleById.get(cid) ?? "Campaign";
      attention.push({
        id: `apps-${cid}`,
        kind: "application_review",
        title: count === 1 ? "1 application waiting for review" : `${count} applications waiting for review`,
        reason: `Creators are waiting on ${title}.`,
        campaignId: cid,
        campaignTitle: title,
        href: `/ugc/campaign-center/${cid}/participants`,
        actionLabel: "Review applications",
      });
    }

    for (const c of byStatus.draft) {
      attention.push({
        id: `fund-${c.id}`,
        kind: "funding",
        title: "Campaign funding required",
        reason: `${c.title} is ready to launch after funding.`,
        campaignId: c.id,
        campaignTitle: c.title,
        href: `/ugc/campaign-center/${c.id}/funding`,
        actionLabel: "Fund campaign",
      });
    }

    for (const c of ownedCampaigns) {
      if (c.status !== "active" && c.status !== "paused") continue;
      const contentDays = daysUntil(c.content_deadline, now);
      if (contentDays !== null && contentDays >= 0 && contentDays <= 7) {
        attention.push({
          id: `content-${c.id}`,
          kind: "deadline",
          title: "Deadline approaching",
          reason:
            contentDays === 0
              ? `Content deadline is today for ${c.title}`
              : `${contentDays} day${contentDays === 1 ? "" : "s"} until content deadline`,
          campaignId: c.id,
          campaignTitle: c.title,
          href: `/ugc/campaign-center/${c.id}/edit`,
          actionLabel: "View campaign",
        });
      }
      const endDays = daysUntil(c.ends_at, now);
      if (endDays !== null && endDays >= 0 && endDays <= 5) {
        attention.push({
          id: `end-${c.id}`,
          kind: "ending",
          title: "Campaign ending",
          reason:
            endDays === 0
              ? `${c.title} ends today`
              : `${endDays} day${endDays === 1 ? "" : "s"} until campaign end`,
          campaignId: c.id,
          campaignTitle: c.title,
          href: `/ugc/campaign-center/${c.id}/edit`,
          actionLabel: "View campaign",
        });
      }
    }

    const upcoming: UpcomingItem[] = [];
    for (const c of ownedCampaigns) {
      const schedule = buildCampaignSchedule(c, eventsByCampaign.get(c.id) ?? []);
      for (const ev of schedule) {
        const t = Date.parse(ev.date);
        if (Number.isNaN(t) || t < now) continue;
        upcoming.push({
          id: ev.id,
          date: ev.date,
          label: ev.title || scheduleKindLabel(ev.kind),
          kind: ev.kind,
          campaignId: c.id,
          campaignTitle: c.title,
          href: `/ugc/campaign-center/${c.id}/edit`,
        });
      }
    }
    upcoming.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

    const activeCampaigns: ActiveCampaignCard[] = byStatus.active.map((c) => {
      const media = Array.isArray(c.media) ? c.media : [];
      const banner =
        media.find((m: { usage?: string; url?: string }) => m.usage === "banner")?.url ??
        media[0]?.url ??
        null;
      const next = nextFutureEvent(buildCampaignSchedule(c, eventsByCampaign.get(c.id) ?? []), now);
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        bannerUrl: banner,
        rewardLabel: rewardLabel(c),
        creators: creatorsByCampaign.get(c.id)?.size ?? 0,
        submissions: subStats.get(c.id)?.total ?? 0,
        approvals: subStats.get(c.id)?.approved ?? 0,
        views: subStats.get(c.id)?.realViews ?? 0,
        paidViews: subStats.get(c.id)?.paidViews ?? 0,
        pendingReview: pendingSubsByCampaign.get(c.id) ?? 0,
        budget: showFinance ? Number(c.total_budget ?? 0) : null,
        remaining: showFinance ? Math.max(0, Number(c.total_budget ?? 0) - Number(c.spent_budget ?? 0)) : null,
        nextDateLabel: next ? next.title || scheduleKindLabel(next.kind) : null,
        nextDate: next?.date ?? null,
        href: `/ugc/campaign-center/${c.id}/edit`,
      };
    });

    const campaignPerformance: PerformanceRow[] = ownedCampaigns.slice(0, 12).map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      views: subStats.get(c.id)?.realViews ?? 0,
      paidViews: subStats.get(c.id)?.paidViews ?? 0,
      creators: creatorsByCampaign.get(c.id)?.size ?? 0,
      submissions: subStats.get(c.id)?.total ?? 0,
      approvals: subStats.get(c.id)?.approved ?? 0,
      spend: showFinance ? Number(c.spent_budget ?? 0) : null,
    }));

    const activity: ActivityItem[] = (activityRows ?? []).map((row) => ({
      id: String(row.id),
      title: row.title,
      message: row.description ?? "",
      campaignTitle: titleById.get(String(row.campaign_id)) ?? null,
      href: row.submission_id
        ? `/ugc/campaign-center/${row.campaign_id}/submissions`
        : `/ugc/campaign-center/${row.campaign_id}/edit`,
      createdAt: row.created_at ? String(row.created_at) : null,
    }));

    const pendingApplications = [...pendingAppsByCampaign.values()].reduce((a, b) => a + b, 0);
    const pendingSubmissions = [...pendingSubsByCampaign.values()].reduce((a, b) => a + b, 0);
    const upcomingCampaigns = ownedCampaigns.filter((c) => {
      if (c.status === "completed" || c.status === "cancelled") return false;
      return Boolean(c.starts_at && Date.parse(String(c.starts_at)) > now);
    }).length;

    return NextResponse.json({
      summary: {
        activeCampaigns: byStatus.active.length,
        upcomingCampaigns,
        pendingApplications,
        pendingSubmissions,
        pendingFunding: byStatus.draft.length,
        totalSpend: showFinance ? totalSpend : null,
        totalViews: [...subStats.values()].reduce((a, b) => a + b.realViews, 0) || totalViews,
        paidViews: [...subStats.values()].reduce((a, b) => a + b.paidViews, 0),
        remainingBudget: showFinance
          ? byStatus.active.reduce((a, c) => a + Math.max(0, Number(c.total_budget ?? 0) - Number(c.spent_budget ?? 0)), 0)
          : null,
        totalCreators: creatorSet.size,
      },
      attention: attention.slice(0, 8),
      activeCampaigns,
      upcoming: upcoming.slice(0, 8),
      campaignPerformance,
      activity: activity.slice(0, 8),
      fundableDraft: byStatus.draft[0] ? { id: byStatus.draft[0].id, title: byStatus.draft[0].title } : null,
    } satisfies DashboardStats);
  }

  const { data: notifications } = await db
    .from("notifications")
    .select("id, title, message, type, category, action_url, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const filteredNotifs = (notifications ?? []).filter((n) =>
    isUgcCampaignNotification({
      category: n.category,
      type: n.type,
      title: n.title,
      message: n.message,
      actionUrl: n.action_url,
    }),
  );

  return NextResponse.json({
    summary: {
      activeCampaigns: 0,
      upcomingCampaigns: 0,
      pendingApplications: 0,
      pendingSubmissions: 0,
      pendingFunding: 0,
      totalSpend: showFinance ? 0 : null,
      totalViews: 0,
      totalCreators: 0,
    },
    attention: [],
    activeCampaigns: [],
    upcoming: [],
    campaignPerformance: [],
    activity: filteredNotifs.slice(0, 8).map((n) => ({
      id: String(n.id),
      title: n.title ?? "Update",
      message: n.message ?? "",
      campaignTitle: null,
      href: n.action_url ?? null,
      createdAt: n.created_at ? String(n.created_at) : null,
    })),
    fundableDraft: null,
  } satisfies DashboardStats);
}
