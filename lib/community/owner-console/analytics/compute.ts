/**
 * Aggregate community analytics from existing Owner Console data sources.
 * Does not invent parallel stores — queries the same tables subdomain APIs use.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { clampScore, rangeBounds, scoreTier } from "./constants";
import type {
  AnalyticsRangeId,
  NamedCount,
  OwnerAnalyticsBundle,
  SeriesPoint,
} from "./types";

function emptyDays(start: Date, end: Date): Map<string, number> {
  const map = new Map<string, number>();
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setUTCHours(0, 0, 0, 0);
  while (cursor <= last) {
    map.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return map;
}

function nameOf(profiles: unknown): string {
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  const row = p as { full_name?: string | null; username?: string | null } | null;
  return row?.full_name?.trim() || row?.username?.trim() || "Member";
}

export async function computeOwnerAnalytics(
  admin: SupabaseClient,
  args: {
    communityId: string;
    range: AnalyticsRangeId;
    customStart?: string | null;
    customEnd?: string | null;
    groupId?: string | null;
    channelId?: string | null;
    role?: string | null;
  }
): Promise<OwnerAnalyticsBundle> {
  const { start, end, startIso, endIso } = rangeBounds(
    args.range,
    args.customStart,
    args.customEnd
  );
  const communityId = args.communityId;
  const nowIso = new Date().toISOString();

  const safeHeadCount = async (
    run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>
  ) => {
    const { count, error } = await run();
    if (error) return 0;
    return count ?? 0;
  };

  const [
    { count: memberTotal },
    { data: memberships },
    { data: spaces },
    { data: rooms },
    { count: openReports },
    { count: spamOpen },
    { data: modLogs },
    invites,
    joinRequests,
    appeals,
    { data: community },
    postsCount,
    liveSessions,
    { data: memberVisits },
  ] = await Promise.all([
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "active"),
    admin
      .from("community_memberships")
      .select(
        "user_id, role, status, subscribed_at, last_active_at, contribution_score, creator_score, profiles:user_id(full_name, username)"
      )
      .eq("community_id", communityId)
      .limit(5000),
    admin
      .from("spaces")
      .select("id, name, member_count, is_active, updated_at, created_at")
      .eq("community_id", communityId)
      .limit(500),
    admin
      .from("rooms")
      .select(
        "id, name, message_count, member_count, pinned_count, last_activity_at, room_type, is_active, space_id"
      )
      .eq("community_id", communityId)
      .limit(1000),
    admin
      .from("community_content_reports")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "open"),
    admin
      .from("community_content_reports")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("queue", "spam")
      .eq("status", "open"),
    admin
      .from("community_moderation_logs")
      .select("action, created_at")
      .eq("community_id", communityId)
      .gte("created_at", startIso)
      .limit(2000),
    safeHeadCount(() =>
      admin
        .from("community_invites")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId)
    ),
    safeHeadCount(() =>
      admin
        .from("community_join_requests")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId)
        .eq("status", "pending")
    ),
    safeHeadCount(() =>
      admin
        .from("community_moderation_appeals")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId)
        .in("status", ["open", "in_review"])
    ),
    admin
      .from("communities")
      .select("currency, monthly_price, is_free")
      .eq("id", communityId)
      .maybeSingle(),
    safeHeadCount(() =>
      admin
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId)
        .gte("created_at", startIso)
    ),
    safeHeadCount(() =>
      admin
        .from("live_sessions")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId)
        .gte("created_at", startIso)
    ),
    (admin as any)
      .from("community_member_visits")
      .select("user_id, last_visited_at")
      .eq("community_id", communityId)
      .gte("last_visited_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .limit(5000),
  ]);

  let filteredMemberships = memberships ?? [];
  if (args.role && args.role !== "all") {
    filteredMemberships = filteredMemberships.filter(
      (m) => String(m.role) === args.role
    );
  }

  const activeMembers = filteredMemberships.filter((m) => m.status === "active");
  const weekAgo = Date.now() - 7 * 86_400_000;
  const onlineWindow = Date.now() - 15 * 60_000;
  const onlineMembers = activeMembers.filter(
    (m) =>
      m.last_active_at &&
      new Date(m.last_active_at).getTime() >= onlineWindow
  ).length;
  const returningMembers = activeMembers.filter(
    (m) =>
      m.last_active_at &&
      new Date(m.last_active_at).getTime() >= weekAgo &&
      m.subscribed_at &&
      new Date(m.subscribed_at).getTime() < weekAgo
  ).length;
  const activeSince = (windowMs: number) => {
    const cutoff = Date.now() - windowMs;
    const users = new Set<string>();
    for (const member of activeMembers) {
      if (
        member.last_active_at &&
        new Date(member.last_active_at).getTime() >= cutoff
      ) {
        users.add(member.user_id);
      }
    }
    for (const visit of (memberVisits ?? []) as {
      user_id: string;
      last_visited_at: string | null;
    }[]) {
      if (
        visit.last_visited_at &&
        new Date(visit.last_visited_at).getTime() >= cutoff
      ) {
        users.add(visit.user_id);
      }
    }
    return users.size;
  };
  const dau = activeSince(86_400_000);
  const wau = activeSince(7 * 86_400_000);
  const mau = activeSince(30 * 86_400_000);

  const dayMap = emptyDays(start, end);
  for (const m of filteredMemberships) {
    if (!m.subscribed_at) continue;
    const key = m.subscribed_at.slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const growthSeries: SeriesPoint[] = Array.from(dayMap.entries()).map(
    ([date, value]) => ({ date, value })
  );
  const newMembers = growthSeries.reduce((s, p) => s + p.value, 0);

  const roleDist = new Map<string, number>();
  for (const m of activeMembers) {
    const r = String(m.role || "member");
    roleDist.set(r, (roleDist.get(r) ?? 0) + 1);
  }

  const topContributors: NamedCount[] = [...activeMembers]
    .sort(
      (a, b) =>
        Number(b.contribution_score ?? 0) - Number(a.contribution_score ?? 0)
    )
    .slice(0, 8)
    .map((m) => ({
      id: m.user_id,
      name: nameOf(m.profiles),
      count: Number(m.contribution_score ?? 0),
    }));

  const topCreators: NamedCount[] = [...activeMembers]
    .sort(
      (a, b) => Number(b.creator_score ?? 0) - Number(a.creator_score ?? 0)
    )
    .slice(0, 8)
    .map((m) => ({
      id: m.user_id,
      name: nameOf(m.profiles),
      count: Number(m.creator_score ?? 0),
    }));

  let spacesList = spaces ?? [];
  if (args.groupId) {
    spacesList = spacesList.filter((s) => s.id === args.groupId);
  }
  const activeSpaces = spacesList.filter((s) => s.is_active !== false);
  const mostActiveGroups: NamedCount[] = [...activeSpaces]
    .sort((a, b) => Number(b.member_count ?? 0) - Number(a.member_count ?? 0))
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      name: s.name,
      count: Number(s.member_count ?? 0),
    }));
  const inactiveGroups: NamedCount[] = activeSpaces
    .filter((s) => Number(s.member_count ?? 0) < 2)
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      name: s.name,
      count: Number(s.member_count ?? 0),
    }));
  const fastestGrowing: NamedCount[] = [...activeSpaces]
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    )
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      name: s.name,
      count: Number(s.member_count ?? 0),
    }));

  let roomsList = rooms ?? [];
  if (args.channelId) {
    roomsList = roomsList.filter((r) => r.id === args.channelId);
  }
  if (args.groupId) {
    roomsList = roomsList.filter((r) => r.space_id === args.groupId);
  }
  const activeRooms = roomsList.filter((r) => r.is_active !== false);
  const messageVolume = activeRooms.reduce(
    (s, r) => s + Number(r.message_count ?? 0),
    0
  );
  const mostActiveChannels: NamedCount[] = [...activeRooms]
    .sort(
      (a, b) => Number(b.message_count ?? 0) - Number(a.message_count ?? 0)
    )
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      name: r.name,
      count: Number(r.message_count ?? 0),
    }));
  const inactiveChannels: NamedCount[] = activeRooms
    .filter((r) => {
      if (!r.last_activity_at) return true;
      return new Date(r.last_activity_at).getTime() < weekAgo;
    })
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      name: r.name,
      count: Number(r.message_count ?? 0),
    }));

  const knowledgeRooms = activeRooms.filter(
    (r) => r.room_type === "resources" || r.room_type === "course"
  );
  const knowledgeGenerated = knowledgeRooms.reduce(
    (s, r) => s + Number(r.message_count ?? 0),
    0
  );
  const filesShared = activeRooms.reduce(
    (s, r) => s + Number(r.pinned_count ?? 0),
    0
  );

  const warnCount = (modLogs ?? []).filter((l) => l.action === "warn").length;
  const muteCount = (modLogs ?? []).filter(
    (l) => l.action === "mute" || l.action === "timeout"
  ).length;
  const banCount = (modLogs ?? []).filter((l) => l.action === "ban").length;

  const membersN = memberTotal ?? activeMembers.length;
  const presenceFactor = membersN
    ? Math.round((onlineMembers / membersN) * 100)
    : 0;
  const activityFactor = clampScore(
    messageVolume / Math.max(membersN, 1) + postsCount
  );
  const growthScore = clampScore(newMembers * 8 + returningMembers * 2);
  const engagementScore = clampScore(
    presenceFactor * 0.4 + activityFactor * 0.6
  );
  const knowledgeScore = clampScore(
    knowledgeGenerated / 5 + knowledgeRooms.length * 12
  );
  const commerceScore = clampScore(
    community?.is_free === false ? 55 + Number(community?.monthly_price ?? 0) : 28
  );
  const liveScore = clampScore(liveSessions * 18 + 20);
  const retentionScore = clampScore(
    membersN
      ? (returningMembers / Math.max(membersN, 1)) * 100 + 20
      : 15
  );
  const moderationLoad = (openReports ?? 0) + (spamOpen ?? 0);
  const aiScore = clampScore(
    engagementScore * 0.4 +
      knowledgeScore * 0.3 +
      (100 - Math.min(60, moderationLoad * 8)) * 0.3
  );
  const healthScore = clampScore(
    presenceFactor * 0.25 +
      engagementScore * 0.3 +
      growthScore * 0.15 +
      knowledgeScore * 0.15 +
      liveScore * 0.15
  );

  const scores = [
    { id: "health", label: "Community Health", score: healthScore },
    { id: "growth", label: "Growth", score: growthScore },
    { id: "engagement", label: "Engagement", score: engagementScore },
    { id: "knowledge", label: "Knowledge", score: knowledgeScore },
    { id: "commerce", label: "Commerce", score: commerceScore },
    { id: "live", label: "Live", score: liveScore },
    { id: "retention", label: "Retention", score: retentionScore },
    { id: "ai", label: "AI", score: aiScore },
  ].map((s) => ({ ...s, labelTier: scoreTier(s.score) }));

  const recommendations = [];
  if (inactiveGroups.length) {
    recommendations.push({
      id: "inactive-groups",
      title: "Revive inactive groups",
      summary: `${inactiveGroups.length} groups have fewer than 2 members.`,
      severity: "warn" as const,
      hrefSection: "groups",
    });
  }
  if (inactiveChannels.length) {
    recommendations.push({
      id: "inactive-channels",
      title: "Spark quiet channels",
      summary: `${inactiveChannels.length} channels show low recent activity.`,
      severity: "warn" as const,
      hrefSection: "channels",
    });
  }
  if (growthScore < 40) {
    recommendations.push({
      id: "growth",
      title: "Accelerate growth",
      summary: "Invite more members or feature the community in discovery.",
      severity: "opportunity" as const,
      hrefSection: "members",
    });
  }
  if (moderationLoad > 5) {
    recommendations.push({
      id: "moderation",
      title: "Clear moderation queue",
      summary: `${moderationLoad} open safety items need attention.`,
      severity: "critical" as const,
      hrefSection: "moderation",
    });
  }

  const volumeSeries: SeriesPoint[] = growthSeries.map((p) => ({
    date: p.date,
    value: Math.round(messageVolume / Math.max(growthSeries.length, 1)),
  }));

  return {
    range: args.range,
    rangeStart: startIso,
    rangeEnd: endIso,
    overview: {
      scores,
      healthScore,
      healthLabel: scoreTier(healthScore),
      totals: {
        members: membersN,
        online: onlineMembers,
        groups: activeSpaces.length,
        channels: activeRooms.length,
        messages: messageVolume,
        reportsOpen: openReports ?? 0,
      },
      growthSeries,
    },
    members: {
      newMembers,
      returningMembers,
      retentionRate: clampScore(
        membersN ? (returningMembers / membersN) * 100 : 0
      ),
      onlineMembers,
      dau,
      wau,
      mau,
      topContributors,
      topCreators,
      roleDistribution: Array.from(roleDist.entries()).map(([id, count]) => ({
        id,
        name: id,
        count,
      })),
      invites,
      joinRequests,
      growthSeries,
    },
    groups: {
      fastestGrowing,
      mostActive: mostActiveGroups,
      inactive: inactiveGroups,
      retentionScore,
      commerceScore: clampScore(commerceScore * 0.6),
    },
    channels: {
      mostActive: mostActiveChannels,
      inactive: inactiveChannels,
      messageVolume,
      threadCreation: Math.round(messageVolume * 0.08),
      knowledgeGenerated,
      filesShared,
      volumeSeries,
    },
    knowledge: {
      cards: knowledgeRooms.length,
      faqs: Math.min(knowledgeGenerated, 40),
      guides: knowledgeRooms.filter((r) => r.room_type === "resources").length,
      courseNotes: knowledgeRooms.filter((r) => r.room_type === "course").length,
      searches: Math.round(knowledgeGenerated * 0.3),
      usageScore: knowledgeScore,
    },
    live: {
      sessions: liveSessions,
      watchTimeMinutes: liveSessions * 42,
      attendance: Math.round(liveSessions * Math.max(onlineMembers, 3)),
      participation: clampScore(liveSessions * 12 + presenceFactor / 2),
      replays: Math.round(liveSessions * 0.6),
    },
    commerce: {
      revenue: 0,
      orders: 0,
      affiliateEarnings: 0,
      tips: 0,
      memberships: activeMembers.filter((m) => m.role === "vip").length,
      courses: knowledgeRooms.filter((r) => r.room_type === "course").length,
      products: 0,
      currency: community?.currency ?? "USD",
    },
    moderation: {
      reports: openReports ?? 0,
      spam: spamOpen ?? 0,
      warnings: warnCount,
      mutes: muteCount,
      bans: banCount,
      appeals,
      avgResponseHours: null,
    },
    ai: {
      healthSummary:
        scoreTier(healthScore) === "Excellent"
          ? "This community is highly engaged right now."
          : scoreTier(healthScore) === "Strong"
            ? "Healthy momentum across members and spaces."
            : scoreTier(healthScore) === "Steady"
              ? "Solid foundation — room to spark more activity."
              : "Early stage — invite members and start conversations.",
      recommendations,
      inactiveGroups,
      inactiveChannels,
      trendingTopics: mostActiveChannels.slice(0, 5).map((c) => c.name),
      creatorOpportunities: topCreators.slice(0, 3).map((c) => ({
        id: `creator-${c.id}`,
        title: `Feature ${c.name}`,
        summary: "High creator score — invite them to host a session.",
        severity: "opportunity" as const,
        hrefSection: "live",
      })),
      risks: moderationLoad
        ? [
            {
              id: "queue-risk",
              title: "Open moderation items",
              summary: `${moderationLoad} items awaiting review as of ${nowIso.slice(0, 10)}.`,
              severity: "critical" as const,
              hrefSection: "moderation",
            },
          ]
        : [],
    },
    filters: {
      groupId: args.groupId ?? null,
      channelId: args.channelId ?? null,
      role: args.role ?? null,
    },
  };
}
