import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string; messageId: string }> }
) {
  const { roomId, messageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessRoom(user.id, roomId);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { emoji } = (await req.json()) as { emoji?: string };
  if (typeof emoji !== "string" || !emoji.trim()) {
    return NextResponse.json({ error: "emoji required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("toggle_community_message_reaction", {
    p_message_id: messageId,
    p_emoji: emoji.trim(),
  });

  if (error) {
    const msg = error.message || "Failed";
    const status = msg.includes("not found") ? 404 : msg.includes("forbidden") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ reactions: data });
}
