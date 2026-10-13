import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";
import { extractHashtags } from "@/lib/feed/composer-utils";
import { isExcludedFromGlobalFeed } from "@/lib/feed/global-feed-exclusions";
import { normalizeHashtagQuery } from "@/lib/feed/hashtag-query";
import { isGuestVisiblePublicPost } from "@/lib/feed/public-post-visibility";
import type { GlobalCommunityFeedPost } from "@/lib/feed/load-global-community-feed";

type Db = {
  from: Awaited<ReturnType<typeof createClient>>["from"];
};

const POST_COLUMNS =
  "id, community_id, author_id, created_at, body, attachments, audience, is_exclusive, space_id, post_type, like_count, comment_count, view_count, share_count, title, images, video_url, room_id, is_published";

type Cursor = { created_at: string; id: string };

function encodeCursor(cursor: Cursor): string {
  return `tag:${cursor.created_at}:${cursor.id}`;
}

function parseCursor(raw: string | null | undefined): Cursor | null {
  if (!raw?.startsWith("tag:")) return null;
  const rest = raw.slice(4);
  const splitAt = rest.lastIndexOf(":");
  if (splitAt <= 0) return null;
  const created_at = rest.slice(0, splitAt);
  const id = rest.slice(splitAt + 1);
  if (!created_at || !id) return null;
  return { created_at, id };
}

function postMatchesTag(post: { body?: string | null; attachments?: unknown }, tag: string): boolean {
  if (extractHashtags(post.body ?? "").includes(tag)) return true;
  const attachments = post.attachments;
  if (!attachments || typeof attachments !== "object" || Array.isArray(attachments)) return false;
  const hashtags = (attachments as Record<string, unknown>).hashtags;
  if (!Array.isArray(hashtags)) return false;
  return hashtags.some((value) => typeof value === "string" && value.toLowerCase() === tag);
}

function isVisible(
  post: GlobalCommunityFeedPost,
  memberSet: Set<string>,
): boolean {
  if (isExcludedFromGlobalFeed(post)) return false;
  if (post.communities && memberSet.has(post.community_id)) {
    return true;
  }
  if (post.communities && !communityIsPubliclyDiscoverable(post.communities)) return false;
  return isGuestVisiblePublicPost(post);
}

export async function loadHashtagFeed(
  db: Db,
  params: {
    tag: string;
    limit?: number;
    cursor?: string | null;
    memberCommunityIds?: string[];
  },
): Promise<{ posts: GlobalCommunityFeedPost[]; next_cursor: string | null }> {
  const tag = normalizeHashtagQuery(params.tag);
  if (!tag) return { posts: [], next_cursor: null };

  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const before = parseCursor(params.cursor);
  const memberSet = new Set(params.memberCommunityIds ?? []);

  let query = db
    .from("community_posts")
    .select(POST_COLUMNS)
    .eq("is_published", true)
    .ilike("body", `%#${tag}%`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(Math.min(limit * 4, 80));

  if (before) query = query.lte("created_at", before.created_at);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const raw = ((data ?? []) as GlobalCommunityFeedPost[]).filter((row) => {
    if (before) {
      if (row.created_at > before.created_at) return false;
      if (row.created_at === before.created_at && row.id >= before.id) return false;
    }
    return postMatchesTag(row, tag);
  });

  const communityIds = [...new Set(raw.map((row) => row.community_id).filter(Boolean))];
  const authorIds = [
    ...new Set(raw.map((row) => row.author_id).filter((id): id is string => Boolean(id))),
  ];

  const [communityRes, profileRes] = await Promise.all([
    communityIds.length
      ? db
          .from("communities")
          .select("id, slug, name, is_private, is_active, visibility, visibility_mode, archived_at")
          .in("id", communityIds)
      : Promise.resolve({ data: [], error: null }),
    authorIds.length
      ? db.from("profiles").select("id, full_name, avatar_url, username").in("id", authorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (communityRes.error) throw new Error(communityRes.error.message);
  if (profileRes.error) throw new Error(profileRes.error.message);

  const communitiesById = new Map(
    ((communityRes.data ?? []) as Array<Record<string, unknown> & { id: string }>).map((row) => [
      row.id,
      row,
    ]),
  );
  const profilesById = new Map(
    ((profileRes.data ?? []) as Array<Record<string, unknown> & { id: string }>).map((row) => [
      row.id,
      row,
    ]),
  );

  const visible: GlobalCommunityFeedPost[] = [];
  for (const row of raw) {
    const community = communitiesById.get(row.community_id);
    const profile = row.author_id ? profilesById.get(row.author_id) : null;
    const hydrated: GlobalCommunityFeedPost = {
      ...row,
      communities: community
        ? {
            slug: (community.slug as string | null) ?? null,
            name: (community.name as string | null) ?? null,
            is_private: (community.is_private as boolean | null) ?? null,
            is_active: (community.is_active as boolean | null) ?? null,
            visibility: (community.visibility as string | null) ?? null,
            visibility_mode: (community.visibility_mode as string | null) ?? null,
            archived_at: (community.archived_at as string | null) ?? null,
          }
        : null,
      profiles: profile
        ? {
            full_name: (profile.full_name as string | null) ?? null,
            avatar_url: (profile.avatar_url as string | null) ?? null,
            username: (profile.username as string | null) ?? null,
          }
        : null,
    };
    if (!isVisible(hydrated, memberSet)) continue;
    visible.push(hydrated);
    if (visible.length > limit) break;
  }

  const page = visible.slice(0, limit);
  const last = page[page.length - 1];
  const next_cursor =
    visible.length > limit && last
      ? encodeCursor({ created_at: last.created_at, id: last.id })
      : null;

  return { posts: page, next_cursor };
}
