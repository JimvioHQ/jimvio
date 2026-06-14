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

  let query = supabase
    .from("community_posts")
    .select("*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
    .in("community_id", communityIds)
    .eq("is_published", true);

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
  const enriched = posts.map((post) => ({
    ...post,
    user_has_liked: likedSet.has(post.id),
  }));

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
    community_id: string;
    title?: string | null;
    body?: string;
    post_type?: string;
    images?: Json;
    attachments?: Json;
    video_url?: string | null;
    is_pinned?: boolean;
    is_exclusive?: boolean;
  };

  const { community_id } = body;
  if (!community_id)
    return NextResponse.json({ error: "community_id is required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_id", community_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "No access" }, { status: 403 });

  const content = body.body?.trim();
  if (!content) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      community_id,
      room_id: "",
      space_id: "",
      author_id: user.id,
      title: body.title ?? null,
      body: content,
      post_type: body.post_type ?? "discussion",
      images: body.images,
      attachments: body.attachments,
      video_url: body.video_url ?? null,
      is_pinned: body.is_pinned ?? false,
      is_exclusive: body.is_exclusive ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data });
}
