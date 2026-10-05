import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { safeMediaUrl } from "@/lib/media/optimize-url";
import { resolveProfileFollowerCount } from "@/lib/community/follower-count";
import { PRIORITY_POPULAR_USERNAMES } from "@/lib/community/discovery-priorities";

export const POPULAR_USER_COUNT = 5;

export type FeedSidebarPopularUser = {
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  followerCount: number;
  verified: boolean;
  href: string;
};

export type FeedSidebarLiveCreator = {
  id: string;
  title: string;
  hostName: string;
  hostAvatarUrl: string | null;
  href: string;
  viewerCount: number | null;
  thumbnailUrl: string | null;
};

function profileHref(username: string | null | undefined, userId: string): string {
  if (username?.trim()) return `/u/${encodeURIComponent(username.trim())}`;
  return `/influencers/u/${userId}`;
}

function mediaUrlOrNull(url: string | null | undefined, width: number): string | null {
  return safeMediaUrl(url, width) ?? null;
}

function isValidAvatar(url: string | null | undefined): url is string {
  if (!url?.trim()) return false;
  if (url.startsWith("data:")) return false;
  return true;
}

function isPublicUsername(username: string | null | undefined): username is string {
  if (!username?.trim()) return false;
  const cleaned = username.trim().replace(/^@+/, "");
  // Real public handles only — reject spaces / display-name leftovers.
  return /^[a-zA-Z0-9._]{2,32}$/.test(cleaned);
}

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@+/, "");
}

function displayName(
  fullName: string | null | undefined,
  username: string | null | undefined,
  fallback?: string | null
): string | null {
  const name = fullName?.trim() || username?.trim() || fallback?.trim();
  return name && name.length >= 2 ? name : null;
}

/** Top community creators for the feed sidebar — exactly five when enough real profiles exist. */
export async function loadFeedSidebarPopularUsers(
  excludeUserId?: string | null
): Promise<FeedSidebarPopularUser[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any;

  type InfluencerRow = {
    user_id: string;
    display_name: string | null;
    profile_image: string | null;
    total_followers: number | null;
    is_verified: boolean | null;
    is_featured: boolean | null;
  };

  type ProfileRow = {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    follower_count: number | null;
    is_verified: boolean | null;
    is_active: boolean | null;
    email?: string | null;
  };

  const candidates: FeedSidebarPopularUser[] = [];
  const seen = new Set<string>();
  const seenDisplayNames = new Set<string>();

  function isEditorialPersona(profile: ProfileRow | undefined): boolean {
    if (!profile) return false;
    const email = (profile.email ?? "").trim().toLowerCase();
    return email.startsWith("editorial+") && email.endsWith("@jimvio.com");
  }

  function normalizeDisplayName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
  }

  function pushCandidate(input: {
    userId: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
    followerCount: number;
    verified: boolean;
  }) {
    if (seen.has(input.userId) || input.userId === excludeUserId) return;
    if (candidates.length >= POPULAR_USER_COUNT) return;
    const nameKey = normalizeDisplayName(input.name);
    // Prefer distinct display names so the rail does not look artificial.
    if (nameKey && seenDisplayNames.has(nameKey)) return;
    seen.add(input.userId);
    if (nameKey) seenDisplayNames.add(nameKey);
    candidates.push({
      userId: input.userId,
      name: input.name,
      username: input.username,
      avatarUrl: input.avatarUrl,
      followerCount: input.followerCount,
      verified: input.verified,
      href: profileHref(input.username, input.userId),
    });
  }

  // Official community logos for branded provider accounts (never invent images).
  const brandedAvatarByUsername = new Map<string, string>();
  {
    const { data: brandedCommunities } = (await admin
      .from("communities")
      .select("slug, avatar_url, cover_image")
      .in("slug", PRIORITY_POPULAR_USERNAMES)
      .eq("is_active", true)
      .limit(10)) as {
      data:
        | { slug: string; avatar_url: string | null; cover_image: string | null }[]
        | null;
    };
    for (const row of brandedCommunities ?? []) {
      const logo =
        (isValidAvatar(row.avatar_url) ? row.avatar_url : null) ??
        (isValidAvatar(row.cover_image) ? row.cover_image : null);
      if (logo) brandedAvatarByUsername.set(row.slug.toLowerCase(), logo);
    }
  }

  // Pin real product-priority profiles first (Barick, P7 PROVIDER, …).
  if (PRIORITY_POPULAR_USERNAMES.length) {
    const usernameVariants = PRIORITY_POPULAR_USERNAMES.flatMap((u) => [u, `@${u}`]);
    const { data: priorityProfiles } = (await admin
      .from("profiles")
      .select("id, full_name, username, avatar_url, follower_count, is_verified, is_active, email")
      .in("username", usernameVariants)
      .eq("is_active", true)
      .limit(20)) as { data: ProfileRow[] | null };

    const byNorm = new Map<string, ProfileRow>();
    for (const profile of priorityProfiles ?? []) {
      if (!profile.username) continue;
      byNorm.set(normalizeUsername(profile.username).toLowerCase(), profile);
    }
    for (const wanted of PRIORITY_POPULAR_USERNAMES) {
      const profile = byNorm.get(wanted.toLowerCase());
      // Priority pins may be brand accounts (including non-editorial owners).
      if (!profile) continue;
      const usernameRaw = profile.username?.trim() || null;
      if (!isPublicUsername(usernameRaw)) continue;
      const username = normalizeUsername(usernameRaw);
      const name = displayName(profile.full_name, username);
      if (!name) continue;
      const branded = brandedAvatarByUsername.get(username.toLowerCase());
      const avatarRaw =
        (branded && isValidAvatar(branded) ? branded : null) ??
        (isValidAvatar(profile.avatar_url) ? profile.avatar_url : null);
      pushCandidate({
        userId: profile.id,
        name,
        username,
        avatarUrl: avatarRaw ? mediaUrlOrNull(avatarRaw, 96) : null,
        followerCount: resolveProfileFollowerCount({
          username,
          follower_count: profile.follower_count,
        }),
        verified: Boolean(profile.is_verified),
      });
    }
  }

  const { data: influencers } = (await admin
    .from("influencers")
    .select("user_id, display_name, profile_image, total_followers, is_verified, is_featured")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("total_followers", { ascending: false })
    .limit(24)) as { data: InfluencerRow[] | null };

  const influencerIds = [
    ...new Set((influencers ?? []).map((r) => r.user_id).filter(Boolean)),
  ].filter((id) => id !== excludeUserId);

  const profileById = new Map<string, ProfileRow>();
  if (influencerIds.length) {
    const { data: profiles } = (await admin
      .from("profiles")
      .select("id, full_name, username, avatar_url, follower_count, is_verified, is_active, email")
      .in("id", influencerIds)) as { data: ProfileRow[] | null };
    for (const p of profiles ?? []) {
      if (p.is_active !== false) profileById.set(p.id, p);
    }
  }

  for (const inf of influencers ?? []) {
    if (!inf.user_id || seen.has(inf.user_id) || inf.user_id === excludeUserId) continue;
    const profile = profileById.get(inf.user_id);
    if (isEditorialPersona(profile)) continue;
    const name = displayName(profile?.full_name, profile?.username, inf.display_name);
    if (!name) continue;
    const usernameRaw = profile?.username?.trim() || null;
    // Popular Users requires a real public handle — skip nameless influencer rows
    // (e.g. personal Google accounts) so brand accounts stay featured cleanly.
    if (!isPublicUsername(usernameRaw)) continue;
    const username = normalizeUsername(usernameRaw);
    if (username.toLowerCase() === "jimvio") continue;

    const branded = brandedAvatarByUsername.get(username.toLowerCase());
    const avatarRaw =
      (branded && isValidAvatar(branded) ? branded : null) ??
      (isValidAvatar(profile?.avatar_url) ? profile.avatar_url : null) ??
      (isValidAvatar(inf.profile_image) ? inf.profile_image : null);
    if (!avatarRaw) continue;
    const avatarUrl = mediaUrlOrNull(avatarRaw, 96);
    const followerCount = resolveProfileFollowerCount({
      username,
      follower_count: profile?.follower_count ?? inf.total_followers ?? 0,
    });

    pushCandidate({
      userId: inf.user_id,
      name,
      username,
      avatarUrl,
      followerCount,
      verified: Boolean(profile?.is_verified || inf.is_verified),
    });
    if (candidates.length >= POPULAR_USER_COUNT) break;
  }

  if (candidates.length < POPULAR_USER_COUNT) {
    // Prefer real non-editorial profiles with public handles + avatars.
    const { data: profileRows } = (await admin
      .from("profiles")
      .select(
        "id, full_name, username, avatar_url, follower_count, is_verified, is_active, email"
      )
      .eq("is_active", true)
      .or("email.is.null,email.not.ilike.editorial+%@jimvio.com")
      .order("follower_count", { ascending: false })
      .order("id", { ascending: true })
      .limit(80)) as { data: ProfileRow[] | null };

    for (const profile of profileRows ?? []) {
      if (candidates.length >= POPULAR_USER_COUNT) break;
      if (!profile.id || seen.has(profile.id) || profile.id === excludeUserId) continue;
      if (isEditorialPersona(profile)) continue;
      const name = displayName(profile.full_name, profile.username);
      if (!name || !isPublicUsername(profile.username)) continue;
      const username = normalizeUsername(profile.username!);
      if (username.toLowerCase() === "jimvio") continue;
      if (!isValidAvatar(profile.avatar_url)) continue;

      pushCandidate({
        userId: profile.id,
        name,
        username,
        avatarUrl: mediaUrlOrNull(profile.avatar_url, 96),
        followerCount: resolveProfileFollowerCount({
          username,
          follower_count: profile.follower_count,
        }),
        verified: Boolean(profile.is_verified),
      });
    }
  }

  // Designated demo creators (editorial personas) fill remaining slots only —
  // never displace priority brand accounts, and never invent followers.
  if (candidates.length < POPULAR_USER_COUNT) {
    const { data: demoRows } = (await admin
      .from("profiles")
      .select(
        "id, full_name, username, avatar_url, follower_count, is_verified, is_active, email"
      )
      .eq("is_active", true)
      .ilike("email", "editorial+%@jimvio.com")
      .order("username", { ascending: true })
      .limit(60)) as { data: ProfileRow[] | null };

    for (const profile of demoRows ?? []) {
      if (candidates.length >= POPULAR_USER_COUNT) break;
      if (!profile.id || seen.has(profile.id) || profile.id === excludeUserId) continue;
      if (!isPublicUsername(profile.username) || !isValidAvatar(profile.avatar_url)) {
        continue;
      }
      const username = normalizeUsername(profile.username!);
      const name = displayName(profile.full_name, username);
      if (!name) continue;
      pushCandidate({
        userId: profile.id,
        name,
        username,
        avatarUrl: mediaUrlOrNull(profile.avatar_url, 96),
        followerCount: resolveProfileFollowerCount({
          username,
          follower_count: profile.follower_count,
        }),
        verified: Boolean(profile.is_verified),
      });
    }
  }

  return candidates.slice(0, POPULAR_USER_COUNT);
}

/** Live creators for the feed sidebar — real live_sessions rows only. */
export async function loadFeedSidebarLiveNow(limit = 8): Promise<FeedSidebarLiveCreator[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any;

  type LiveRow = {
    id: string;
    title: string | null;
    host_id: string;
    viewer_count: number | null;
    settings: Record<string, unknown> | null;
  };

  type ProfileRow = {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };

  const { data: sessions } = (await admin
    .from("live_sessions")
    .select("id, title, host_id, viewer_count, settings, status")
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(limit)) as { data: LiveRow[] | null };

  const rows = sessions ?? [];
  if (!rows.length) return [];

  const hostIds = [...new Set(rows.map((r) => r.host_id).filter(Boolean))];
  const { data: profiles } = (await admin
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", hostIds)) as { data: ProfileRow[] | null };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((session) => {
    const host = profileById.get(session.host_id);
    const hostName = host?.full_name?.trim() || host?.username?.trim() || "Creator";
    const settings = session.settings ?? {};
    const thumbRaw =
      typeof settings.thumbnail_url === "string" ? settings.thumbnail_url : null;
    const avatarRaw = isValidAvatar(host?.avatar_url) ? host!.avatar_url : null;

    return {
      id: session.id,
      title: session.title?.trim() || "Live now",
      hostName,
      hostAvatarUrl: avatarRaw ? mediaUrlOrNull(avatarRaw, 128) : null,
      href: `/communities/live/${session.id}`,
      viewerCount:
        typeof session.viewer_count === "number" && session.viewer_count > 0
          ? session.viewer_count
          : null,
      thumbnailUrl: thumbRaw ? mediaUrlOrNull(thumbRaw, 160) : null,
    };
  });
}
