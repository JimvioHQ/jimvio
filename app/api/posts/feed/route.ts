import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/supabase";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? PAGE_SIZE), 50);
  const cursor = searchParams.get("cursor");
  const filter = searchParams.get("filter") ?? "for-you";
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

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ posts: [], next_cursor: null });
  }

  const communityIds = memberships.map((m) => m.community_id);
  if (communityId && !communityIds.includes(communityId)) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  let query = supabase
    .from("community_posts")
    .select("*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
    .in("community_id", communityId ? [communityId] : communityIds);

  if (draftsOnly) {
    query = query.eq("author_id", user.id).eq("is_published", false);
  } else {
    query = query.eq("is_published", true);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  switch (filter) {
    case "trending":
    case "ai-picks":
      query = query
        .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order("like_count", { ascending: false })
        .order("comment_count", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "following":
      query = query
        .neq("author_id", user.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "spaces":
      query = query
        .neq("space_id", "00000000-0000-0000-0000-000000000000")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "missions":
      query = query
        .in("post_type", ["mission", "task", "challenge"])
        .order("created_at", { ascending: false });
      break;
    default:
      query = query
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query.limit(limit + 1);

  if (error) {
    console.error("Error fetching feed posts:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const posts = hasMore ? rows.slice(0, limit) : rows;
  const postIds = posts.map((post) => post.id);

  const { data: likedRows } =
    postIds.length > 0
      ? await supabase
          .from("community_post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds)
      : { data: [] as { post_id: string }[] };

  const likedSet = new Set((likedRows ?? []).map((row) => row.post_id));

  // Enrich quote posts (best-effort; quote_of_post_id may be missing pre-migration)
  const quoteIds = posts
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

  const enriched = posts.map((post) => {
    const quoteId = (post as { quote_of_post_id?: string | null }).quote_of_post_id;
    return {
      ...post,
      user_has_liked: likedSet.has(post.id),
      quoted_post: quoteId ? quotedById.get(quoteId) ?? null : null,
    };
  });

  const next_cursor =
    hasMore && posts.length > 0 ? posts[posts.length - 1].created_at : null;

  return NextResponse.json({ posts: enriched, next_cursor });
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
  };

  const communityId = body.community_id;
  if (!communityId) {
    return NextResponse.json({ error: "community_id is required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "No access" }, { status: 403 });

  let roomId = body.room_id?.trim() || "";
  let spaceId = body.space_id?.trim() || "";

  if (!roomId || !spaceId) {
    const { data: room } = await supabase
      .from("rooms")
      .select("id, space_id")
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

  const postType = body.post_type ?? "discussion";
  const pollOptions = (body.poll_options ?? [])
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (postType === "poll" && pollOptions.length < 2) {
    return NextResponse.json({ error: "Poll needs at least 2 options" }, { status: 400 });
  }

  const content = body.body?.trim() ?? "";
  if (!content && postType !== "poll") {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const attachments: Record<string, unknown> = {
    ...((body.attachments as Record<string, unknown> | null) ?? {}),
  };
  if (postType === "poll") {
    attachments.poll = {
      options: pollOptions.map((text) => ({ text, votes: 0 })),
    };
  }

  const isPublished = body.is_published !== false;

  let canPin = false;
  if (body.is_pinned) {
    const { data: community } = await supabase
      .from("communities")
      .select("owner_id")
      .eq("id", communityId)
      .maybeSingle();
    const { data: staffMembership } = await supabase
      .from("community_memberships")
      .select("role, status")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle();
    canPin =
      community?.owner_id === user.id ||
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
    images: (body.images ?? []) as never,
    attachments: attachments as never,
    video_url: body.video_url ?? null,
    is_pinned: canPin ? Boolean(body.is_pinned) : false,
    is_exclusive: body.is_exclusive ?? false,
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
    ...(body.quote_of_post_id ? { quote_of_post_id: body.quote_of_post_id } : {}),
  };

  // quote_of_post_id may not be in generated types until types refresh
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("community_posts")
    .insert(insertPayload)
    .select("*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data });
}
