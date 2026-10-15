
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/supabase";
import { assertCanPublishInRoom } from "@/lib/community/workspace/assert-can-publish";
import { sanitizePostImageUrls } from "@/lib/community/posts/sanitize-post-media";
import { requireCommunityMember } from "@/lib/community/rbac";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ communityId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { communityId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberGate = await requireCommunityMember(supabase, user.id, communityId);
  if (!memberGate.ok) {
    return NextResponse.json({ error: memberGate.error }, { status: memberGate.status });
  }

  const { data, error } = await supabase
    .from("community_posts")
    .select("*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
    .eq("community_id", communityId)
    .eq("is_published", true)
    .is("archived_at", null)
    .is("hidden_at", null)
    .is("deleted_at", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: error.message }, { status: 400 })
  };
  return NextResponse.json({ posts: data });
}


export async function POST(req: NextRequest, { params }: Params) {
  const { communityId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberGate = await requireCommunityMember(supabase, user.id, communityId);
  if (!memberGate.ok) {
    return NextResponse.json({ error: memberGate.error }, { status: memberGate.status });
  }

  const body = (await req.json()) as {
    title?: string | null;
    body?: string;
    post_type?: string;
    images?: Json;
    attachments?: Json;
    video_url?: string | null;
    is_pinned?: boolean;
    is_exclusive?: boolean;
  };

  const content = body.body?.trim();
  if (!content) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const canPin =
    memberGate.ctx.role === "owner" ||
    memberGate.ctx.role === "admin" ||
    memberGate.ctx.role === "moderator";

  // Resolve a default room/space — empty UUID strings are invalid.
  const { data: room } = await supabase
    .from("rooms")
    .select("id, space_id")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!room?.id || !room.space_id) {
    return NextResponse.json({ error: "Community has no room for posts" }, { status: 400 });
  }

  const publishGate = await assertCanPublishInRoom(supabase, user.id, room.id);
  if (!publishGate.ok) {
    return NextResponse.json(
      { error: publishGate.error },
      { status: publishGate.status }
    );
  }

  const safeImages = sanitizePostImageUrls(body.images);

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      community_id: communityId,
      room_id: room.id,
      space_id: room.space_id,
      author_id: user.id,
      title: body.title ?? null,
      body: content,
      post_type: body.post_type ?? "discussion",
      images: safeImages as never,
      attachments: body.attachments,
      video_url: body.video_url ?? null,
      is_pinned: canPin ? Boolean(body.is_pinned) : false,
      is_exclusive: Boolean(body.is_exclusive) && canPin,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data });
}