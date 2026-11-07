import "server-only";

import { createClient, getCachedUser } from "@/lib/supabase/server";
import {
  FEED_AUTH_GUEST,
  type FeedAuthInitial,
  type FeedHubCommunity,
  type FeedHubSnapshot,
  toDisplayName,
} from "@/lib/feed/feed-user";
import {
  canEnterOwnerConsole,
  listManageableCommunities,
} from "@/lib/community/owner-console/access";

type JoinedRow = {
  communities: FeedHubCommunity & { is_active?: boolean | null } | Array<FeedHubCommunity & { is_active?: boolean | null }> | null;
};

/**
 * Sidebar snapshot in parallel with the profile read (no browser waterfall).
 * Best-effort: on any error the sidebar falls back to its client loader.
 */
async function loadHubSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<FeedHubSnapshot | null> {
  try {
    const [joinedRes, ownedActiveRes, manageable, pointsRes] = await Promise.all([
      supabase
        .from("community_memberships")
        .select("communities!inner(id, name, slug, avatar_url, is_active)")
        .eq("user_id", userId)
        .eq("status", "active")
        .eq("communities.is_active", true)
        .limit(20),
      supabase
        .from("communities")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .is("archived_at", null)
        .limit(20),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listManageableCommunities(supabase as any, userId),
      supabase
        .from("member_points")
        .select("total_points, level")
        .eq("user_id", userId)
        .order("total_points", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (joinedRes.error) return null;

    const joined: FeedHubCommunity[] = [];
    for (const row of (joinedRes.data ?? []) as JoinedRow[]) {
      const c = Array.isArray(row.communities) ? row.communities[0] : row.communities;
      if (c?.id && c.slug && c.name) {
        joined.push({ id: c.id, name: c.name, slug: c.slug, avatar_url: c.avatar_url ?? null });
      }
    }

    // Only active communities can be managed from the hub sidebar.
    const activeIds = new Set<string>([
      ...joined.map((c) => c.id),
      ...((ownedActiveRes.data ?? []) as { id: string }[]).map((c) => c.id),
    ]);
    const manageTarget =
      manageable
        .filter((c) => activeIds.has(c.id) && canEnterOwnerConsole(c.role))
        .sort((a, b) => (a.role === "owner" ? -1 : 0) - (b.role === "owner" ? -1 : 0))[0] ?? null;

    const points = pointsRes.data as { total_points?: number | null; level?: number | null } | null;
    return {
      joined,
      manage: manageTarget ? { slug: manageTarget.slug, name: manageTarget.name } : null,
      level: points?.level ?? 1,
      xp: (points?.total_points ?? 0) % 1000,
    };
  } catch {
    return null;
  }
}

/** Server session snapshot for hub/feed hydration. Identity from getUser() only. */
export async function loadFeedAuthInitial(
  opts: { withHub?: boolean } = {},
): Promise<FeedAuthInitial> {
  try {
    const {
      data: { user: authUser },
    } = await getCachedUser();
    if (!authUser) return FEED_AUTH_GUEST;

    const supabase = await createClient();
    const [{ data: profile }, hub] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle(),
      opts.withHub ? loadHubSnapshot(supabase, authUser.id) : Promise.resolve(null),
    ]);

    const fullName = profile?.full_name ?? null;
    const username = profile?.username ?? null;

    return {
      isAuthenticated: true,
      user: {
        id: authUser.id,
        displayName: toDisplayName(fullName, username),
        fullName,
        username,
        avatarUrl: profile?.avatar_url ?? null,
      },
      hub,
    };
  } catch {
    return FEED_AUTH_GUEST;
  }
}
