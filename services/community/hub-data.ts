import { createClient } from "@/lib/supabase/server";
import { aggregateMemberPoints, buildPointsSnapshot } from "@/lib/community/points";

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
  community_id: string;
  community_name: string;
  community_slug: string;
  room_count: number;
  member_count: number;
  href: string;
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
  total_lessons: number;
  progress: number;
  community_name: string;
  community_slug: string;
  href: string;
};

export type HubLiveRoom = {
  id: string;
  name: string;
  community_name: string;
  community_slug: string;
  space_slug: string;
  room_slug: string;
  message_count: number;
  href: string;
};

export type CommunityOverviewStats = {
  membersOnline: number;
  membersOnlineDelta: string | null;
  liveNow: number;
  voiceRooms: number;
  courseCount: number;
  activeRoomCount: number;
  messagesThisWeek: number;
  description: string | null;
  rules: string[];
  courses: Array<{
    id: string;
    title: string;
    difficulty: string;
    total_lessons: number;
    progress: number;
    href: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    start_date: string;
    href: string;
  }>;
  activeMembers: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    status: string;
  }>;
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
      href: profile?.username ? `/c/profile/${profile.username}` : "/c/profile",
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
    href: community ? `/c/community/${community.slug}` : "/c/live",
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
            "id, title, description, due_date, completion_count, community_id, communities(name, slug)"
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
      href: community ? `/c/community/${community.slug}` : null,
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
      href: "/dashboard/ugc",
    });
  }

  return events.sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
}

export async function getHubSpaces(userId: string): Promise<HubSpaceItem[]> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);
  if (communityIds.length === 0) return [];

  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, name, slug, description, community_id, room_count, member_count, communities(name, slug)")
    .in("community_id", communityIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(50);

  return (spaces ?? []).map((space) => {
    const community = space.communities as { name: string; slug: string } | null;
    return {
      id: space.id,
      name: space.name,
      slug: space.slug,
      description: space.description,
      community_id: space.community_id,
      community_name: community?.name ?? "Community",
      community_slug: community?.slug ?? "",
      room_count: space.room_count ?? 0,
      member_count: space.member_count ?? 0,
      href: community ? `/c/community/${community.slug}` : "/c",
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
      "id, title, description, due_date, points, completion_count, communities(name, slug)"
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
      href: community ? `/c/community/${community.slug}` : "/c/missions",
    };
  });
}

export async function getHubCourses(userId: string): Promise<HubCourseItem[]> {
  const supabase = await createClient();
  const communityIds = await getUserCommunityIds(supabase, userId);
  if (communityIds.length === 0) return [];

  const { data: courses } = await supabase
    .from("community_courses")
    .select("id, title, description, difficulty, total_lessons, communities(name, slug)")
    .in("community_id", communityIds)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  const courseIds = (courses ?? []).map((c) => c.id);
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

  return (courses ?? []).map((course) => {
    const community = course.communities as { name: string; slug: string } | null;
    const progress = progressByCourse.get(course.id);
    const totalLessons = course.total_lessons ?? 0;
    const progressPct =
      totalLessons > 0 && progress
        ? Math.round((progress.completed / totalLessons) * 100)
        : progress?.completed
          ? 100
          : 0;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      difficulty: course.difficulty ?? "beginner",
      total_lessons: totalLessons,
      progress: Math.min(progressPct, 100),
      community_name: community?.name ?? "Community",
      community_slug: community?.slug ?? "",
      href: community ? `/c/community/${community.slug}/courses` : "/c/courses",
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
        community_name: community?.name ?? "Community",
        community_slug: community?.slug ?? "",
        space_slug: space?.slug ?? "",
        room_slug: room.slug,
        message_count: counts.get(room.id) ?? 0,
        href:
          community && space
            ? `/c/community/${community.slug}/room?space=${space.slug}&room=${room.slug}`
            : community
              ? `/c/community/${community.slug}/chats`
              : "/c/live",
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

export async function getHubLiveDashboard(userId: string) {
  const supabase = await createClient();
  const [stats, rooms, featuredLive, earnings, upcomingRaw] = await Promise.all([
    getHubPlatformStats(),
    getHubLiveRooms(userId),
    getHubFeaturedLive(userId),
    getHubEarnings(userId),
    getHubEvents(userId),
  ]);

  const primaryRoom = rooms[0] ?? null;
  let chatMessages: HubLiveChatMessage[] = [];
  let speakers: HubLiveSpeaker[] = [];

  if (primaryRoom) {
    const { data: msgs } = await supabase
      .from("community_messages")
      .select(
        "id, body, created_at, sender_id, reactions, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)"
      )
      .eq("room_id", primaryRoom.id)
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

    const seen = new Set<string>();
    for (const m of reversed) {
      if (seen.has(m.sender_id)) continue;
      seen.add(m.sender_id);
      const profile = m.profiles as {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
      } | null;
      speakers.push({
        id: m.sender_id,
        name: profile?.full_name ?? profile?.username ?? "Member",
        avatar_url: profile?.avatar_url ?? null,
        role: seen.size === 1 ? "Host" : "Speaker",
      });
      if (speakers.length >= 6) break;
    }
  }

  const viewers = primaryRoom?.message_count ?? stats.membersOnline;
  const analytics: HubLiveAnalytics = {
    viewers: Math.max(viewers, stats.liveSessions),
    liveViewers: Math.max(Math.round(viewers * 0.85), 1),
    likes: chatMessages.reduce((sum, m) => sum + m.reaction_count, 0),
    newJoins: Math.max(speakers.length, 1),
    messages: chatMessages.length,
    comments: chatMessages.filter((m) => m.body.length > 0).length,
    shares: Math.round(chatMessages.length * 0.15),
    reactionsPct: chatMessages.length
      ? Math.min(99, Math.round((chatMessages.filter((m) => m.reaction_count > 0).length / chatMessages.length) * 100))
      : 0,
    peakViewers: Math.max(viewers, stats.liveSessions * 2),
    watchTimeMinutes: Math.max(chatMessages.length * 2, viewers),
    revenue: earnings.total,
  };

  const upcomingSessions: HubLiveUpcoming[] = upcomingRaw
    .filter((e) => new Date(e.start_date) >= new Date())
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      title: e.title,
      host: e.location ?? "Community",
      start_date: e.start_date,
      href: e.href ?? "/c/events",
    }));

  const sessionTitle =
    featuredLive?.title ?? primaryRoom?.name ?? "Community Live Room";
  const sessionHost = featuredLive?.hostName ?? primaryRoom?.community_name ?? "Jimvio";
  const sessionHref = featuredLive?.href ?? primaryRoom?.href ?? "/c/live";

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
      tag: primaryRoom?.community_name ?? "Live Room",
      roomId: primaryRoom?.id ?? null,
    },
  };
}

export async function getCommunityOverviewStats(
  communityId: string,
  userId: string
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
  ] = await Promise.all([
    supabase
      .from("communities")
      .select("description, long_description, tagline")
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
      .select("id, title, difficulty, total_lessons")
      .eq("community_id", communityId)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(6),
    supabase
      .from("rooms")
      .select("id, room_type")
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
      .limit(5),
    supabase
      .from("lesson_progress")
      .select("course_id, is_completed")
      .eq("user_id", userId),
  ]);

  const community = communityRes.data;
  const description =
    community?.description ??
    community?.long_description ??
    community?.tagline ??
    null;

  const rules = (community?.long_description ?? community?.description ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length < 120)
    .slice(0, 6);

  const chatRoomIds = new Set(
    (roomsRes.data ?? []).filter((r) => r.room_type === "chat").map((r) => r.id)
  );
  const activeRoomIds = new Set((recentMessagesRes.data ?? []).map((m) => m.room_id));
  const liveNow = [...activeRoomIds].filter((id) => chatRoomIds.has(id)).length;
  const voiceRooms = liveNow;

  const courseIds = (coursesRes.data ?? []).map((c) => c.id);
  const progressByCourse = new Map<string, number>();
  for (const row of progressRes.data ?? []) {
    if (!courseIds.includes(row.course_id)) continue;
    if (row.is_completed) {
      progressByCourse.set(row.course_id, (progressByCourse.get(row.course_id) ?? 0) + 1);
    }
  }

  const slugRes = await supabase
    .from("communities")
    .select("slug")
    .eq("id", communityId)
    .maybeSingle();
  const slug = slugRes.data?.slug ?? "";

  return {
    membersOnline: onlineNowRes.count ?? 0,
    membersOnlineDelta: formatDelta(onlineNowRes.count ?? 0, onlinePrevRes.count ?? 0),
    liveNow,
    voiceRooms,
    courseCount: coursesRes.data?.length ?? 0,
    activeRoomCount: roomsRes.data?.length ?? 0,
    messagesThisWeek: messagesWeekRes.count ?? 0,
    description,
    rules,
    courses: (coursesRes.data ?? []).map((course) => {
      const completed = progressByCourse.get(course.id) ?? 0;
      const totalLessons = course.total_lessons ?? 0;
      const progress =
        totalLessons > 0 ? Math.min(Math.round((completed / totalLessons) * 100), 100) : 0;
      return {
        id: course.id,
        title: course.title,
        difficulty: course.difficulty ?? "beginner",
        total_lessons: totalLessons,
        progress,
        href: `/c/community/${slug}/courses`,
      };
    }),
    upcomingEvents: (tasksRes.data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      start_date: task.due_date!,
      href: `/c/community/${slug}`,
    })),
    activeMembers: (activeMembersRes.data ?? []).map((member) => {
      const profile = member.profiles as {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
      } | null;
      return {
        id: member.user_id,
        name: profile?.full_name ?? profile?.username ?? "Member",
        avatar_url: profile?.avatar_url ?? null,
        status: "Active now",
      };
    }),
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
