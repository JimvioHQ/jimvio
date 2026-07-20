import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/** Untyped access for tables added in migration 084 before generated types catch up. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untyped(supabase: Awaited<ReturnType<typeof createClient>>): any {
  return supabase;
}

/** POST — vote on a poll post. Body: { optionIndex: number } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { optionIndex?: number };
  if (typeof body.optionIndex !== "number" || body.optionIndex < 0) {
    return NextResponse.json({ error: "optionIndex required" }, { status: 400 });
  }

  const { data: post } = await supabase
    .from("community_posts")
    .select("id, room_id, post_type, attachments")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.post_type !== "poll") {
    return NextResponse.json({ error: "Not a poll" }, { status: 400 });
  }

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const attachments = (post.attachments ?? {}) as Record<string, unknown>;
  const poll = (attachments.poll ?? null) as {
    options?: Array<{ text: string; votes?: number }>;
  } | null;
  const options = poll?.options ?? [];
  if (body.optionIndex >= options.length) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  const db = untyped(supabase);
  const { error: voteErr } = await db.from("community_post_poll_votes").upsert(
    {
      post_id: postId,
      user_id: user.id,
      option_index: body.optionIndex,
    },
    { onConflict: "post_id,user_id" }
  );

  if (voteErr) {
    if (voteErr.message?.includes("community_post_poll_votes") || voteErr.code === "42P01") {
      const nextOptions = options.map((opt, i) => ({
        text: opt.text,
        votes: (opt.votes ?? 0) + (i === body.optionIndex ? 1 : 0),
      }));
      await supabase
        .from("community_posts")
        .update({
          attachments: { ...attachments, poll: { ...poll, options: nextOptions } },
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
      return NextResponse.json({ ok: true, optionIndex: body.optionIndex, fallback: true });
    }
    return NextResponse.json({ error: voteErr.message }, { status: 400 });
  }

  const { data: votes } = await db
    .from("community_post_poll_votes")
    .select("option_index")
    .eq("post_id", postId);

  const tallies = options.map((opt, i) => ({
    text: opt.text,
    votes: ((votes ?? []) as Array<{ option_index: number }>).filter((v) => v.option_index === i)
      .length,
  }));

  await supabase
    .from("community_posts")
    .update({
      attachments: { ...attachments, poll: { ...poll, options: tallies } },
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  return NextResponse.json({ ok: true, optionIndex: body.optionIndex, options: tallies });
}
