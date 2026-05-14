import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all community IDs the user is a member of
  const { data: memberships, error: membershipError } = await supabase
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", user.id);

  if (membershipError) {
    console.error("Error fetching memberships:", membershipError);
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  const communityIds = memberships.map((m) => m.community_id);

  const { data, error } = await supabase
    .from("community_posts")
    .select("*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
    .in("community_id", communityIds)
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching feed posts:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ posts: data });
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

  // Verify membership for the target community
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