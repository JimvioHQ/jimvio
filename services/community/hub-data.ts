import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { aggregateMemberPoints, buildPointsSnapshot, levelFromTotalPoints, progressPercentInLevel } from "@/lib/community/points";
import { isCallSignalingMessage, isTechnicalFeedBody } from "@/lib/community/message-signaling";
import { resolveCommunityMemberCount, resolveSpaceMemberCount } from "@/lib/community/member-count";

const ONLINE_WINDOW_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatDelta(current: number, previous: number): string | null {
  const diff = current - previous;
  if (diff === 0) return null;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toLocaleString()} today`;
}

async function getUserCommunityIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: memberships } = await supabase
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", userId)
    .eq("status", "active");

  return (memberships ?? []).map((m) => m.community_id);
}

/** Joined + publicly discoverable communities the user may browse Spaces for. */
async function getAccessibleCommunityIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string[]> {
  const joined = await getUserCommunityIds(supabase, userId);
  const ids = new Set(joined);

  const { data: owned } = await supabase
    .from("communities")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_active", true);
  for (const row of owned ?? []) ids.add(row.id);

  const { data: publicRows } = await supabase
    .from("communities")
    .select("id")
    .eq("is_active", true)
    .or("is_private.eq.false,is_private.is.null")
    .limit(500);
  for (const row of publicRows ?? []) ids.add(row.id);

  return [...ids];
}

import { pickPrimarySpaceCandidate } from "@/lib/community/workspace/primary-space";

export type HubPlatformStats = {
  membersOnline: number;
  membersOnlineDelta: string | null;
  liveSessions: number;
  liveSessionsDelta: string | null;
  voiceRooms: number;
  voiceRoomsDelta: string | null;
  activeCommunities: number;
  activeCommunitiesDelta: string | null;
};

export type HubStory = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  href: string;
  live: boolean;
};

export type HubUserSnapshot = {
  fullName: string;
  avatarUrl: string | null;
  username: string | null;
  points: ReturnType<typeof buildPointsSnapshot>;
};

export type HubCreatorInsights = {
  postCount30d: number;
  engagement30d: number;
  communitiesJoined: number;
};

export type HubEarnings = {
  total: number;
  monthChangePct: number | null;
  currency: string;
};

export type HubChallenge = {
  title: string;
  description: string;
  completed: number;
  target: number;
} | null;

export type HubFeaturedLive = {
  id: string;
  title: string;
  hostName: string;
  href: string;
  watchingLabel: string | null;
} | null;

export type HubEventItem = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  attendee_count: number;
  is_going: boolean;
  kind: "task" | "campaign";
  href: string | null;
};

export type HubSpaceItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  community_avatar_url: string | null;
  community_id: string;
  community_name: string;
  community_slug: string;
  room_count: number;
  member_count: number;
  href: string;
  access_type: string;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
};

export type HubMissionItem = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  points: number;
  completion_count: number;
  is_completed: boolean;
  community_name: string;
  community_slug: string;
  href: string;
};

export type HubCourseItem = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  category?: string | null;
  tags?: string[];
  total_lessons: number;
  progress: number;
  community_name: string;
  community_slug: string;
  instructor_name?: string | null;
  instructor_id?: string;
  href: string;
};

export type HubLiveRoom = {
  id: string;
  name: string;
  community_id?: string | null;
  community_name: string;
  community_slug: string;
  space_slug: string;
  room_slug: string;
  message_count: number;
  href: string;
};

export type OverviewMember = {
  id: string;
  name: string;
  avatar_url: string | null;
  username?: string | null;
  status?: string;
  role?: string;
};

export type OverviewCourse = {
  id: string;
  title: string;
  difficulty: string;
  total_lessons: number;
  progress: number;
  href: string;
  cover_image?: string | null;
};

export type OverviewPost = {
  id: string;
  title: string | null;
  body: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  href: string;
  image_url: string | null;
  author: OverviewMember;
};

export type OverviewGalleryItem = {
  id: string;
  url: string;
  label: string;
};

export type OverviewChallenge = {
  id: string;
  title: string;
  due_date: string | null;
  href: string;
};

export type OverviewAchievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

export type OverviewFaq = {
  question: string;
  answer: string;
};

export type OverviewSimilarCommunity = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  cover_image: string | null;
  member_count: number;
  tagline: string | null;
};

export type OverviewInsight = {
  id: string;
  icon: "sparkles" | "trending" | "users" | "clock" | "flame";
  headline: string;
  subtext: string;
};

export type OverviewLiveSession = {
  id: string;
  title: string;
  room_name: string;
  href: string;
  active_count: number;
} | null;

export type OverviewHealthScore = {
  score: number;
  label: "Excellent" | "Strong" | "Steady" | "Building";
  summary: string;
  factors: Array<{ id: string; label: string; score: number }>;
};

export type OverviewMissionVision = {
  mission: string | null;
  vision: string | null;
};

export type OverviewGrowthPoint = {
  label: string;
  joins: number;
};

export type OverviewHighlight = {
  id: string;
  title: string;
  meta: string;
  href: string;
  kind: "post" | "course" | "contributor" | "activity" | "challenge";
};

export type OverviewTrustedBadge = {
  id: string;
  label: string;
  description: string;
  tone: "verified" | "featured" | "secure" | "active" | "learning" | "staff";
};

export type OverviewQuickAction = {
  id: string;
  label: string;
  href: string;
  icon: "feed" | "chat" | "live" | "courses" | "invite" | "ranks" | "events";
};

export type OverviewMilestone = {
  id: string;
  title: string;
  description: string;
  reached: boolean;
  dateLabel: string | null;
};

export type OverviewAiWeeklySummary = {
  headline: string;
  paragraphs: string[];
  generatedFrom: string[];
};

export type CommunityOverviewStats = {
  membersOnline: number;
  membersOnlineDelta: string | null;
  liveNow: number;
  liveNowDelta: string | null;
  voiceRooms: number;
  voiceRoomsDelta: string | null;
  courseCount: number;
  courseCountDelta: string | null;
  totalEarned: number;
  totalEarnedDelta: string | null;
  activeRoomCount: number;
  messagesThisWeek: number;
  description: string | null;
  tagline: string | null;
  coverImage: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  isFree: boolean;
  category: string | null;
  tags: string[];
  memberCount: number;
  postCount: number;
  createdAt: string | null;
  rules: string[];
  founder: OverviewMember | null;
  moderators: OverviewMember[];
  memberAvatars: OverviewMember[];
  gallery: OverviewGalleryItem[];
  featuredPosts: OverviewPost[];
  featuredCourse: OverviewCourse | null;
  challenges: OverviewChallenge[];
  activeLiveSession: OverviewLiveSession;
  achievements: OverviewAchievement[];
  faq: OverviewFaq[];
  similarCommunities: OverviewSimilarCommunity[];
  insights: OverviewInsight[];
  weeklyActivity: number[];
  healthScore: OverviewHealthScore | null;
  missionVision: OverviewMissionVision | null;
  memberGrowth: OverviewGrowthPoint[];
  membersJoinedThisWeek: number;
  weeklyHighlights: OverviewHighlight[];
  trustedBadges: OverviewTrustedBadge[];
  quickActions: OverviewQuickAction[];
  milestones: OverviewMilestone[];
  aiWeeklySummary: OverviewAiWeeklySummary | null;
  courses: OverviewCourse[];
  upcomingEvents: Array<{
    id: string;
    title: string;
    start_date: string;
    href: string;
  }>;
  activeMembers: OverviewMember[];
  recentActivity: Array<{
    id: string;
    text: string;
    time: string;
    href: string;
  }>;
  popularThisWeek: Array<{
    id: string;
    title: string;
    meta: string;
    href: string;
  }>;
  topContributors: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    points: number;
  }>;
  progressBreakdown: {
    challenges: number;
    riddles: number;
    members: number;
    rankPercent: number;
    communityLevel: number;
    communityProgress: number;
    memberTopPercent: number;
  };
};

export async function getHubPlatformStats(): Promise<HubPlatformStats> {
  const supabase = await createClient();
  const now = Date.now();
  const onlineCutoff = new Date(now - ONLINE_WINDOW_MS).toISOString();
  const dayAgo = new Date(now - DAY_MS).toISOString();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();

  const [
    onlineNowRes,
    onlinePrevRes,
    communitiesRes,
    newCommunitiesRes,
    recentMessagesRes,
    prevMessagesRes,
    chatRoomsRes,
  ] = await Promise.all([
    supabase
      .from("member_points")
      .select("id", { count: "exact", head: true })
      .gte("last_active_at", onlineCutoff),
    supabase
      .from("member_points")
      .select("id", { count: "exact", head: true })
      .gte("last_active_at", dayAgo)
      .lt("last_active_at", onlineCutoff),
    supabase
      .from("communities")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("communities")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("created_at", dayAgo),
    supabase
      .from("community_messages")
      .select("room_id")
      .gte("created_at", hourAgo)
      .limit(1000),
    supabase
      .from("community_messages")
      .select("room_id")
      .gte("created_at", twoHoursAgo)
      .lt("created_at", hourAgo)
      .limit(1000),
    supabase
      .from("rooms")
      .select("id")
      .eq("is_active", true)
      .eq("room_type", "chat"),
  ]);

  const liveNow = new Set((recentMessagesRes.data ?? []).map((m) => m.room_id)).size;
  const livePrev = new Set((prevMessagesRes.data ?? []).map((m) => m.room_id)).size;
  const chatRoomIds = new Set((chatRoomsRes.data ?? []).map((r) => r.id));
  const activeChatRooms = (recentMessagesRes.data ?? []).filter((m) => chatRoomIds.has(m.room_id));
  const voiceNow = new Set(activeChatRooms.map((m) => m.room_id)).size;

  const membersOnline = onlineNowRes.count ?? 0;
  const membersOnlinePrev = onlinePrevRes.count ?? 0;
  const activeCommunities = communitiesRes.count ?? 0;

  return {
    membersOnline,
    membersOnlineDelta: formatDelta(membersOnline, membersOnlinePrev),
    liveSessions: liveNow,
    liveSessionsDelta: formatDelta(liveNow, livePrev),
    voiceRooms: voiceNow,
    voiceRoomsDelta: formatDelta(voiceNow, Math.max(0, livePrev - 1)),
    activeCommunities,
    activeCommunitiesDelta: newCommunitiesRes.count
      ? `+${newCommunitiesRes.count} today`
      : null,
  };
}

export async function getHubStories(userId: string): Promise<HubStory[]> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);
  if (communityIds.length === 0) return [];

  const dayAgo = new Date(Date.now() - DAY_MS).toISOString();
  const liveCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const nowIso = new Date().toISOString();

  // Prefer real community_stories when available; fall back to post-derived rings.
  const { data: storyRows, error: storiesError } = await (supabase as any)
    .from("community_stories")
    .select(
      "author_id, created_at, expires_at, community_id, profiles!community_stories_author_id_fkey(full_name, avatar_url, username)"
    )
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!storiesError && Array.isArray(storyRows) && storyRows.length > 0) {
    const communitySet = new Set(communityIds);
    const seen = new Set<string>();
    const stories: HubStory[] = [];

    for (const row of storyRows) {
      if (!row.author_id || seen.has(row.author_id)) continue;
      // Include public/followers stories and those scoped to user's communities
      if (
        row.community_id &&
        !communitySet.has(row.community_id) &&
        row.author_id !== userId
      ) {
        continue;
      }
      seen.add(row.author_id);

      const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
      } | null;

      const name = profile?.full_name ?? profile?.username ?? "Member";
      stories.push({
        id: row.author_id,
        name,
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
        href: profile?.username
          ? `/u/${profile.username}`
          : "/communities/profile",
        live: (row.created_at ?? "") >= liveCutoff,
      });

      if (stories.length >= 8) break;
    }

    if (stories.length > 0) return stories;
  }

  const { data: posts } = await supabase
    .from("community_posts")
    .select(
      "author_id, created_at, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)"
    )
    .in("community_id", communityIds)
    .eq("is_published", true)
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .limit(40);

  const seen = new Set<string>();
  const stories: HubStory[] = [];

  for (const post of posts ?? []) {
    if (!post.author_id || seen.has(post.author_id)) continue;
    seen.add(post.author_id);

    const profile = post.profiles as {
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
    } | null;

    const name = profile?.full_name ?? profile?.username ?? "Member";
    stories.push({
      id: post.author_id,
      name,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      href: profile?.username ? `/u/${profile.username}` : "/communities/profile",
      live: (post.created_at ?? "") >= liveCutoff,
    });

    if (stories.length >= 8) break;
  }

  return stories;
}

export async function getHubUserSnapshot(userId: string): Promise<HubUserSnapshot | null> {
  const supabase = await createClient();

  const [profileRes, pointsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, username")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("member_points")
      .select("total_points, level, streak_days")
      .eq("user_id", userId),
  ]);

  if (!profileRes.data) return null;

  return {
    fullName: profileRes.data.full_name ?? profileRes.data.username ?? "Member",
    avatarUrl: profileRes.data.avatar_url,
    username: profileRes.data.username,
    points: aggregateMemberPoints(pointsRes.data ?? []),
  };
}

export async function getHubCreatorInsights(userId: string): Promise<HubCreatorInsights> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS).toISOString();

  const [postsRes, membershipsRes] = await Promise.all([
    supabase
      .from("community_posts")
      .select("id, like_count, comment_count")
      .eq("author_id", userId)
      .eq("is_published", true)
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  const posts = postsRes.data ?? [];
  const engagement30d = posts.reduce(
    (sum, post) => sum + (post.like_count ?? 0) + (post.comment_count ?? 0),
    0
  );

  return {
    postCount30d: posts.length,
    engagement30d,
    communitiesJoined: membershipsRes.count ?? 0,
  };
}

export async function getHubEarnings(userId: string): Promise<HubEarnings> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * DAY_MS).toISOString();

  const affiliateRes = await supabase
    .from("affiliates")
    .select("id, total_earnings")
    .eq("user_id", userId)
    .maybeSingle();

  const [influencerRes, recentCommissionsRes, prevCommissionsRes] = await Promise.all([
    supabase.from("influencers").select("total_earnings").eq("user_id", userId).maybeSingle(),
    affiliateRes.data?.id
      ? supabase
          .from("affiliate_commissions")
          .select("commission_amount")
          .eq("affiliate_id", affiliateRes.data.id)
          .gte("created_at", thirtyDaysAgo)
      : Promise.resolve({ data: [] as { commission_amount: number | null }[] }),
    affiliateRes.data?.id
      ? supabase
          .from("affiliate_commissions")
          .select("commission_amount")
          .eq("affiliate_id", affiliateRes.data.id)
          .gte("created_at", sixtyDaysAgo)
          .lt("created_at", thirtyDaysAgo)
      : Promise.resolve({ data: [] as { commission_amount: number | null }[] }),
  ]);

  const affiliateTotal = Number(affiliateRes.data?.total_earnings ?? 0);
  const influencerTotal = Number(influencerRes.data?.total_earnings ?? 0);
  const total = affiliateTotal + influencerTotal;

  const recentSum = (recentCommissionsRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.commission_amount ?? 0),
    0
  );
  const prevSum = (prevCommissionsRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.commission_amount ?? 0),
    0
  );

  let monthChangePct: number | null = null;
  if (prevSum > 0) {
    monthChangePct = ((recentSum - prevSum) / prevSum) * 100;
  } else if (recentSum > 0) {
    monthChangePct = 100;
  }

  return { total, monthChangePct, currency: "USD" };
}

export async function getHubChallenge(userId: string): Promise<HubChallenge> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);
  if (communityIds.length === 0) return null;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartIso = weekStart.toISOString();

  const { data: tasks } = await supabase
    .from("community_tasks")
    .select("id, title, description, due_date")
    .in("community_id", communityIds)
    .eq("is_active", true)
    .gte("due_date", weekStartIso)
    .order("due_date", { ascending: true })
    .limit(5);

  if (!tasks || tasks.length === 0) return null;

  const taskIds = tasks.map((t) => t.id);
  const { data: completions } = await supabase
    .from("task_completions")
    .select("task_id")
    .eq("user_id", userId)
    .in("task_id", taskIds)
    .gte("created_at", weekStartIso);

  const completedSet = new Set((completions ?? []).map((c) => c.task_id));
  const completed = completedSet.size;
  const target = Math.min(tasks.length, 3);
  const primary = tasks[0];

  return {
    title: primary.title,
    description: primary.description ?? "Complete community missions this week",
    completed: Math.min(completed, target),
    target,
  };
}

export async function getHubFeaturedLive(userId: string): Promise<HubFeaturedLive> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);
  if (communityIds.length === 0) return null;

  const { data: post } = await supabase
    .from("community_posts")
    .select(
      "id, title, like_count, video_url, communities(slug, name), profiles!community_posts_author_id_fkey(full_name, username)"
    )
    .in("community_id", communityIds)
    .eq("is_published", true)
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!post) return null;

  const community = post.communities as { slug: string; name: string } | null;
  const profile = post.profiles as { full_name: string | null; username: string | null } | null;
  const hostName = profile?.full_name ?? profile?.username ?? "Creator";

  return {
    id: post.id,
    title: post.title ?? "Live session",
    hostName,
    href: community ? `/communities/${community.slug}` : "/communities/live",
    watchingLabel: post.like_count ? `${post.like_count} engaged` : null,
  };
}

export async function getHubEvents(userId: string): Promise<HubEventItem[]> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);

  const [tasksRes, campaignsRes, completionsRes] = await Promise.all([
    communityIds.length > 0
      ? supabase
          .from("community_tasks")
          .select(
            "id, title, description, due_date, completion_count, community_id, room_id, communities(name, slug), rooms(slug)"
          )
          .in("community_id", communityIds)
          .eq("is_active", true)
          .not("due_date", "is", null)
          .order("due_date", { ascending: true })
          .limit(50)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("ugc_campaigns")
      .select("id, title, description, starts_at, ends_at, status, submission_count")
      .eq("status", "active")
      .order("starts_at", { ascending: true })
      .limit(30),
    communityIds.length > 0
      ? supabase.from("task_completions").select("task_id").eq("user_id", userId)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const completedTaskIds = new Set((completionsRes.data ?? []).map((c) => c.task_id));
  const events: HubEventItem[] = [];

  for (const task of tasksRes.data ?? []) {
    const community = task.communities as { name: string; slug: string } | null;
    const room = task.rooms as { slug: string } | null;
    if (!task.due_date) continue;
    events.push({
      id: task.id,
      title: task.title,
      description: task.description,
      start_date: task.due_date,
      end_date: null,
      location: community ? `${community.name} mission` : "Community mission",
      image_url: null,
      attendee_count: task.completion_count ?? 0,
      is_going: completedTaskIds.has(task.id),
      kind: "task",
      href:
        community && room?.slug
          ? `/communities/${community.slug}/spaces/${room.slug}`
          : community
            ? `/communities/${community.slug}/missions`
            : null,
    });
  }

  for (const campaign of campaignsRes.data ?? []) {
    if (!campaign.starts_at) continue;
    events.push({
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      start_date: campaign.starts_at,
      end_date: campaign.ends_at,
      location: "UGC Campaign",
      image_url: null,
      attendee_count: campaign.submission_count ?? 0,
      is_going: false,
      kind: "campaign",
      href: `/ugc/${campaign.id}`,
    });
  }

  return events.sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
}

export type HubChannelItem = {
  id: string;
  name: string;
  slug: string;
  room_type: string;
  community_name: string;
  community_slug: string;
  space_id: string;
  space_name: string;
  href: string;
};

export async function getHubSpaces(
  userId: string,
  opts?: { offset?: number; limit?: number; q?: string }
): Promise<{
  spaces: HubSpaceItem[];
  nextOffset: number | null;
  total: number;
}> {
  const supabase = await createClient();
  const communityIds = await getAccessibleCommunityIds(supabase, userId);
  if (communityIds.length === 0) {
    return { spaces: [], nextOffset: null, total: 0 };
  }

  const { data: spaces } = await supabase
    .from("spaces")
    .select(
      "id, name, slug, description, community_id, room_count, member_count, space_type, cover_url, banner_url, access_type, sort_order, is_featured, communities(name, slug, avatar_url, cover_image, member_count, settings)"
    )
    .in("community_id", communityIds)
    .eq("is_active", true)
    .eq("is_hidden", false)
    .order("sort_order", { ascending: true })
    .limit(500);

  type SpaceRow = NonNullable<typeof spaces>[number];
  const byCommunity = new Map<string, SpaceRow[]>();
  for (const space of spaces ?? []) {
    const list = byCommunity.get(space.community_id) ?? [];
    list.push(space);
    byCommunity.set(space.community_id, list);
  }

  const primarySpaces = [...byCommunity.values()]
    .map((list) => pickPrimarySpaceCandidate(list))
    .filter((s): s is NonNullable<typeof s> => !!s);

  const spaceIds = primarySpaces.map((s) => s.id);
  const { data: rooms } = spaceIds.length
    ? await supabase
        .from("rooms")
        .select("id, slug, name, room_type, space_id")
        .in("space_id", spaceIds)
        .eq("is_active", true)
        .eq("room_type", "chat")
    : { data: [] as never[] };

  const discussionRoomBySpace = new Map<string, string>();
  for (const space of primarySpaces) {
    const spaceRooms = (rooms ?? []).filter((r) => r.space_id === space.id);
    const pick =
      spaceRooms.find((r) => /^(discussion|general|chat|lounge)$/i.test(r.slug ?? "")) ??
      spaceRooms[0];
    if (pick) discussionRoomBySpace.set(space.id, pick.id);
  }

  const roomIds = [...discussionRoomBySpace.values()];
  const lastByRoom = new Map<string, { body: string; created_at: string }>();
  const countByRoom = new Map<string, number>();

  if (roomIds.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lastRows } = await (supabase as any).rpc("hub_room_last_messages", {
        p_room_ids: roomIds,
      });
      for (const row of (lastRows ?? []) as Array<{
        room_id: string;
        body: string | null;
        created_at: string | null;
      }>) {
        if (row.room_id && row.body) {
          lastByRoom.set(row.room_id, {
            body: row.body,
            created_at: row.created_at ?? new Date().toISOString(),
          });
        }
      }
    } catch {
      /* RPC optional */
    }

    for (const roomId of roomIds) {
      const { count } = await supabase
        .from("community_messages")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("is_deleted", false);
      countByRoom.set(roomId, count ?? 0);
    }
  }

  const items = primarySpaces.map((space) => {
    const community = space.communities as {
      name: string;
      slug: string;
      avatar_url: string | null;
      cover_image: string | null;
      member_count?: number | null;
      settings?: unknown;
    } | null;
    const cover =
      space.cover_url?.trim() ||
      (space as { banner_url?: string | null }).banner_url?.trim() ||
      null;
    const communityAvatar =
      community?.avatar_url?.trim() || community?.cover_image?.trim() || null;
    const communityCount = resolveCommunityMemberCount({
      slug: community?.slug,
      member_count: community?.member_count,
      settings: community?.settings,
    });
    const roomId = discussionRoomBySpace.get(space.id);
    const last = roomId ? lastByRoom.get(roomId) : undefined;
    return {
      id: space.id,
      name: space.name,
      slug: space.slug,
      description: space.description,
      cover_url: cover,
      community_avatar_url: communityAvatar,
      space_type: (space as { space_type?: string }).space_type ?? "discussion",
      community_id: space.community_id,
      community_name: community?.name ?? "Community",
      community_slug: community?.slug ?? "",
      room_count: space.room_count ?? 0,
      member_count: resolveSpaceMemberCount(
        {
          access_type: (space as { access_type?: string | null }).access_type,
          member_count: space.member_count,
        },
        communityCount
      ),
      access_type: (space as { access_type?: string }).access_type ?? "free",
      last_message: last?.body?.slice(0, 140) ?? null,
      last_message_at: last?.created_at ?? null,
      message_count: roomId ? countByRoom.get(roomId) ?? 0 : 0,
      href: community
        ? `/communities/${community.slug}/spaces/${space.slug}`
        : "/communities",
    };
  });

  const q = opts?.q?.trim().toLowerCase() ?? "";
  let sorted = items;
  if (q) {
    sorted = items.filter(
      (space) =>
        space.name.toLowerCase().includes(q) ||
        space.community_name.toLowerCase().includes(q) ||
        space.description?.toLowerCase().includes(q) ||
        space.last_message?.toLowerCase().includes(q)
    );
  }
  sorted = [...sorted].sort((a, b) => a.community_name.localeCompare(b.community_name));

  const offset = Math.max(0, opts?.offset ?? 0);
  const limit = Math.min(60, Math.max(1, opts?.limit ?? 30));
  const total = sorted.length;
  const page = sorted.slice(offset, offset + limit);
  const nextOffset = offset + limit < total ? offset + limit : null;

  return { spaces: page, nextOffset, total };
}

export async function getHubChannels(userId: string): Promise<HubChannelItem[]> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);
  if (communityIds.length === 0) return [];

  const { data: rooms } = await supabase
    .from("rooms")
    .select(
      "id, name, slug, room_type, space_id, community_id, spaces(name, slug), communities(name, slug)"
    )
    .in("community_id", communityIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(100);

  return (rooms ?? [])
    .filter((room) => room.room_type !== "posts" && !/announcement/i.test(room.name ?? ""))
    .map((room) => {
      const community = room.communities as { name: string; slug: string } | null;
      const space = room.spaces as { name: string; slug: string } | null;
      const href =
        community && space?.slug && room.slug
          ? `/communities/${community.slug}/spaces/${room.slug}`
          : community && room.space_id
            ? `/communities/${community.slug}/chat`
            : community
              ? `/communities/${community.slug}/chat`
              : "/communities/messages";
      return {
        id: room.id,
        name: room.name,
        slug: room.slug,
        room_type: room.room_type,
        community_name: community?.name ?? "Community",
        community_slug: community?.slug ?? "",
        space_id: room.space_id,
        space_name: space?.name ?? "Group",
        href,
      };
    });
}

export async function getHubMissions(userId: string): Promise<HubMissionItem[]> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);
  if (communityIds.length === 0) return [];

  const { data: tasks } = await supabase
    .from("community_tasks")
    .select(
      "id, title, description, due_date, points, completion_count, room_id, communities(name, slug), rooms(slug)"
    )
    .in("community_id", communityIds)
    .eq("is_active", true)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(50);

  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: completions } =
    taskIds.length > 0
      ? await supabase
          .from("task_completions")
          .select("task_id")
          .eq("user_id", userId)
          .in("task_id", taskIds)
      : { data: [] as { task_id: string }[] };

  const completedSet = new Set((completions ?? []).map((c) => c.task_id));

  return (tasks ?? []).map((task) => {
    const community = task.communities as { name: string; slug: string } | null;
    const room = task.rooms as { slug: string } | null;
    const href =
      community && room?.slug
        ? `/communities/${community.slug}/spaces/${room.slug}`
        : community
          ? `/communities/${community.slug}/missions`
          : "/communities/missions";
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      points: task.points ?? 0,
      completion_count: task.completion_count ?? 0,
      is_completed: completedSet.has(task.id),
      community_name: community?.name ?? "Community",
      community_slug: community?.slug ?? "",
      href,
    };
  });
}

export async function getHubCourses(
  userId: string,
  opts?: {
    q?: string | null;
    category?: string | null;
    difficulty?: string | null;
    instructorId?: string | null;
    lessonQ?: string | null;
  }
): Promise<HubCourseItem[]> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);
  if (communityIds.length === 0) return [];

  // Service role + loose typing until generated DB types include new catalog columns.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (createServiceRoleClient() as any)
    .from("community_courses")
    .select(
      "id, title, description, difficulty, category, tags, total_lessons, room_id, creator_id, trailer_url, thumbnail_url, communities(name, slug), rooms(slug), profiles!community_courses_creator_id_fkey(full_name, username)"
    )
    .in("community_id", communityIds)
    .eq("is_published", true)
    .is("archived_at", null)
    .order("published_at", { ascending: false })
    .limit(80);

  if (opts?.category?.trim()) {
    query = query.ilike("category", opts.category.trim());
  }
  if (opts?.difficulty?.trim()) {
    query = query.eq("difficulty", opts.difficulty.trim());
  }
  if (opts?.instructorId?.trim()) {
    query = query.eq("creator_id", opts.instructorId.trim());
  }
  if (opts?.q?.trim()) {
    const q = opts.q.trim();
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);
  }

  const { data: courses } = await query;

  type CourseRow = {
    id: string;
    title: string;
    description: string | null;
    difficulty: string | null;
    category?: string | null;
    tags?: string[] | null;
    total_lessons: number | null;
    room_id: string;
    creator_id: string;
    communities: { name: string; slug: string } | null;
    rooms: { slug: string | null } | null;
    profiles: { full_name: string | null; username: string | null } | null;
  };

  let filtered = (courses ?? []) as CourseRow[];
  if (opts?.lessonQ?.trim()) {
    const lessonQ = opts.lessonQ.trim();
    const ids = filtered.map((c) => c.id);
    if (ids.length === 0) return [];
    const { data: lessons } = await supabase
      .from("course_lessons")
      .select("course_id, title")
      .in("course_id", ids)
      .ilike("title", `%${lessonQ}%`)
      .limit(100);
    const hit = new Set((lessons ?? []).map((l) => l.course_id));
    filtered = filtered.filter((c) => hit.has(c.id));
  }

  const courseIds = filtered.map((c) => c.id);
  const { data: progressRows } =
    courseIds.length > 0
      ? await supabase
          .from("lesson_progress")
          .select("course_id, is_completed")
          .eq("user_id", userId)
          .in("course_id", courseIds)
      : { data: [] as { course_id: string; is_completed: boolean | null }[] };

  const progressByCourse = new Map<string, { completed: number; total: number }>();
  for (const row of progressRows ?? []) {
    const current = progressByCourse.get(row.course_id) ?? { completed: 0, total: 0 };
    current.total += 1;
    if (row.is_completed) current.completed += 1;
    progressByCourse.set(row.course_id, current);
  }

  return filtered.map((course) => {
    const community = course.communities;
    const room = course.rooms;
    const instructor = course.profiles;
    const progress = progressByCourse.get(course.id);
    const totalLessons = course.total_lessons ?? 0;
    const progressPct =
      totalLessons > 0 && progress
        ? Math.round((progress.completed / totalLessons) * 100)
        : progress?.completed
          ? 100
          : 0;

    const communitySlug = community?.slug ?? "";
    const roomSlug = room?.slug?.trim() || "";
    const href =
      communitySlug && roomSlug
        ? `/communities/${communitySlug}/spaces/${encodeURIComponent(roomSlug)}`
        : communitySlug
          ? `/communities/${communitySlug}/courses`
          : "/communities/courses";

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      difficulty: course.difficulty ?? "beginner",
      category: course.category ?? null,
      tags: course.tags ?? [],
      total_lessons: totalLessons,
      progress: Math.min(progressPct, 100),
      community_name: community?.name ?? "Community",
      community_slug: communitySlug,
      instructor_name: instructor?.full_name ?? instructor?.username ?? null,
      instructor_id: course.creator_id,
      href,
    };
  });
}

export async function getHubLiveRooms(userId: string): Promise<HubLiveRoom[]> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);
  if (communityIds.length === 0) return [];

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: messages } = await supabase
    .from("community_messages")
    .select("room_id")
    .in("community_id", communityIds)
    .gte("created_at", hourAgo)
    .limit(1000);

  const counts = new Map<string, number>();
  for (const message of messages ?? []) {
    counts.set(message.room_id, (counts.get(message.room_id) ?? 0) + 1);
  }

  const roomIds = [...counts.keys()].slice(0, 20);
  if (roomIds.length === 0) return [];

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, slug, community_id, space_id, communities(name, slug), spaces(slug)")
    .in("id", roomIds)
    .eq("is_active", true);

  return (rooms ?? [])
    .map((room) => {
      const community = room.communities as { name: string; slug: string } | null;
      const space = room.spaces as { slug: string } | null;
      return {
        id: room.id,
        name: room.name,
        community_id: room.community_id as string | null,
        community_name: community?.name ?? "Community",
        community_slug: community?.slug ?? "",
        space_slug: space?.slug ?? "",
        room_slug: room.slug,
        message_count: counts.get(room.id) ?? 0,
        href:
          community && space?.slug && room.slug
            ? `/communities/${community.slug}/spaces/${room.slug}`
            : community
              ? `/communities/${community.slug}/chats`
              : "/communities/live",
      };
    })
    .sort((a, b) => b.message_count - a.message_count);
}

export type HubLiveChatMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  reaction_count: number;
};

export type HubLiveSpeaker = {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
};

export type HubLiveAnalytics = {
  viewers: number;
  liveViewers: number;
  likes: number;
  newJoins: number;
  messages: number;
  comments: number;
  shares: number;
  reactionsPct: number;
  peakViewers: number;
  watchTimeMinutes: number;
  revenue: number;
};

export type HubLiveUpcoming = {
  id: string;
  title: string;
  host: string;
  start_date: string;
  href: string;
};

export async function getHubLiveDashboard(
  userId: string,
  opts?: { communityId?: string | null; communitySlug?: string | null }
) {
  const supabase = await createClient();

  let scopedCommunityId = opts?.communityId?.trim() || null;
  let scopedSlug = opts?.communitySlug?.trim() || null;
  if (!scopedCommunityId && scopedSlug) {
    const { data: community } = await supabase
      .from("communities")
      .select("id, slug")
      .eq("slug", scopedSlug)
      .maybeSingle();
    scopedCommunityId = community?.id ?? null;
    scopedSlug = community?.slug ?? scopedSlug;
  }

  const [stats, roomsAll, featuredLive, earnings, upcomingRaw] = await Promise.all([
    getHubPlatformStats(),
    getHubLiveRooms(userId),
    getHubFeaturedLive(userId),
    getHubEarnings(userId),
    getHubEvents(userId),
  ]);

  const rooms = scopedCommunityId
    ? roomsAll.filter((r) => r.community_id === scopedCommunityId)
    : roomsAll;

  // Prefer a real live_sessions row for this community when scoped.
  let activeLive: Awaited<
    ReturnType<typeof import("@/services/live/session-service").getActiveLiveForCommunity>
  > = null;
  let scheduled: Awaited<
    ReturnType<typeof import("@/services/live/session-service").listScheduledLivesForCommunity>
  > = [];
  let ended: Awaited<
    ReturnType<typeof import("@/services/live/session-service").getLatestEndedLiveForCommunity>
  > = null;
  let liveSvc: typeof import("@/services/live/session-service") | null = null;

  if (scopedCommunityId) {
    liveSvc = await import("@/services/live/session-service");
    [activeLive, scheduled, ended] = await Promise.all([
      liveSvc.getActiveLiveForCommunity(scopedCommunityId),
      liveSvc.listScheduledLivesForCommunity(scopedCommunityId, 4),
      liveSvc.getLatestEndedLiveForCommunity(scopedCommunityId),
    ]);
  } else {
    // Hub Live (/communities/live) — resume Creator Live or any joined live.
    liveSvc = await import("@/services/live/session-service");
    const forUser = await liveSvc.getActiveLiveForUser(userId);
    activeLive = forUser[0] ?? null;
  }

  const primaryRoom = rooms[0] ?? null;
  let chatMessages: HubLiveChatMessage[] = [];
  let speakers: HubLiveSpeaker[] = [];

  const discussionRoomId = activeLive?.room_id ?? primaryRoom?.id ?? null;

  if (discussionRoomId) {
    const { data: msgs } = await supabase
      .from("community_messages")
      .select(
        "id, body, created_at, sender_id, reactions, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)"
      )
      .eq("room_id", discussionRoomId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(40);

    const reversed = [...(msgs ?? [])].reverse();
    chatMessages = reversed.map((m) => {
      const profile = m.profiles as {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
      } | null;
      const reactions = m.reactions as Record<string, unknown> | null;
      const reaction_count = reactions ? Object.keys(reactions).length : 0;
      return {
        id: m.id,
        body: m.body ?? "",
        created_at: m.created_at ?? new Date().toISOString(),
        sender_id: m.sender_id,
        sender_name: profile?.full_name ?? profile?.username ?? "Member",
        sender_avatar: profile?.avatar_url ?? null,
        reaction_count,
      };
    });
  }

  // Stage roster comes from live participants — never invent Host/Speaker from chat authors.
  if (activeLive) {
    const svc = liveSvc ?? (await import("@/services/live/session-service"));
    const participants = await svc.listParticipants(activeLive.id);
    const onStage = participants.filter(
      (p) =>
        p.status === "joined" &&
        (p.role === "host" || p.role === "cohost" || p.role === "speaker")
    );
    if (onStage.length > 0) {
      const ids = onStage.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .in("id", ids);
      const byId = new Map(
        (profiles ?? []).map((p) => [
          p.id as string,
          p as {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
            username: string | null;
          },
        ])
      );
      speakers = onStage.slice(0, 8).map((p) => {
        const profile = byId.get(p.user_id);
        return {
          id: p.user_id,
          name: profile?.full_name ?? profile?.username ?? "Member",
          avatar_url: profile?.avatar_url ?? null,
          role: p.role === "host" ? "Host" : p.role === "cohost" ? "Co-host" : "Speaker",
        };
      });
    }
  }

  const analytics: HubLiveAnalytics = {
    viewers: activeLive?.viewer_count ?? 0,
    liveViewers: activeLive?.viewer_count ?? 0,
    likes: chatMessages.reduce((sum, m) => sum + m.reaction_count, 0),
    newJoins: speakers.length,
    messages: chatMessages.length,
    comments: 0,
    shares: 0,
    reactionsPct:
      chatMessages.length > 0
        ? Math.min(
            100,
            Math.round(
              (chatMessages.reduce((sum, m) => sum + m.reaction_count, 0) /
                chatMessages.length) *
                10
            )
          )
        : 0,
    peakViewers: activeLive?.peak_viewers ?? ended?.peak_viewers ?? 0,
    watchTimeMinutes: Math.round(
      ((activeLive ?? ended)?.total_watch_seconds ?? 0) / 60
    ),
    revenue: earnings.total,
  };

  const upcomingFromSessions: HubLiveUpcoming[] = (scheduled ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    host: "Community",
    start_date: s.scheduled_at ?? s.started_at ?? s.created_at,
    href: scopedSlug
      ? `/communities/live/${s.id}`
      : `/communities/live/${s.id}`,
  }));

  const upcomingSessions: HubLiveUpcoming[] =
    upcomingFromSessions.length > 0
      ? upcomingFromSessions
      : upcomingRaw
          .filter((e) => new Date(e.start_date) >= new Date())
          .slice(0, 4)
          .map((e) => ({
            id: e.id,
            title: e.title,
            host: e.location ?? "Community",
            start_date: e.start_date,
            href: e.href ?? "/communities/events",
          }));

  const sessionTitle =
    activeLive?.title ??
    featuredLive?.title ??
    (scopedSlug
      ? primaryRoom?.name ?? "Community Live Room"
      : "Start your Live");
  const sessionHost = featuredLive?.hostName ?? primaryRoom?.community_name ?? "Jimvio";
  const sessionHref = activeLive
    ? `/communities/live/${activeLive.id}`
    : featuredLive?.href ?? primaryRoom?.href ?? "/communities/live";

  const discussionHref =
    primaryRoom?.href ??
    (scopedSlug ? `/communities/${scopedSlug}` : "/communities");

  return {
    stats,
    rooms,
    featuredLive,
    primaryRoom,
    relatedRooms: rooms.slice(1, 6),
    chatMessages,
    speakers,
    analytics,
    upcomingSessions,
    session: {
      title: sessionTitle,
      host: sessionHost,
      href: sessionHref,
      tag:
        activeLive && !activeLive.community_id
          ? "Creator Live"
          : primaryRoom?.community_name ?? "Live Room",
      roomId: activeLive?.room_id ?? primaryRoom?.id ?? null,
      communityId:
        activeLive?.community_id ??
        scopedCommunityId ??
        (primaryRoom as { community_id?: string | null } | null)?.community_id ??
        null,
      communitySlug: scopedSlug ?? primaryRoom?.community_slug ?? null,
      liveSessionId: activeLive?.id ?? null,
      liveStatus: activeLive
        ? ("live" as const)
        : ended
          ? ("ended" as const)
          : scheduled.length > 0
            ? ("scheduled" as const)
            : ("offline" as const),
      endedSessionId: ended?.id ?? null,
      discussionHref,
    },
  };
}

function extractPostImage(images: unknown): string | null {
  if (!images) return null;
  if (typeof images === "string" && images.startsWith("http")) return images;
  if (Array.isArray(images)) {
    for (const item of images) {
      if (typeof item === "string" && item.startsWith("http")) return item;
      if (item && typeof item === "object" && "url" in item) {
        const url = (item as { url?: unknown }).url;
        if (typeof url === "string" && url.startsWith("http")) return url;
      }
    }
  }
  return null;
}

function mapProfileMember(
  id: string,
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null,
  extras?: Partial<OverviewMember>
): OverviewMember {
  return {
    id,
    name: profile?.full_name ?? profile?.username ?? "Member",
    avatar_url: profile?.avatar_url ?? null,
    username: profile?.username ?? null,
    ...extras,
  };
}

export async function getCommunityOverviewStats(
  communityId: string,
  userId: string | null
): Promise<CommunityOverviewStats> {
  const supabase = await createClient();
  const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const dayAgo = new Date(Date.now() - DAY_MS).toISOString();
  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [
    communityRes,
    onlineNowRes,
    onlinePrevRes,
    coursesRes,
    roomsRes,
    messagesWeekRes,
    recentMessagesRes,
    tasksRes,
    activeMembersRes,
    progressRes,
    activityRes,
    topPointsRes,
    memberCountRes,
    missionsRes,
    memberPointsAllRes,
    moderatorsRes,
    recentMembersRes,
    featuredPostsRes,
    galleryPostsRes,
    walletRes,
    challengesRes,
    recentJoinsRes,
    joinsThisWeekRes,
  ] = await Promise.all([
    supabase
      .from("communities")
      .select(
        "slug, name, description, long_description, tagline, cover_image, avatar_url, is_private, is_featured, is_free, category, tags, member_count, post_count, owner_id, created_at, settings, owner:profiles!communities_owner_id_fkey(id, full_name, avatar_url, username)"
      )
      .eq("id", communityId)
      .maybeSingle(),
    supabase
      .from("member_points")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .gte("last_active_at", onlineCutoff),
    supabase
      .from("member_points")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .gte("last_active_at", dayAgo)
      .lt("last_active_at", onlineCutoff),
    supabase
      .from("community_courses")
      .select("id, title, difficulty, total_lessons, thumbnail_url, room_id, rooms(slug)")
      .eq("community_id", communityId)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(6),
    supabase
      .from("rooms")
      .select("id, name, room_type")
      .eq("community_id", communityId)
      .eq("is_active", true),
    supabase
      .from("community_messages")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .gte("created_at", weekAgo),
    supabase
      .from("community_messages")
      .select("room_id")
      .eq("community_id", communityId)
      .gte("created_at", hourAgo)
      .limit(500),
    supabase
      .from("community_tasks")
      .select("id, title, due_date")
      .eq("community_id", communityId)
      .eq("is_active", true)
      .not("due_date", "is", null)
      .gte("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(5),
    supabase
      .from("member_points")
      .select("user_id, last_active_at, profiles!member_points_user_id_fkey(full_name, avatar_url, username)")
      .eq("community_id", communityId)
      .gte("last_active_at", onlineCutoff)
      .order("last_active_at", { ascending: false })
      .limit(8),
    userId
      ? supabase
          .from("lesson_progress")
          .select("course_id, is_completed")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] as { course_id: string; is_completed: boolean | null }[] }),
    supabase
      .from("community_messages")
      .select("id, body, created_at, room_id, sender_id, message_type, profiles!community_messages_sender_id_fkey(full_name, username)")
      .eq("community_id", communityId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("member_points")
      .select("user_id, total_points, profiles!member_points_user_id_fkey(full_name, avatar_url, username)")
      .eq("community_id", communityId)
      .order("total_points", { ascending: false })
      .limit(5),
    supabase
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "active"),
    supabase
      .from("community_tasks")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("is_active", true),
    supabase
      .from("member_points")
      .select("user_id, total_points")
      .eq("community_id", communityId),
    supabase
      .from("community_memberships")
      .select("user_id, role, profiles!community_memberships_user_id_fkey(full_name, avatar_url, username)")
      .eq("community_id", communityId)
      .eq("status", "active")
      .in("role", ["moderator", "admin", "owner"])
      .limit(8),
    supabase
      .from("community_memberships")
      .select("user_id, profiles!community_memberships_user_id_fkey(full_name, avatar_url, username)")
      .eq("community_id", communityId)
      .eq("status", "active")
      .order("subscribed_at", { ascending: false, nullsFirst: false })
      .limit(12),
    supabase
      .from("community_posts")
      .select(
        "id, title, body, like_count, comment_count, images, created_at, is_pinned, author_id, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)"
      )
      .eq("community_id", communityId)
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("like_count", { ascending: false })
      .limit(4),
    supabase
      .from("community_posts")
      .select("id, title, images, created_at")
      .eq("community_id", communityId)
      .eq("is_published", true)
      .not("images", "is", null)
      .order("created_at", { ascending: false })
      .limit(12),
    userId
      ? supabase
          .from("wallets")
          .select("total_earned")
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null as { total_earned: number | null } | null }),
    supabase
      .from("community_tasks")
      .select("id, title, due_date")
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(4),
    supabase
      .from("community_memberships")
      .select("subscribed_at, created_at")
      .eq("community_id", communityId)
      .eq("status", "active")
      .order("subscribed_at", { ascending: false, nullsFirst: false })
      .limit(400),
    supabase
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "active")
      .gte("subscribed_at", weekAgo),
  ]);

  const community = communityRes.data;
  const slug = community?.slug ?? "";
  const base = `/communities/${slug}`;
  const communityName = community?.name ?? "Community";
  const description =
    community?.description?.trim() ||
    community?.long_description?.trim() ||
    null;
  const tagline = community?.tagline ?? null;
  const coverImage = community?.cover_image ?? null;
  const avatarUrl = community?.avatar_url ?? null;
  const isPrivate = !!community?.is_private;
  const isFeatured = !!community?.is_featured;
  const isFree = community?.is_free !== false;
  const category = community?.category ?? null;
  const tags = (Array.isArray(community?.tags) ? community.tags : []).filter(
    (t): t is string => typeof t === "string" && t.length > 0
  );
  const memberCount = resolveCommunityMemberCount({
    slug: community?.slug,
    member_count:
      typeof community?.member_count === "number" && community.member_count > 0
        ? community.member_count
        : memberCountRes.count ?? 0,
    settings: (community as { settings?: unknown } | null)?.settings,
  });
  const postCount = community?.post_count ?? 0;

  const parsedRules = (community?.long_description ?? community?.description ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length < 120)
    .slice(0, 6);

  const rules = parsedRules;

  const chatRooms = (roomsRes.data ?? []).filter((r) => r.room_type === "chat");
  const chatRoomIds = new Set(chatRooms.map((r) => r.id));
  const activeRoomIds = new Set((recentMessagesRes.data ?? []).map((m) => m.room_id));
  const activeChatRooms = [...activeRoomIds].filter((id) => chatRoomIds.has(id));
  const voiceRooms = activeChatRooms.length;
  const roomNameById = new Map((roomsRes.data ?? []).map((r) => [r.id, r.name]));

  // Prefer real live_sessions over chat activity heuristics.
  let overviewActiveLive: Awaited<
    ReturnType<typeof import("@/services/live/session-service").getActiveLiveForCommunity>
  > = null;
  try {
    const liveSvc = await import("@/services/live/session-service");
    overviewActiveLive = await liveSvc.getActiveLiveForCommunity(communityId);
  } catch {
    overviewActiveLive = null;
  }
  const liveNow = overviewActiveLive ? 1 : 0;
  const activeLiveSession: OverviewLiveSession = overviewActiveLive
    ? {
        id: overviewActiveLive.id,
        title: overviewActiveLive.title,
        room_name:
          (overviewActiveLive.room_id &&
            roomNameById.get(overviewActiveLive.room_id)) ||
          "Live Studio",
        href: `${base}/live/${overviewActiveLive.id}`,
        active_count: overviewActiveLive.viewer_count ?? 1,
      }
    : null;

  const courseIds = (coursesRes.data ?? []).map((c) => c.id);
  const progressByCourse = new Map<string, number>();
  for (const row of progressRes.data ?? []) {
    if (!courseIds.includes(row.course_id)) continue;
    if (row.is_completed) {
      progressByCourse.set(row.course_id, (progressByCourse.get(row.course_id) ?? 0) + 1);
    }
  }

  const courses: OverviewCourse[] = (coursesRes.data ?? []).map((course) => {
    const completed = progressByCourse.get(course.id) ?? 0;
    const totalLessons = course.total_lessons ?? 0;
    const progress =
      totalLessons > 0 ? Math.min(Math.round((completed / totalLessons) * 100), 100) : 0;
    const room = (course as { rooms?: { slug: string | null } | null }).rooms;
    const roomSlug = room?.slug?.trim() || "";
    return {
      id: course.id,
      title: course.title,
      difficulty: course.difficulty ?? "beginner",
      total_lessons: totalLessons,
      progress,
      cover_image: course.thumbnail_url ?? null,
      href: roomSlug
        ? `${base}/spaces/${encodeURIComponent(roomSlug)}`
        : `${base}/courses`,
    };
  });
  const featuredCourse = courses[0] ?? null;

  const recentActivity = (activityRes.data ?? [])
    .filter(
      (row) =>
        !isCallSignalingMessage(
          (row as { message_type?: string | null }).message_type,
          row.body
        ) && !isTechnicalFeedBody(row.body)
    )
    .slice(0, 10)
    .map((row) => {
      const profile = row.profiles as { full_name: string | null; username: string | null } | null;
      const name = profile?.full_name ?? profile?.username ?? "Someone";
      const room = roomNameById.get(row.room_id) ?? "a space";
      const body = row.body ?? "";
      if (isTechnicalFeedBody(body)) return null;
      const preview = body.slice(0, 60);
      return {
        id: row.id,
        text: `${name} posted in ${room}${preview ? `: ${preview}` : ""}`,
        time: row.created_at ?? new Date().toISOString(),
        href: `${base}/chat`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const popularThisWeek = courses.slice(0, 4).map((course) => ({
    id: course.id,
    title: course.title,
    meta: `${course.total_lessons} lessons · ${course.difficulty}`,
    href: course.href,
  }));

  const topContributors = (topPointsRes.data ?? []).map((row) => {
    const profile = row.profiles as {
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
    } | null;
    return {
      id: row.user_id,
      name: profile?.full_name ?? profile?.username ?? "Member",
      avatar_url: profile?.avatar_url ?? null,
      points: row.total_points ?? 0,
    };
  });

  const activeMembers = (activeMembersRes.data ?? []).map((member) => {
    const profile = member.profiles as {
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
    } | null;
    return mapProfileMember(member.user_id, profile, { status: "Active now" });
  });

  const ownerProfile = community?.owner as
    | { id: string; full_name: string | null; avatar_url: string | null; username: string | null }
    | null
    | undefined;
  const founder: OverviewMember | null = ownerProfile
    ? mapProfileMember(ownerProfile.id, ownerProfile, { role: "owner", status: "Founder" })
    : community?.owner_id
      ? { id: community.owner_id, name: "Founder", avatar_url: null, role: "owner", status: "Founder" }
      : null;

  const moderators: OverviewMember[] = (moderatorsRes.data ?? [])
    .filter((row) => row.role !== "owner" || row.user_id !== founder?.id)
    .map((row) => {
      const profile = row.profiles as {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
      } | null;
      return mapProfileMember(row.user_id, profile, {
        role: row.role ?? "moderator",
        status: row.role === "admin" ? "Admin" : "Moderator",
      });
    })
    .filter((m) => m.id !== founder?.id)
    .slice(0, 6);

  const memberAvatars: OverviewMember[] = (recentMembersRes.data ?? []).map((row) => {
    const profile = row.profiles as {
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
    } | null;
    return mapProfileMember(row.user_id, profile);
  });

  const featuredPosts: OverviewPost[] = (featuredPostsRes.data ?? [])
    .filter((post) => !isTechnicalFeedBody(post.body))
    .map((post) => {
    const profile = post.profiles as {
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
    } | null;
    return {
      id: post.id,
      title: post.title,
      body: post.body ?? "",
      like_count: post.like_count ?? 0,
      comment_count: post.comment_count ?? 0,
      created_at: post.created_at ?? new Date().toISOString(),
      href: `${base}/feed`,
      image_url: extractPostImage(post.images),
      author: mapProfileMember(post.author_id, profile),
    };
  });

  const gallery: OverviewGalleryItem[] = [];
  if (coverImage) {
    gallery.push({ id: "cover", url: coverImage, label: `${communityName} cover` });
  }
  if (avatarUrl) {
    gallery.push({ id: "avatar", url: avatarUrl, label: `${communityName} logo` });
  }
  for (const post of galleryPostsRes.data ?? []) {
    const url = extractPostImage(post.images);
    if (!url) continue;
    if (gallery.some((g) => g.url === url)) continue;
    gallery.push({
      id: post.id,
      url,
      label: post.title || "Community moment",
    });
    if (gallery.length >= 8) break;
  }

  const challenges: OverviewChallenge[] = (challengesRes.data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    href: `${base}/live`,
  }));

  const allMemberPoints = memberPointsAllRes.data ?? [];
  const totalCommunityXp = allMemberPoints.reduce((sum, row) => sum + (row.total_points ?? 0), 0);
  const communityLevel = levelFromTotalPoints(totalCommunityXp);
  const communityProgress = progressPercentInLevel(totalCommunityXp, communityLevel);
  const userPointsRow = allMemberPoints.find((row) => row.user_id === userId);
  const userTotalPoints = userPointsRow?.total_points ?? 0;
  const membersWithPoints = allMemberPoints.length || 1;
  const rank =
    allMemberPoints.filter((row) => (row.total_points ?? 0) > userTotalPoints).length + 1;
  const memberTopPercent = Math.max(1, Math.ceil((rank / membersWithPoints) * 100));
  const challengeCount = missionsRes.count ?? 0;
  const messagesThisWeek = messagesWeekRes.count ?? 0;
  const totalEarned = Number(walletRes.data?.total_earned ?? 0);
  const prevLive = Math.max(0, liveNow - 1);
  const isVerified = isFeatured || memberCount >= 100;

  const achievements: OverviewAchievement[] = [
    {
      id: "founding",
      title: "Community Founded",
      description: "This space is live on Jimvio",
      unlocked: true,
    },
    {
      id: "members-50",
      title: "Growing Circle",
      description: "Reach 50 members",
      unlocked: memberCount >= 50,
    },
    {
      id: "members-500",
      title: "Thriving Hub",
      description: "Reach 500 members",
      unlocked: memberCount >= 500,
    },
    {
      id: "first-course",
      title: "Knowledge Drop",
      description: "Publish your first course",
      unlocked: courses.length > 0,
    },
    {
      id: "level-5",
      title: "Level 5 Collective",
      description: "Community reaches Level 5",
      unlocked: communityLevel >= 5,
    },
    {
      id: "weekly-buzz",
      title: "Weekly Buzz",
      description: "100+ messages this week",
      unlocked: messagesThisWeek >= 100,
    },
  ];

  const faq: OverviewFaq[] = [
    {
      question: `What is ${communityName}?`,
      answer:
        description ??
        `${communityName} is a creator community on Jimvio for learning, collaborating, and growing together.`,
    },
    {
      question: "How do I join live sessions?",
      answer: `Open Live from the community navigation or jump in when an Active Live Session appears on Overview.`,
    },
    {
      question: "Where can I find courses and challenges?",
      answer: `Browse Courses for lessons and Challenges for missions. Featured picks also appear on this Overview.`,
    },
    {
      question: isFree ? "Is membership free?" : "How does membership work?",
      answer: isFree
        ? "This community is free to join for eligible members."
        : "Paid plans unlock premium spaces, courses, and live access. Manage membership from Subscribe.",
    },
  ];

  const insights: OverviewInsight[] = [
    {
      id: "online",
      icon: "users",
      headline: `${(onlineNowRes.count ?? 0).toLocaleString()} members active now`,
      subtext: "Great moment to post, go live, or invite collaborators.",
    },
    {
      id: "messages",
      icon: "trending",
      headline: `${messagesThisWeek.toLocaleString()} messages this week`,
      subtext:
        messagesThisWeek > 50
          ? "Conversation momentum is strong across spaces."
          : "Spark a discussion in Feed or Chat to boost engagement.",
    },
    {
      id: "courses",
      icon: "sparkles",
      headline:
        courses.length > 0
          ? `${courses.length} published course${courses.length === 1 ? "" : "s"}`
          : "No courses published yet",
      subtext:
        featuredCourse
          ? `Featured: ${featuredCourse.title}`
          : "Add a course to give members a clear learning path.",
    },
    {
      id: "live",
      icon: liveNow > 0 ? "flame" : "clock",
      headline: liveNow > 0 ? `${liveNow} live room${liveNow === 1 ? "" : "s"} right now` : "No live rooms active",
      subtext: liveNow > 0 ? "Jump in while energy is high." : "Schedule a live to rally members.",
    },
  ];

  let similarCommunities: OverviewSimilarCommunity[] = [];
  if (category || tags.length > 0) {
    let similarQuery = supabase
      .from("communities")
      .select("id, name, slug, avatar_url, cover_image, member_count, tagline, category, tags")
      .eq("is_active", true)
      .neq("id", communityId)
      .limit(8);
    if (category) {
      similarQuery = similarQuery.eq("category", category);
    }
    const { data: similarRows } = await similarQuery;
    similarCommunities = (similarRows ?? [])
      .filter((row) => {
        if (category && row.category === category) return true;
        const rowTags = Array.isArray(row.tags) ? row.tags : [];
        return tags.some((t) => rowTags.includes(t));
      })
      .slice(0, 4)
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        avatar_url: row.avatar_url,
        cover_image: row.cover_image,
        member_count: row.member_count ?? 0,
        tagline: row.tagline,
      }));
  }

  if (similarCommunities.length === 0) {
    const { data: featuredSimilar } = await supabase
      .from("communities")
      .select("id, name, slug, avatar_url, cover_image, member_count, tagline")
      .eq("is_active", true)
      .neq("id", communityId)
      .order("member_count", { ascending: false })
      .limit(4);
    similarCommunities = (featuredSimilar ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      avatar_url: row.avatar_url,
      cover_image: row.cover_image,
      member_count: row.member_count ?? 0,
      tagline: row.tagline,
    }));
  }

  const createdAt = community?.created_at ?? null;

  const missionVision: OverviewMissionVision | null = null;

  const fourWeekMs = 28 * DAY_MS;
  const weekBuckets = [0, 0, 0, 0];
  const weekLabels = ["3w ago", "2w ago", "Last week", "This week"];
  const nowMs = Date.now();
  for (const row of recentJoinsRes.data ?? []) {
    const raw = row.subscribed_at ?? row.created_at;
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t) || nowMs - t > fourWeekMs) continue;
    const weekIndex = Math.min(3, Math.floor((nowMs - t) / (7 * DAY_MS)));
    // weekIndex 0 = most recent week → bucket 3
    weekBuckets[3 - weekIndex] += 1;
  }
  const memberGrowth: OverviewGrowthPoint[] = weekBuckets.some((n) => n > 0)
    ? weekLabels.map((label, i) => ({ label, joins: weekBuckets[i] }))
    : [];
  const membersJoinedThisWeek =
    joinsThisWeekRes.count ?? weekBuckets[3] ?? 0;

  const onlineRatio =
    memberCount > 0 ? Math.min(1, (onlineNowRes.count ?? 0) / memberCount) : 0;
  const activityFactor = Math.min(100, Math.round((messagesThisWeek / Math.max(memberCount, 1)) * 40 + Math.min(messagesThisWeek, 80)));
  const presenceFactor = Math.round(onlineRatio * 100);
  const learningFactor = Math.min(100, courses.length * 22 + (featuredCourse ? 10 : 0));
  const liveFactor = Math.min(100, liveNow * 35 + (challengeCount > 0 ? 15 : 0));
  const healthRaw = Math.round(
    presenceFactor * 0.3 + activityFactor * 0.35 + learningFactor * 0.2 + liveFactor * 0.15
  );
  const healthScoreValue = Math.max(12, Math.min(98, healthRaw || 18));
  const healthLabel: OverviewHealthScore["label"] =
    healthScoreValue >= 80
      ? "Excellent"
      : healthScoreValue >= 62
        ? "Strong"
        : healthScoreValue >= 42
          ? "Steady"
          : "Building";
  const healthScore: OverviewHealthScore | null =
    memberCount > 0
      ? {
          score: healthScoreValue,
          label: healthLabel,
          summary:
            healthLabel === "Excellent"
              ? "This community is highly engaged right now."
              : healthLabel === "Strong"
                ? "Healthy momentum across members and spaces."
                : healthLabel === "Steady"
                  ? "Solid foundation — room to spark more activity."
                  : "Early stage — invite members and start conversations.",
          factors: [
            { id: "presence", label: "Presence", score: presenceFactor },
            { id: "activity", label: "Activity", score: activityFactor },
            { id: "learning", label: "Learning", score: learningFactor },
            { id: "live", label: "Live pulse", score: liveFactor },
          ],
        }
      : null;

  const weeklyHighlights: OverviewHighlight[] = [];
  if (featuredPosts[0]) {
    weeklyHighlights.push({
      id: `post-${featuredPosts[0].id}`,
      title: featuredPosts[0].title || featuredPosts[0].body.slice(0, 80),
      meta: `${featuredPosts[0].like_count} likes · ${featuredPosts[0].author.name}`,
      href: featuredPosts[0].href,
      kind: "post",
    });
  }
  if (featuredCourse) {
    weeklyHighlights.push({
      id: `course-${featuredCourse.id}`,
      title: featuredCourse.title,
      meta: `${featuredCourse.total_lessons} lessons · ${featuredCourse.difficulty}`,
      href: featuredCourse.href,
      kind: "course",
    });
  }
  if (topContributors[0]) {
    weeklyHighlights.push({
      id: `contrib-${topContributors[0].id}`,
      title: topContributors[0].name,
      meta: `${topContributors[0].points.toLocaleString()} XP this season`,
      href: `${base}/leaderboard`,
      kind: "contributor",
    });
  }
  if (challenges[0]) {
    weeklyHighlights.push({
      id: `challenge-${challenges[0].id}`,
      title: challenges[0].title,
      meta: challenges[0].due_date
        ? `Due ${new Date(challenges[0].due_date).toLocaleDateString()}`
        : "Active challenge",
      href: challenges[0].href,
      kind: "challenge",
    });
  }
  if (messagesThisWeek > 0) {
    weeklyHighlights.push({
      id: "messages-week",
      title: `${messagesThisWeek.toLocaleString()} messages this week`,
      meta: "Conversation across community spaces",
      href: `${base}/chat`,
      kind: "activity",
    });
  }

  const trustedBadges: OverviewTrustedBadge[] = [];
  if (isVerified) {
    trustedBadges.push({
      id: "verified",
      label: "Verified",
      description: "Trusted community on Jimvio",
      tone: "verified",
    });
  }
  if (isFeatured) {
    trustedBadges.push({
      id: "featured",
      label: "Featured",
      description: "Highlighted by the platform",
      tone: "featured",
    });
  }
  if (isPrivate) {
    trustedBadges.push({
      id: "private",
      label: "Private",
      description: "Members-only access",
      tone: "secure",
    });
  }
  if (moderators.length > 0 || founder) {
    trustedBadges.push({
      id: "moderated",
      label: "Moderated",
      description: "Active staff & founder presence",
      tone: "staff",
    });
  }
  if ((onlineNowRes.count ?? 0) > 0) {
    trustedBadges.push({
      id: "active",
      label: "Active now",
      description: `${(onlineNowRes.count ?? 0).toLocaleString()} members online`,
      tone: "active",
    });
  }
  if (courses.length > 0) {
    trustedBadges.push({
      id: "learning",
      label: "Learning hub",
      description: `${courses.length} published course${courses.length === 1 ? "" : "s"}`,
      tone: "learning",
    });
  }

  const quickActions: OverviewQuickAction[] = [
    { id: "chat", label: "General", href: `${base}/chat`, icon: "chat" },
    { id: "feed", label: "View Feed", href: `${base}/feed`, icon: "feed" },
    { id: "courses", label: "Courses", href: `${base}/courses`, icon: "courses" },
    { id: "events", label: "Events", href: `${base}/live`, icon: "events" },
    { id: "invite", label: "Invite", href: `${base}/members`, icon: "invite" },
  ];

  const milestones: OverviewMilestone[] = [
    {
      id: "founded",
      title: "Community founded",
      description: `${communityName} went live on Jimvio`,
      reached: true,
      dateLabel: createdAt
        ? new Date(createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
        : null,
    },
    {
      id: "members-10",
      title: "First 10 members",
      description: "Core circle formed",
      reached: memberCount >= 10,
      dateLabel: memberCount >= 10 ? "Reached" : null,
    },
    {
      id: "members-100",
      title: "100 members",
      description: "Growing community hub",
      reached: memberCount >= 100,
      dateLabel: memberCount >= 100 ? "Reached" : null,
    },
    {
      id: "first-course",
      title: "First course published",
      description: "Learning path unlocked",
      reached: courses.length > 0,
      dateLabel: courses.length > 0 ? "Published" : null,
    },
    {
      id: "level-5",
      title: "Community Level 5",
      description: "Collective XP milestone",
      reached: communityLevel >= 5,
      dateLabel: communityLevel >= 5 ? `Level ${communityLevel}` : null,
    },
  ].filter((m) => m.reached);

  const summarySignals: string[] = [];
  if (messagesThisWeek > 0) summarySignals.push("messages");
  if ((onlineNowRes.count ?? 0) > 0) summarySignals.push("presence");
  if (membersJoinedThisWeek > 0) summarySignals.push("growth");
  if (courses.length > 0) summarySignals.push("courses");
  if (liveNow > 0) summarySignals.push("live");

  const aiWeeklySummary: OverviewAiWeeklySummary | null =
    summarySignals.length >= 2
      ? {
          headline: `${communityName} · weekly pulse`,
          paragraphs: [
            [
              membersJoinedThisWeek > 0
                ? `${membersJoinedThisWeek.toLocaleString()} new member${membersJoinedThisWeek === 1 ? "" : "s"} joined this week.`
                : null,
              messagesThisWeek > 0
                ? `Members exchanged ${messagesThisWeek.toLocaleString()} messages across spaces.`
                : null,
              (onlineNowRes.count ?? 0) > 0
                ? `${(onlineNowRes.count ?? 0).toLocaleString()} people are active right now.`
                : null,
            ]
              .filter(Boolean)
              .join(" "),
            [
              courses.length > 0
                ? `Learning stays central with ${courses.length} published course${courses.length === 1 ? "" : "s"}${featuredCourse ? ` — featured: ${featuredCourse.title}` : ""}.`
                : null,
              liveNow > 0
                ? `Live energy is up with ${liveNow} active room${liveNow === 1 ? "" : "s"}.`
                : challengeCount > 0
                  ? `${challengeCount} challenge${challengeCount === 1 ? "" : "s"} are available for members.`
                  : null,
              topContributors[0]
                ? `${topContributors[0].name} leads the board with ${topContributors[0].points.toLocaleString()} XP.`
                : null,
            ]
              .filter(Boolean)
              .join(" "),
          ].filter((p) => p.length > 0),
          generatedFrom: summarySignals,
        }
      : null;

  // Prefer real join-based weekly series when available; else message heuristic only if messages exist
  const weeklyActivitySeries =
    memberGrowth.length > 0
      ? memberGrowth.map((p) => Math.max(p.joins, 0))
      : messagesThisWeek > 0
        ? [0.35, 0.45, 0.4, 0.55, 0.5, 0.7, 1].map((w, i) =>
            Math.max(1, Math.round(messagesThisWeek * w * (0.55 + (i % 3) * 0.12)))
          )
        : [];

  return {
    membersOnline: onlineNowRes.count ?? 0,
    membersOnlineDelta: formatDelta(onlineNowRes.count ?? 0, onlinePrevRes.count ?? 0),
    liveNow,
    liveNowDelta: formatDelta(liveNow, prevLive),
    voiceRooms,
    voiceRoomsDelta: formatDelta(voiceRooms, Math.max(0, voiceRooms - 1)),
    courseCount: courses.length,
    courseCountDelta: courses.length ? `+${courses.length} active` : null,
    totalEarned,
    totalEarnedDelta: totalEarned > 0 ? "Lifetime" : null,
    activeRoomCount: roomsRes.data?.length ?? 0,
    messagesThisWeek,
    description,
    tagline,
    coverImage,
    avatarUrl,
    isPrivate,
    isFeatured,
    isVerified,
    isFree,
    category,
    tags,
    memberCount,
    postCount,
    createdAt,
    rules,
    founder,
    moderators,
    memberAvatars,
    gallery,
    featuredPosts,
    featuredCourse,
    challenges,
    activeLiveSession,
    achievements,
    faq,
    similarCommunities,
    insights,
    weeklyActivity: weeklyActivitySeries,
    healthScore,
    missionVision,
    memberGrowth,
    membersJoinedThisWeek,
    weeklyHighlights: weeklyHighlights.slice(0, 5),
    trustedBadges,
    quickActions,
    milestones,
    aiWeeklySummary,
    courses,
    upcomingEvents: (tasksRes.data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      start_date: task.due_date!,
      href: `${base}/live`,
    })),
    activeMembers,
    recentActivity,
    popularThisWeek,
    topContributors,
    progressBreakdown: {
      challenges: challengeCount,
      riddles: Math.min(memberCount, 99),
      members: memberCount,
      rankPercent: memberTopPercent,
      communityLevel,
      communityProgress,
      memberTopPercent,
    },
  };
}

export async function getHubDashboard(userId: string) {
  const [stats, stories, user, insights, earnings, challenge, featuredLive] =
    await Promise.all([
      getHubPlatformStats(),
      getHubStories(userId),
      getHubUserSnapshot(userId),
      getHubCreatorInsights(userId),
      getHubEarnings(userId),
      getHubChallenge(userId),
      getHubFeaturedLive(userId),
    ]);

  return { stats, stories, user, insights, earnings, challenge, featuredLive };
}

export async function getHubAnalytics(userId: string) {
  const [stats, insights, earnings, user, challenge] = await Promise.all([
    getHubPlatformStats(),
    getHubCreatorInsights(userId),
    getHubEarnings(userId),
    getHubUserSnapshot(userId),
    getHubChallenge(userId),
  ]);

  return { stats, insights, earnings, user, challenge };
}

export type HubWalletSummary = {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  currency: string;
  aggregation: {
    vendor: number;
    affiliate: number;
    creator: number;
    other: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    created_at: string;
  }>;
};

export async function getHubWallet(userId: string): Promise<HubWalletSummary> {
  const supabase = await createClient();

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    supabase.from("wallets").select("available_balance, pending_balance, total_earned, currency").eq("user_id", userId).maybeSingle(),
    supabase
      .from("transactions")
      .select("id, type, amount, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const aggregation = { vendor: 0, affiliate: 0, creator: 0, other: 0 };
  for (const tx of transactions ?? []) {
    const amount = Number(tx.amount ?? 0);
    if (tx.type === "vendor_earning") aggregation.vendor += amount;
    else if (tx.type === "affiliate_commission" || tx.type === "affiliate_earning") aggregation.affiliate += amount;
    else if (tx.type === "community_earning") aggregation.creator += amount;
    else aggregation.other += amount;
  }

  return {
    available_balance: Number(wallet?.available_balance ?? 0),
    pending_balance: Number(wallet?.pending_balance ?? 0),
    total_earned: Number(wallet?.total_earned ?? 0),
    currency: wallet?.currency ?? "USD",
    aggregation,
    recentTransactions: (transactions ?? []).map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount ?? 0),
      description: tx.description,
      created_at: tx.created_at ?? new Date().toISOString(),
    })),
  };
}
