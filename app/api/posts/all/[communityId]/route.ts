
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ communityId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { communityId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .single();

  if (membershipError) {
    console.error("Error checking membership:", membershipError);
    return NextResponse.json({ error: membershipError.message }, { status: 400 })
  };

  if (!membership) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data, error } = await supabase
    .from("community_posts")
    .select("*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
    .eq("community_id", communityId)
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  console.log({ data });

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

  // Verify membership
  const { data: membership } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "No access" }, { status: 403 });

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

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      community_id: communityId,
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