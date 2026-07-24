"use client";

import type { AnalyticsSectionId, OwnerAnalyticsBundle } from "@/lib/community/owner-console/analytics";
import {
  AiInsightsPanel,
  MetricCards,
  RankedList,
  RoleDistributionChart,
  ScoreGrid,
  SeriesChart,
} from "./AnalyticsCharts";

export function AnalyticsSectionBody({
  section,
  analytics,
}: {
  section: AnalyticsSectionId;
  analytics: OwnerAnalyticsBundle;
}) {
  if (section === "overview") {
    return (
      <div className="space-y-5">
        <ScoreGrid scores={analytics.overview.scores} />
        <MetricCards
          items={[
            { label: "Members", value: analytics.overview.totals.members },
            { label: "Online", value: analytics.overview.totals.online },
            { label: "Groups", value: analytics.overview.totals.groups },
            { label: "Channels", value: analytics.overview.totals.channels },
            { label: "Messages", value: analytics.overview.totals.messages },
            { label: "Open reports", value: analytics.overview.totals.reportsOpen },
            {
              label: "Health",
              value: `${analytics.overview.healthScore} · ${analytics.overview.healthLabel}`,
            },
          ]}
        />
        <SeriesChart title="Member growth" data={analytics.overview.growthSeries} />
      </div>
    );
  }

  if (section === "members" || section === "growth" || section === "retention") {
    const m = analytics.members;
    return (
      <div className="space-y-5">
        <MetricCards
          items={[
            { label: "New members", value: m.newMembers },
            { label: "Returning", value: m.returningMembers },
            { label: "Retention", value: `${m.retentionRate}%` },
            { label: "Online", value: m.onlineMembers },
            { label: "Invites", value: m.invites },
            { label: "Join requests", value: m.joinRequests },
          ]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <RankedList title="Top contributors" rows={m.topContributors} />
          <RankedList title="Top creators" rows={m.topCreators} />
        </div>
        <RoleDistributionChart rows={m.roleDistribution} />
        <SeriesChart title="Joins over time" data={m.growthSeries} />
      </div>
    );
  }

  if (section === "groups") {
    const g = analytics.groups;
    return (
      <div className="space-y-5">
        <MetricCards
          items={[
            { label: "Group retention", value: g.retentionScore },
            { label: "Group commerce", value: g.commerceScore },
          ]}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <RankedList title="Fastest growing" rows={g.fastestGrowing} />
          <RankedList title="Most active" rows={g.mostActive} />
          <RankedList title="Inactive groups" rows={g.inactive} />
        </div>
      </div>
    );
  }

  if (section === "channels" || section === "messages" || section === "engagement") {
    const c = analytics.channels;
    return (
      <div className="space-y-5">
        <MetricCards
          items={[
            { label: "Message volume", value: c.messageVolume },
            { label: "Threads", value: c.threadCreation },
            { label: "Knowledge generated", value: c.knowledgeGenerated },
            { label: "Files shared", value: c.filesShared },
          ]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <RankedList title="Most active channels" rows={c.mostActive} />
          <RankedList title="Inactive channels" rows={c.inactive} />
        </div>
        <SeriesChart title="Message volume trend" data={c.volumeSeries} />
      </div>
    );
  }

  if (section === "knowledge" || section === "courses") {
    const k = analytics.knowledge;
    return (
      <div className="space-y-5">
        <MetricCards
          items={[
            { label: "Knowledge cards", value: k.cards },
            { label: "FAQs", value: k.faqs },
            { label: "Guides", value: k.guides },
            { label: "Course notes", value: k.courseNotes },
            { label: "Searches", value: k.searches },
            { label: "Usage score", value: k.usageScore },
          ]}
        />
      </div>
    );
  }

  if (section === "live" || section === "events") {
    const l = analytics.live;
    return (
      <div className="space-y-5">
        <MetricCards
          items={[
            { label: "Sessions", value: l.sessions },
            { label: "Watch time (min)", value: l.watchTimeMinutes },
            { label: "Attendance", value: l.attendance },
            { label: "Participation", value: l.participation },
            { label: "Replays", value: l.replays },
          ]}
        />
      </div>
    );
  }

  if (section === "commerce") {
    const c = analytics.commerce;
    return (
      <div className="space-y-5">
        <MetricCards
          items={[
            { label: `Revenue (${c.currency})`, value: c.revenue },
            { label: "Orders", value: c.orders },
            { label: "Affiliate", value: c.affiliateEarnings },
            { label: "Tips", value: c.tips },
            { label: "Memberships", value: c.memberships },
            { label: "Courses", value: c.courses },
            { label: "Products", value: c.products },
          ]}
        />
      </div>
    );
  }

  if (section === "moderation") {
    const m = analytics.moderation;
    return (
      <div className="space-y-5">
        <MetricCards
          items={[
            { label: "Reports", value: m.reports },
            { label: "Spam", value: m.spam },
            { label: "Warnings", value: m.warnings },
            { label: "Mutes", value: m.mutes },
            { label: "Bans", value: m.bans },
            { label: "Appeals", value: m.appeals },
            {
              label: "Avg response (h)",
              value: m.avgResponseHours ?? "—",
            },
          ]}
        />
      </div>
    );
  }

  return <AiInsightsPanel analytics={analytics} />;
}
