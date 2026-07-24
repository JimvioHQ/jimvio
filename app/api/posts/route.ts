import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";
import { Json } from "@/types/database.types";
import { assertCanPublishInRoom } from "@/lib/community/workspace/assert-can-publish";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "Missing roomId" }, { status: 400 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessRoom(user.id, roomId);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data, error } = await supabase
    .from("community_posts")
    .select("*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
    .eq("room_id", roomId)
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ posts: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    room_id?: string;
    title?: string | null;
    body?: string;
    post_type?: string;
    images?: Json;
    attachments?: Json;
    video_url?: string | null;
    is_pinned?: boolean;
    is_exclusive?: boolean;
  };

  const roomId = body.room_id;
  if (!roomId) return NextResponse.json({ error: "room_id required" }, { status: 400 });

  const hasAccess = await canAccessRoom(user.id, roomId);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const publishGate = await assertCanPublishInRoom(supabase, user.id, roomId);
  if (!publishGate.ok) {
    return NextResponse.json(
      { error: publishGate.error },
      { status: publishGate.status }
    );
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("space_id, community_id")
    .eq("id", roomId)
    .single();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const content = body.body?.trim();
  if (!content) return NextResponse.json({ error: "body is required" }, { status: 400 });

  let canPin = false;
  if (body.is_pinned) {
    const { data: community } = await supabase
      .from("communities")
      .select("owner_id")
      .eq("id", room.community_id)
      .maybeSingle();
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("role, status")
      .eq("community_id", room.community_id)
      .eq("user_id", user.id)
      .maybeSingle();
    canPin =
      community?.owner_id === user.id ||
      (membership?.status === "active" &&
        (membership.role === "owner" ||
          membership.role === "admin" ||
          membership.role === "moderator"));
  }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      room_id: roomId,
      space_id: room.space_id,
      community_id: room.community_id,
      author_id: user.id,
      title: body.title ?? null,
      body: content,
      post_type: body.post_type ?? "discussion",
      images: body.images ?? [],
      attachments: body.attachments ?? [],
      video_url: body.video_url ?? null,
      is_pinned: canPin ? Boolean(body.is_pinned) : false,
      is_exclusive: body.is_exclusive ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data });
}
