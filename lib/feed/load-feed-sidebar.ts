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
  const seenFirstNames = new Set<string>();
  const seenFirstPrefixes = new Set<string>();
  const seenLastNames = new Set<string>();
  const seenAvatarKeys = new Set<string>();

  function isEditorialPersona(profile: ProfileRow | undefined): boolean {
    if (!profile) return false;
    const email = (profile.email ?? "").trim().toLowerCase();
    return email.startsWith("editorial+") && email.endsWith("@jimvio.com");
  }

  function normalizeDisplayName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
  }

  function firstNameKey(name: string): string {
    const first = normalizeDisplayName(name).split(" ")[0] ?? "";
    return first.replace(/[^a-z0-9]/g, "");
  }

  /** Collapse near-identical given names (Abdulahi / Abeba / Abena). */
  function firstNamePrefixKey(name: string): string | null {
    const first = firstNameKey(name);
    if (first.length < 3) return first || null;
    return first.slice(0, 3);
  }

  function lastNameKey(name: string): string | null {
    const parts = normalizeDisplayName(name).split(" ").filter(Boolean);
    if (parts.length < 2) return null;
    const last = (parts[parts.length - 1] ?? "").replace(/[^a-z0-9]/g, "");
    return last || null;
  }

  /** Strip size/query noise so identical Unsplash/CDN assets collide. */
  function avatarDiversityKey(url: string | null | undefined): string | null {
    if (!url?.trim()) return null;
    try {
      const u = new URL(url.trim());
      // Drop common transform params; keep host+path as fingerprint.
      return `${u.host}${u.pathname}`.toLowerCase();
    } catch {
      return url.trim().split("?")[0].toLowerCase();
    }
  }

  function pushCandidate(input: {
    userId: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
    followerCount: number;
    verified: boolean;
    /** Priority pins may share a first name with others; still enforce unique ids. */
    allowDuplicateFirstName?: boolean;
    allowDuplicateAvatar?: boolean;
  }) {
    if (seen.has(input.userId) || input.userId === excludeUserId) return;
    if (candidates.length >= POPULAR_USER_COUNT) return;
    const nameKey = normalizeDisplayName(input.name);
    const firstKey = firstNameKey(input.name);
    const prefixKey = firstNamePrefixKey(input.name);
    const lastKey = lastNameKey(input.name);
    const avatarKey = avatarDiversityKey(input.avatarUrl);
    // Prefer distinct display names so the rail does not look artificial.
    if (nameKey && seenDisplayNames.has(nameKey)) return;
    // Also avoid stacks of "Abdulahi …" / identical given names.
    if (
      firstKey &&
      seenFirstNames.has(firstKey) &&
      !input.allowDuplicateFirstName
    ) {
      return;
    }
    // Avoid visually similar first-name clusters (Abeba / Abena).
    if (
      prefixKey &&
      seenFirstPrefixes.has(prefixKey) &&
      !input.allowDuplicateFirstName
    ) {
      return;
    }
    // Prefer distinct surnames when alternatives exist (Diallo ×2).
    if (lastKey && seenLastNames.has(lastKey) && !input.allowDuplicateFirstName) {
      return;
    }
    // Prefer distinct avatar assets when legitimate alternatives exist.
    if (
      avatarKey &&
      seenAvatarKeys.has(avatarKey) &&
      !input.allowDuplicateAvatar
    ) {
      return;
    }
    seen.add(input.userId);
    if (nameKey) seenDisplayNames.add(nameKey);
    if (firstKey) seenFirstNames.add(firstKey);
    if (prefixKey) seenFirstPrefixes.add(prefixKey);
    if (lastKey) seenLastNames.add(lastKey);
    if (avatarKey) seenAvatarKeys.add(avatarKey);
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

  // Official logos + priority pins + influencer pool in parallel.
  const usernameVariants = PRIORITY_POPULAR_USERNAMES.flatMap((u) => [u, `@${u}`]);
  const [brandedSettled, prioritySettled, influencersSettled] = await Promise.all([
    PRIORITY_POPULAR_USERNAMES.length
      ? admin
          .from("communities")
          .select("slug, avatar_url, cover_image")
          .in("slug", PRIORITY_POPULAR_USERNAMES)
          .eq("is_active", true)
          .limit(10)
      : Promise.resolve({ data: [] as { slug: string; avatar_url: string | null; cover_image: string | null }[] }),
    PRIORITY_POPULAR_USERNAMES.length
      ? admin
          .from("profiles")
          .select("id, full_name, username, avatar_url, follower_count, is_verified, is_active, email")
          .in("username", usernameVariants)
          .eq("is_active", true)
          .limit(20)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    admin
      .from("influencers")
      .select("user_id, display_name, profile_image, total_followers, is_verified, is_featured")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("total_followers", { ascending: false })
      .limit(40),
  ]);

  const brandedAvatarByUsername = new Map<string, string>();
  {
    const brandedCommunities =
      (brandedSettled as { data: { slug: string; avatar_url: string | null; cover_image: string | null }[] | null })
        .data ?? [];
    for (const row of brandedCommunities) {
      const logo =
        (isValidAvatar(row.avatar_url) ? row.avatar_url : null) ??
        (isValidAvatar(row.cover_image) ? row.cover_image : null);
      if (logo) brandedAvatarByUsername.set(row.slug.toLowerCase(), logo);
    }
  }

  // Pin real product-priority profiles first (Barick, P7 PROVIDER, …).
  {
    const priorityProfiles =
      ((prioritySettled as { data: ProfileRow[] | null }).data ?? []) as ProfileRow[];
    const byNorm = new Map<string, ProfileRow>();
    for (const profile of priorityProfiles) {
      if (!profile.username) continue;
      byNorm.set(normalizeUsername(profile.username).toLowerCase(), profile);
    }
    for (const wanted of PRIORITY_POPULAR_USERNAMES) {
      const profile = byNorm.get(wanted.toLowerCase());
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
        allowDuplicateFirstName: true,
        allowDuplicateAvatar: true,
      });
    }
  }

  const influencers =
    ((influencersSettled as { data: InfluencerRow[] | null }).data ?? []) as InfluencerRow[];

  const influencerIds = [
    ...new Set(influencers.map((r) => r.user_id).filter(Boolean)),
  ].filter((id) => id !== excludeUserId);

  const profileById = new Map<string, ProfileRow>();
  if (influencerIds.length && candidates.length < POPULAR_USER_COUNT) {
    const { data: profiles } = (await admin
      .from("profiles")
      .select("id, full_name, username, avatar_url, follower_count, is_verified, is_active, email")
      .in("id", influencerIds)) as { data: ProfileRow[] | null };
    for (const p of profiles ?? []) {
      if (p.is_active !== false) profileById.set(p.id, p);
    }
  }

  for (const inf of influencers) {
    if (candidates.length >= POPULAR_USER_COUNT) break;
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
      .limit(40)) as { data: ProfileRow[] | null };

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
