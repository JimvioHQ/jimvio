import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/** GET — story replies */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: story } = await (supabase as any)
    .from("community_stories")
    .select("id, author_id, expires_at")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expired = new Date(story.expires_at).getTime() <= Date.now();
  if (expired && story.author_id !== user.id) {
    return NextResponse.json({ error: "Story expired" }, { status: 410 });
  }

  const { data, error } = await (supabase as any)
    .from("community_story_replies")
    .select(
      "id, story_id, author_id, body, created_at, profiles!community_story_replies_author_id_fkey(full_name, avatar_url, username)"
    )
    .eq("story_id", storyId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ replies: data ?? [] });
}

/** POST — reply { body } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`story-reply:${user.id}`, 40, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many replies — try again shortly" },
      { status: 429 }
    );
  }

  const { data: story } = await (supabase as any)
    .from("community_stories")
    .select("id, author_id, expires_at, reply_count")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (new Date(story.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Story expired" }, { status: 410 });
  }

  const payload = (await req.json().catch(() => ({}))) as { body?: string };
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });
  if (body.length > 1000) {
    return NextResponse.json({ error: "Reply too long" }, { status: 400 });
  }

  const { data, error } = await (supabase as any)
    .from("community_story_replies")
    .insert({
      story_id: storyId,
      author_id: user.id,
      body,
    })
    .select(
      "id, story_id, author_id, body, created_at, profiles!community_story_replies_author_id_fkey(full_name, avatar_url, username)"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const nextCount = (story.reply_count ?? 0) + 1;
  await (supabase as any)
    .from("community_stories")
    .update({ reply_count: nextCount, updated_at: new Date().toISOString() })
    .eq("id", storyId);

  // Best-effort analytics sync (row may not exist until first view)
  await (supabase as any)
    .from("community_story_analytics")
    .update({ replies: nextCount, updated_at: new Date().toISOString() })
    .eq("story_id", storyId);

  return NextResponse.json({ reply: data });
}
