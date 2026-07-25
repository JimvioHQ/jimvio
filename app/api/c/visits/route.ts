import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Upsert member visit for resume CTAs on hub home / community overview.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    communityId?: string;
    path?: string | null;
    channelId?: string | null;
  } | null;

  const communityId = body?.communityId?.trim();
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const lastPath =
    typeof body?.path === "string" && body.path.startsWith("/communities/")
      ? body.path.slice(0, 500)
      : null;
  const lastChannelId =
    typeof body?.channelId === "string" && body.channelId.length > 0
      ? body.channelId
      : null;

  const { error } = await supabase.from("community_member_visits").upsert(
    {
      community_id: communityId,
      user_id: user.id,
      last_visited_at: new Date().toISOString(),
      last_path: lastPath,
      last_channel_id: lastChannelId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "community_id,user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
