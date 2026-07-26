import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; conversationId: string; messageId: string }> }
) {
  const { conversationId, messageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: msg, error: mErr } = await supabase
    .from("community_inbox_messages")
    .select("conversation_id")
    .eq("id", messageId)
    .maybeSingle();

  if (mErr || !msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (msg.conversation_id !== conversationId) {
    return NextResponse.json({ error: "Invalid context" }, { status: 400 });
  }

  const { emoji } = await req.json();
  if (!emoji || typeof emoji !== "string") {
    return NextResponse.json({ error: "Emoji required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("toggle_inbox_message_reaction", {
    p_message_id: messageId,
    p_emoji: emoji.trim(),
  });

  if (error) {
    const msgText = error.message || "Failed";
    const status = msgText.includes("not found")
      ? 404
      : msgText.includes("forbidden")
        ? 403
        : 400;
    return NextResponse.json({ error: msgText }, { status });
  }

  return NextResponse.json({ reactions: data });
}
