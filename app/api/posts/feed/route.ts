import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/supabase";
import { assertCanPublishInRoom } from "@/lib/community/workspace/assert-can-publish";
import { sanitizePostImageUrls } from "@/lib/community/posts/sanitize-post-media";
import { extractHashtags, extractMentions } from "@/lib/feed/composer-utils";
import { rankFeedItems } from "@/lib/growth/feed-ranking";
import { isTechnicalFeedBody } from "@/lib/community/message-signaling";
import { roomBelongsToCommunity, roomSpaceMatches } from "@/lib/community/assert-room-community";
import { requireCommunityMember } from "@/lib/community/rbac";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";
import { loadPublicCommunityIds, loadPublicDiscoveryFeed } from "@/lib/feed/load-public-discovery-feed";
import { loadGlobalCommunityFeed } from "@/lib/feed/load-global-community-feed";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const AUDIENCES = new Set(["public", "followers", "community", "private"]);
const FEED_FILTERS = new Set([
  "for-you",
  "trending",
  "hot",
  "rising",
  "newest",
  "recommended",
  "following",
  "friends",
  "verified",
  // Legacy filters remain supported for existing clients.
  "ai-picks",
  "spaces",
  "missions",
]);

function excludeTechnicalPosts<T extends { body?: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => !isTechnicalFeedBody(row.body));
}

async function getPublicDiscoveryFeed(
  req: NextRequest,
  db: Awaited<ReturnType<typeof createClient>>,
) {
  const { searchParams } = req.nextUrl;
  const result = await loadPublicDiscoveryFeed(db, {
    limit: Number(searchParams.get("limit") ?? PAGE_SIZE),
    cursor: searchParams.get("cursor"),
    filter: searchParams.get("filter") ?? "for-you",
    communityId: searchParams.get("community_id"),
    draftsOnly: searchParams.get("drafts") === "1",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(
    { posts: result.posts, next_cursor: result.next_cursor },
    { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
  );
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return getPublicDiscoveryFeed(req, supabase);

  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? PAGE_SIZE), 50);
  const cursor = searchParams.get("cursor");
  const requestedFilter = searchParams.get("filter") ?? "for-you";
  const filter = FEED_FILTERS.has(requestedFilter) ? requestedFilter : "for-you";
  const communityId = searchParams.get("community_id");
  const draftsOnly = searchParams.get("drafts") === "1";

  const { data: memberships, error: membershipError } = await supabase
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  const membershipIds = (memberships ?? []).map((m) => m.community_id);
  if (communityId && !membershipIds.includes(communityId)) {
    return getPublicDiscoveryFeed(req, supabase);
  }

  let publicCommunityIds: string[] = [];
  if (!communityId && !draftsOnly) {
    const loaded = await loadPublicCommunityIds(supabase);
    if (loaded.error) {
      return NextResponse.json({ error: loaded.error }, { status: 400 });
    }
    publicCommunityIds = loaded.ids;
  }

  const communityIds = communityId
    ? [communityId]
    : Array.from(new Set([...membershipIds, ...publicCommunityIds]));

  if (!communityIds.length) {
    return NextResponse.json({ posts: [], next_cursor: null });
  }

  const db = supabase as any;
  const [{ data: followRows }, { data: sharedMembershipRows }] = await Promise.all([
    db
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .limit(500),
    filter === "friends" && membershipIds.length
      ? supabase
          .from("community_memberships")
          .select("user_id")
          .in("community_id", membershipIds)
          .eq("status", "active")
          .neq("user_id", user.id)
          .limit(2000)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);
  const followedAuthorIds = new Set<string>(
    ((followRows ?? []) as { following_id: string }[]).map((row) => row.following_id)
  );
  const friendAuthorIds = new Set<string>(
    ((sharedMembershipRows ?? []) as { user_id: string }[]).map((row) => row.user_id)
  );

  if (!communityId && !draftsOnly && filter !== "following" && filter !== "friends") {
    try {
      const useRanking = filter !== "newest";
      const global = await loadGlobalCommunityFeed(supabase, {
        limit,
        cursor,
        viewerId: user.id,
        followedAuthorIds,
        memberCommunityIds: membershipIds,
        useRanking,
      });

      let pageRows = global.posts;
      if (filter === "verified") {
        const { data: featuredCommunities } = await supabase
          .from("communities")
          .select("id")
          .or("is_featured.eq.true,member_count.gte.100");
        const featuredIds = new Set((featuredCommunities ?? []).map((c) => c.id));
        pageRows = pageRows.filter((p) => featuredIds.has(p.community_id));
      } else if (filter === "spaces") {
        pageRows = pageRows.filter(
          (p) => p.space_id && p.space_id !== "00000000-0000-0000-0000-000000000000",
        );
      } else if (filter === "missions") {
        pageRows = pageRows.filter((p) =>
          ["mission", "task", "challenge"].includes(String(p.post_type ?? "")),
        );
      }

      const postIds = pageRows.map((post) => post.id);
      const [{ data: likedRows }, { data: reactionRows }, { data: savedRows }] =
        postIds.length > 0
          ? await Promise.all([
              supabase
                .from("community_post_likes")
                .select("post_id")
                .eq("user_id", user.id)
                .in("post_id", postIds),
              db
                .from("community_post_reactions")
                .select("post_id, reaction")
                .eq("user_id", user.id)
                .in("post_id", postIds),
              supabase
                .from("community_saved_posts")
                .select("post_id")
                .eq("user_id", user.id)
                .in("post_id", postIds),
            ])
          : [
              { data: [] as { post_id: string }[] },
              { data: [] as { post_id: string; reaction: string }[] },
              { data: [] as { post_id: string }[] },
            ];

      const likedSet = new Set((likedRows ?? []).map((row) => row.post_id));
      const reactionByPost = new Map(
        ((reactionRows ?? []) as { post_id: string; reaction: string }[]).map((r) => [
          r.post_id,
          r.reaction,
        ]),
      );
      const savedSet = new Set((savedRows ?? []).map((row) => row.post_id));

      const posts = pageRows.map((post) => {
        const userReaction = reactionByPost.get(post.id) ?? null;
        return {
          ...post,
          user_has_liked: likedSet.has(post.id) || Boolean(userReaction),
          user_reaction: userReaction,
          user_has_saved: savedSet.has(post.id),
          quoted_post: null,
        };
      });

      return NextResponse.json(
        { posts, next_cursor: global.next_cursor },
        { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load global feed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  let query = supabase
    .from("community_posts")
    .select(
      "*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username), communities(slug, name)"
    )
    .in("community_id", communityId ? [communityId] : communityIds);

  if (draftsOnly) {
    query = query.eq("author_id", user.id).eq("is_published", false);
  } else {
    query = query.eq("is_published", true).is("archived_at", null);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  switch (filter) {
    case "trending":
    case "ai-picks":
      query = query
        .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .or("like_count.gte.1,comment_count.gte.1");
      break;
    case "hot":
      query = query
        .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .or("like_count.gte.1,comment_count.gte.1");
      break;
    case "rising":
      query = query.gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      break;
    case "verified": {
      const { data: featuredCommunities } = await supabase
        .from("communities")
        .select("id")
        .in("id", communityId ? [communityId] : communityIds)
        .or("is_featured.eq.true,member_count.gte.100");
      const featuredIds = (featuredCommunities ?? []).map((community) => community.id);
      if (!featuredIds.length) return NextResponse.json({ posts: [], next_cursor: null });
      query = query.in("community_id", featuredIds);
      break;
    }
    case "following":
      if (!followedAuthorIds.size) return NextResponse.json({ posts: [], next_cursor: null });
      query = query.in("author_id", [...followedAuthorIds]);
      break;
    case "friends":
      if (!friendAuthorIds.size) return NextResponse.json({ posts: [], next_cursor: null });
      query = query.in("author_id", [...friendAuthorIds]);
      break;
    case "spaces":
      query = query.neq("space_id", "00000000-0000-0000-0000-000000000000");
      break;
    case "missions":
      query = query.in("post_type", ["mission", "task", "challenge"]);
      break;
    default:
      break;
  }

  // Global feed: chronological only so pins cannot monopolize the stream.
  // Community-scoped feed: keep pins as a community-level feature.
  if (communityId) {
    query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }
  // Paginate chronologically so cursor pages never skip/duplicate posts.
  // Ranking may reorder *within* a page for display, but must not drive the cursor.
  const { data, error } = await query.limit(limit + 1);

  if (error) {
    console.error("Error fetching feed posts:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = excludeTechnicalPosts(data ?? []);
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const postIds = pageRows.map((post) => post.id);

  const [{ data: likedRows }, { data: reactionRows }, { data: savedRows }] =
    postIds.length > 0
      ? await Promise.all([
          supabase
            .from("community_post_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds),
          db
            .from("community_post_reactions")
            .select("post_id, reaction")
            .eq("user_id", user.id)
            .in("post_id", postIds),
          supabase
            .from("community_saved_posts")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds),
        ])
      : [
          { data: [] as { post_id: string }[] },
          { data: [] as { post_id: string; reaction: string }[] },
          { data: [] as { post_id: string }[] },
        ];

  const likedSet = new Set((likedRows ?? []).map((row) => row.post_id));
  const reactionByPost = new Map(
    ((reactionRows ?? []) as { post_id: string; reaction: string }[]).map((r) => [
      r.post_id,
      r.reaction,
    ])
  );
  const savedSet = new Set((savedRows ?? []).map((row) => row.post_id));

  // Enrich quote posts (best-effort; quote_of_post_id may be missing pre-migration)
  const quoteIds = pageRows
    .map((p) => (p as { quote_of_post_id?: string | null }).quote_of_post_id)
    .filter((id): id is string => Boolean(id));
  let quotedById = new Map<string, { id: string; body: string; profiles?: unknown }>();
  if (quoteIds.length > 0) {
    const { data: quoted } = await supabase
      .from("community_posts")
      .select("id, body, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
      .in("id", quoteIds);
    quotedById = new Map((quoted ?? []).map((q) => [q.id, q]));
  }

  let enriched = pageRows.map((post) => {
    const quoteId = (post as { quote_of_post_id?: string | null }).quote_of_post_id;
    const userReaction = reactionByPost.get(post.id) ?? null;
    return {
      ...post,
      user_has_liked: likedSet.has(post.id) || Boolean(userReaction),
      user_reaction: userReaction,
      user_has_saved: savedSet.has(post.id),
      quoted_post: quoteId ? quotedById.get(quoteId) ?? null : null,
    };
  });

  const shouldRank = ["for-you", "trending", "ai-picks", "hot", "rising", "recommended"].includes(filter);
  if (shouldRank && !draftsOnly) {
    // Soft-rank within the chronological page only — preserves pagination completeness.
    enriched = rankFeedItems(enriched as unknown as Parameters<typeof rankFeedItems>[0], {
      viewerId: user.id,
      followedAuthorIds,
    }) as typeof enriched;
    if (filter === "rising") {
      enriched.sort((a, b) => {
        const age = (post: { created_at?: string | null }) =>
          Math.max(1, (Date.now() - new Date(post.created_at ?? Date.now()).getTime()) / 3_600_000);
        const engagement = (post: { like_count?: number | null; comment_count?: number | null; view_count?: number | null }) =>
          Number(post.like_count ?? 0) + Number(post.comment_count ?? 0) * 2 + Number(post.view_count ?? 0) * 0.1;
        return engagement(b) / age(b) - engagement(a) / age(a);
      });
    }
  }

  // Cursor must follow chronological page order (last row from DB page), not ranked order.
  const posts = enriched;
  const next_cursor =
    hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1]!.created_at : null;

  const response = NextResponse.json({ posts, next_cursor });
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return response;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    community_id?: string;
    room_id?: string;
    space_id?: string;
    title?: string | null;
    body?: string;
    post_type?: string;
    images?: Json;
    attachments?: Json;
    video_url?: string | null;
    is_pinned?: boolean;
    is_exclusive?: boolean;
    is_published?: boolean;
    quote_of_post_id?: string | null;
    poll_options?: string[];
    poll_multiple?: boolean;
    poll_anonymous?: boolean;
    poll_expires_at?: string | null;
    audience?: string;
    location?: string | null;
    scheduled_at?: string | null;
    alt_texts?: Record<string, string>;
  };

  const communityId = body.community_id;
  if (!communityId) {
    return NextResponse.json({ error: "community_id is required" }, { status: 400 });
  }

  if (isTechnicalFeedBody(body.body)) {
    return NextResponse.json({ error: "Invalid post content" }, { status: 400 });
  }

  const memberGate = await requireCommunityMember(supabase, user.id, communityId);
  if (!memberGate.ok) {
    return NextResponse.json({ error: memberGate.error }, { status: memberGate.status });
  }

  let roomId = body.room_id?.trim() || "";
  let spaceId = body.space_id?.trim() || "";

  if (!roomId || !spaceId) {
    const { data: room } = await supabase
      .from("rooms")
      .select("id, space_id, community_id, is_active")
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    roomId = roomId || room?.id || "";
    spaceId = spaceId || room?.space_id || "";
  }

  if (!roomId || !spaceId) {
    return NextResponse.json({ error: "Community has no room for posts" }, { status: 400 });
  }

  const { data: boundRoom } = await supabase
    .from("rooms")
    .select("id, community_id, space_id, is_active")
    .eq("id", roomId)
    .maybeSingle();

  if (!roomBelongsToCommunity(boundRoom, communityId) || !roomSpaceMatches(boundRoom, spaceId)) {
    return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  }
  spaceId = boundRoom.space_id || spaceId;

  const publishGate = await assertCanPublishInRoom(supabase, user.id, roomId);
  if (!publishGate.ok) {
    return NextResponse.json(
      { error: publishGate.error },
      { status: publishGate.status }
    );
  }

  const postType = body.post_type ?? "discussion";
  const pollOptions = (body.poll_options ?? [])
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (postType === "poll" && pollOptions.length < 2) {
    return NextResponse.json({ error: "Poll needs at least 2 options" }, { status: 400 });
  }

  const safeImages = sanitizePostImageUrls(body.images);
  const content = body.body?.trim() ?? "";
  const hasMedia =
    safeImages.length > 0 ||
    Boolean(typeof body.video_url === "string" && body.video_url.trim());
  if (!content && postType !== "poll" && !hasMedia) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const attachments: Record<string, unknown> = {
    ...((body.attachments as Record<string, unknown> | null) ?? {}),
  };
  const mentions = extractMentions(content);
  const hashtags = extractHashtags(content);
  if (mentions.length) attachments.mentions = mentions;
  if (hashtags.length) attachments.hashtags = hashtags;
  if (typeof body.location === "string" && body.location.trim()) {
    attachments.location = body.location.trim().slice(0, 120);
  }
  if (body.alt_texts && typeof body.alt_texts === "object") {
    attachments.alt_texts = body.alt_texts;
  }
  // GIF-ready / scheduling / long-form flags for future clients
  if (attachments.gif == null) attachments.gif_ready = true;
  if (content.length > 800) attachments.long_form = true;

  if (postType === "poll") {
    attachments.poll = {
      options: pollOptions.map((text) => ({ text, votes: 0 })),
      multiple: Boolean(body.poll_multiple),
      anonymous: Boolean(body.poll_anonymous),
      expires_at:
        typeof body.poll_expires_at === "string" && body.poll_expires_at
          ? body.poll_expires_at
          : null,
    };
  }

  const { data: destCommunity } = await supabase
    .from("communities")
    .select("owner_id, slug, is_private, is_active, visibility, visibility_mode, archived_at")
    .eq("id", communityId)
    .maybeSingle();

  const audience = AUDIENCES.has(body.audience ?? "")
    ? (body.audience as string)
    : destCommunity && communityIsPubliclyDiscoverable(destCommunity)
      ? "public"
      : "community";
  const scheduledAt =
    typeof body.scheduled_at === "string" && body.scheduled_at
      ? body.scheduled_at
      : null;
  const isPublished = body.is_published !== false && !scheduledAt;

  let canPin = false;
  if (body.is_pinned) {
    const { data: staffMembership } = await supabase
      .from("community_memberships")
      .select("role, status")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle();
    canPin =
      destCommunity?.owner_id === user.id ||
      (staffMembership?.status === "active" &&
        (staffMembership.role === "owner" ||
          staffMembership.role === "admin" ||
          staffMembership.role === "moderator"));
  }

  const insertPayload = {
    community_id: communityId,
    room_id: roomId,
    space_id: spaceId,
    author_id: user.id,
    title: body.title ?? null,
    body: content || (postType === "poll" ? "Poll" : ""),
    post_type: postType,
    images: safeImages as never,
    attachments: attachments as never,
    video_url: body.video_url ?? null,
    is_pinned: canPin ? Boolean(body.is_pinned) : false,
    is_exclusive: Boolean(body.is_exclusive) || audience === "private",
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
    audience,
    scheduled_at: scheduledAt,
    ...(body.quote_of_post_id ? { quote_of_post_id: body.quote_of_post_id } : {}),
  };

  // quote_of_post_id may not be in generated types until types refresh
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("community_posts")
    .insert(insertPayload)
    .select("*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
    .single();

  if (error) {
    console.error("POST /api/posts/feed insert failed", error.message);
    return NextResponse.json(
      { error: "Could not publish post. Please try again." },
      { status: 400 }
    );
  }

  if (isPublished) {
    revalidatePath("/communities");
    revalidatePath("/communities/explore");
    if (destCommunity?.slug) {
      revalidatePath(`/communities/${destCommunity.slug}`);
      revalidatePath(`/communities/${destCommunity.slug}/feed`);
    }
  }

  return NextResponse.json({
    post: data,
    community: destCommunity?.slug
      ? { id: communityId, slug: destCommunity.slug }
      : { id: communityId, slug: null },
  });
}
