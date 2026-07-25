import { createClient } from "@/lib/supabase/server";
import type { HubHomeActivity, HubHomeCommunity, HubHomePayload } from "./hub-home-types";

export type {
  HubHomeActivity,
  HubHomeCommunity,
  HubHomePayload,
} from "./hub-home-types";
export { hubGreeting } from "./hub-home-types";

/**
 * Real hub home data — my communities + recent activity across memberships.
 */
export async function loadHubHome(): Promise<HubHomePayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      communities: [],
      activity: [],
      liveCount: 0,
      missionCount: 0,
    };
  }

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("community_memberships")
      .select(
        `
        role,
        subscribed_at,
        created_at,
        community:communities!inner (
          id, name, slug, tagline, avatar_url, cover_image,
          member_count, is_private, is_active
        )
      `
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("subscribed_at", { ascending: false, nullsFirst: false })
      .limit(40),
  ]);

  const communityRows = (memberships ?? [])
    .map((row) => {
      const community = row.community as unknown as {
        id: string;
        name: string;
        slug: string;
        tagline: string | null;
        avatar_url: string | null;
        cover_image: string | null;
        member_count: number | null;
        is_private: boolean | null;
        is_active: boolean | null;
      } | null;
      if (!community?.id || !community.slug || community.is_active === false) return null;
      return {
        role: row.role as string | null,
        community,
        joinedAt: (row.subscribed_at ?? row.created_at) as string | null,
      };
    })
    .filter(Boolean) as Array<{
    role: string | null;
    community: {
      id: string;
      name: string;
      slug: string;
      tagline: string | null;
      avatar_url: string | null;
      cover_image: string | null;
      member_count: number | null;
      is_private: boolean | null;
    };
    joinedAt: string | null;
  }>;

  const communityIds = communityRows.map((r) => r.community.id);

  // live_sessions exists in production but is not yet in generated Database types.
  const untyped = supabase as unknown as {
    from: (relation: string) => ReturnType<typeof supabase.from>;
  };

  const [visitsRes, liveRes, postsRes, missionsRes] = await Promise.all([
    communityIds.length
      ? supabase
          .from("community_member_visits")
          .select("community_id, last_visited_at, last_path")
          .eq("user_id", user.id)
          .in("community_id", communityIds)
      : Promise.resolve({ data: [] as never[] }),
    communityIds.length
      ? untyped
          .from("live_sessions")
          .select("id, title, community_id, started_at, status, communities(name, slug)")
          .in("community_id", communityIds)
          .eq("status", "live")
          .order("started_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] as never[] }),
    communityIds.length
      ? supabase
          .from("community_posts")
          .select("id, title, body, created_at, community_id, communities(name, slug)")
          .in("community_id", communityIds)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] as never[] }),
    communityIds.length
      ? supabase
          .from("community_tasks")
          .select("id, title, due_date, community_id, communities(name, slug)")
          .in("community_id", communityIds)
          .eq("is_active", true)
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(8)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  type LiveRow = {
    id: string;
    title: string | null;
    community_id: string;
    started_at: string | null;
    communities: { name: string; slug: string } | null;
  };
  type PostRow = {
    id: string;
    title: string | null;
    body: string | null;
    created_at: string;
    communities: { name: string; slug: string } | null;
  };
  type MissionRow = {
    id: string;
    title: string;
    due_date: string | null;
    communities: { name: string; slug: string } | null;
  };

  const liveRows = (liveRes.data ?? []) as LiveRow[];
  const postRows = (postsRes.data ?? []) as PostRow[];
  const missionRows = (missionsRes.data ?? []) as MissionRow[];

  const visitByCommunity = new Map(
    (visitsRes.data ?? []).map((v) => [
      v.community_id as string,
      {
        last_visited_at: v.last_visited_at as string,
        last_path: (v.last_path as string | null) ?? null,
      },
    ])
  );

  const liveCommunityIds = new Set(liveRows.map((s) => s.community_id));

  const communities: HubHomeCommunity[] = communityRows
    .map(({ role, community }) => {
      const visit = visitByCommunity.get(community.id);
      return {
        id: community.id,
        name: community.name,
        slug: community.slug,
        tagline: community.tagline,
        avatar_url: community.avatar_url,
        cover_image: community.cover_image,
        member_count: community.member_count ?? 0,
        role,
        is_private: Boolean(community.is_private),
        last_visited_at: visit?.last_visited_at ?? null,
        last_path: visit?.last_path ?? null,
        is_live: liveCommunityIds.has(community.id),
        unread_hint: 0,
      };
    })
    .sort((a, b) => {
      const aT = a.last_visited_at ? new Date(a.last_visited_at).getTime() : 0;
      const bT = b.last_visited_at ? new Date(b.last_visited_at).getTime() : 0;
      if (aT !== bT) return bT - aT;
      if (a.is_live !== b.is_live) return a.is_live ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const activity: HubHomeActivity[] = [];

  for (const session of liveRows) {
    const community = session.communities;
    if (!community?.slug) continue;
    activity.push({
      id: `live-${session.id}`,
      kind: "live",
      title: session.title || "Live session",
      community_name: community.name,
      community_slug: community.slug,
      href: `/communities/${community.slug}/live`,
      at: session.started_at ?? new Date().toISOString(),
      meta: "Live now",
    });
  }

  for (const post of postRows) {
    const community = post.communities;
    if (!community?.slug) continue;
    const title =
      post.title?.trim() ||
      String(post.body ?? "")
        .replace(/<[^>]+>/g, " ")
        .trim()
        .slice(0, 80) ||
      "New post";
    activity.push({
      id: `post-${post.id}`,
      kind: "post",
      title,
      community_name: community.name,
      community_slug: community.slug,
      href: `/communities/${community.slug}/feed`,
      at: post.created_at,
      meta: "New in feed",
    });
  }

  for (const mission of missionRows) {
    const community = mission.communities;
    if (!community?.slug) continue;
    activity.push({
      id: `mission-${mission.id}`,
      kind: "mission",
      title: mission.title,
      community_name: community.name,
      community_slug: community.slug,
      href: `/communities/${community.slug}/missions`,
      at: mission.due_date ?? new Date().toISOString(),
      meta: mission.due_date ? "Challenge" : "Open challenge",
    });
  }

  activity.sort((a, b) => {
    if (a.kind === "live" && b.kind !== "live") return -1;
    if (b.kind === "live" && a.kind !== "live") return 1;
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });

  return {
    user: profile
      ? {
          id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        }
      : {
          id: user.id,
          full_name: null,
          username: null,
          avatar_url: null,
        },
    communities,
    activity: activity.slice(0, 16),
    liveCount: liveRows.length,
    missionCount: missionRows.length,
  };
}
