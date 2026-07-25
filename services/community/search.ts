import { createClient } from "@/lib/supabase/server";

export type CommunitySearchType = "posts" | "members" | "spaces" | "rooms";

export type CommunitySearchResult = {
  id: string;
  type: CommunitySearchType;
  title: string;
  subtitle: string | null;
  href: string;
  avatarUrl?: string | null;
  communityName?: string | null;
  communitySlug?: string | null;
};

export type CommunitySearchOptions = {
  q: string;
  userId: string;
  communityId?: string | null;
  types?: CommunitySearchType[];
  limit?: number;
};

const ALL_TYPES: CommunitySearchType[] = ["posts", "members", "spaces", "rooms"];

async function getMembershipCommunityIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  communityId?: string | null
): Promise<string[]> {
  let query = supabase
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (communityId) {
    query = query.eq("community_id", communityId);
  }

  const { data } = await query;
  return (data ?? []).map((m) => m.community_id);
}

function escapeIlike(q: string): string {
  return q.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

/** Quote a value for PostgREST `.or()` filters (handles commas / spaces). */
function orIlike(column: string, pattern: string): string {
  const safe = pattern.replace(/"/g, '""');
  return `${column}.ilike."${safe}"`;
}

export async function searchCommunities(
  options: CommunitySearchOptions
): Promise<CommunitySearchResult[]> {
  const supabase = await createClient();
  const q = options.q.trim();
  if (q.length < 1) return [];

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 40);
  const perType = Math.max(4, Math.ceil(limit / 2));
  const types = options.types?.length
    ? options.types.filter((t) => ALL_TYPES.includes(t))
    : ALL_TYPES;

  const communityIds = await getMembershipCommunityIds(
    supabase,
    options.userId,
    options.communityId
  );

  if (communityIds.length === 0) return [];

  if (options.communityId && !communityIds.includes(options.communityId)) {
    return [];
  }

  const pattern = `%${escapeIlike(q)}%`;
  const results: CommunitySearchResult[] = [];

  const communityMap = new Map<string, { name: string; slug: string }>();
  const { data: communities } = await supabase
    .from("communities")
    .select("id, name, slug")
    .in("id", communityIds);
  for (const c of communities ?? []) {
    communityMap.set(c.id, { name: c.name, slug: c.slug });
  }

  const tasks: Promise<void>[] = [];

  if (types.includes("posts")) {
    tasks.push(
      (async () => {
        const { data } = await supabase
          .from("community_posts")
          .select("id, title, body, community_id")
          .in("community_id", communityIds)
          .eq("is_published", true)
          .or([orIlike("title", pattern), orIlike("body", pattern)].join(","))
          .order("created_at", { ascending: false })
          .limit(perType);

        for (const post of data ?? []) {
          const community = communityMap.get(post.community_id);
          const title =
            (post.title?.trim() || post.body?.replace(/\s+/g, " ").trim().slice(0, 80)) ??
            "Post";
          results.push({
            id: post.id,
            type: "posts",
            title,
            subtitle: community?.name ?? null,
            href: community ? `/communities/${community.slug}` : "/communities",
            communityName: community?.name ?? null,
            communitySlug: community?.slug ?? null,
          });
        }
      })()
    );
  }

  if (types.includes("members")) {
    tasks.push(
      (async () => {
        const { data } = await supabase
          .from("community_memberships")
          .select(
            "id, community_id, role, profiles!community_memberships_user_id_fkey(id, full_name, username, avatar_url)"
          )
          .in("community_id", communityIds)
          .eq("status", "active")
          .limit(200);

        const needle = q.toLowerCase();
        const seen = new Set<string>();

        for (const row of data ?? []) {
          const profile = row.profiles as {
            id: string;
            full_name: string | null;
            username: string | null;
            avatar_url: string | null;
          } | null;
          if (!profile) continue;

          const name = profile.full_name ?? "";
          const username = profile.username ?? "";
          const hay = `${name} ${username}`.toLowerCase();
          if (!hay.includes(needle)) continue;

          const dedupeKey = `${profile.id}:${row.community_id}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          const community = communityMap.get(row.community_id);
          results.push({
            id: `${profile.id}-${row.community_id}`,
            type: "members",
            title: name || username || "Member",
            subtitle: [username ? `@${username}` : null, row.role, community?.name]
              .filter(Boolean)
              .join(" · "),
            href: username
              ? `/communities/profile/${username}`
              : community
                ? `/communities/${community.slug}/members`
                : "/communities",
            avatarUrl: profile.avatar_url,
            communityName: community?.name ?? null,
            communitySlug: community?.slug ?? null,
          });

          if (results.filter((r) => r.type === "members").length >= perType) break;
        }
      })()
    );
  }

  if (types.includes("spaces")) {
    tasks.push(
      (async () => {
        const { data } = await supabase
          .from("spaces")
          .select("id, name, slug, description, community_id")
          .in("community_id", communityIds)
          .eq("is_active", true)
          .or([orIlike("name", pattern), orIlike("description", pattern)].join(","))
          .order("sort_order", { ascending: true })
          .limit(perType);

        for (const space of data ?? []) {
          const community = communityMap.get(space.community_id);
          results.push({
            id: space.id,
            type: "spaces",
            title: space.name,
            subtitle: space.description?.slice(0, 80) ?? community?.name ?? null,
            href: community
              ? `/communities/${community.slug}/spaces/${space.slug}`
              : "/communities/spaces",
            communityName: community?.name ?? null,
            communitySlug: community?.slug ?? null,
          });
        }
      })()
    );
  }

  if (types.includes("rooms")) {
    tasks.push(
      (async () => {
        const { data } = await supabase
          .from("rooms")
          .select("id, name, slug, description, community_id, space_id, spaces(slug)")
          .in("community_id", communityIds)
          .eq("is_active", true)
          .or([orIlike("name", pattern), orIlike("description", pattern)].join(","))
          .order("sort_order", { ascending: true })
          .limit(perType);

        for (const room of data ?? []) {
          const community = communityMap.get(room.community_id);
          const space = room.spaces as { slug: string } | null;
          results.push({
            id: room.id,
            type: "rooms",
            title: room.name,
            subtitle: community?.name ?? null,
            href:
              community && space
                ? `/communities/${community.slug}/spaces/${room.slug}`
                : community
                  ? `/communities/${community.slug}/chats`
                  : "/communities",
            communityName: community?.name ?? null,
            communitySlug: community?.slug ?? null,
          });
        }
      })()
    );
  }

  await Promise.all(tasks);

  const typeRank: Record<CommunitySearchType, number> = {
    posts: 0,
    members: 1,
    spaces: 2,
    rooms: 3,
  };

  return results
    .sort((a, b) => typeRank[a.type] - typeRank[b.type] || a.title.localeCompare(b.title))
    .slice(0, limit);
}
