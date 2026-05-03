import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; conversationId: string; messageId: string }> }
) {
  const { conversationId, messageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Get current reactions
  const { data: msg, error: mErr } = await supabase
    .from("community_inbox_messages")
    .select("reactions, conversation_id")
    .eq("id", messageId)
    .single();

  if (mErr || !msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (msg.conversation_id !== conversationId) return NextResponse.json({ error: "Invalid context" }, { status: 400 });

  const { emoji } = await req.json();
  if (!emoji) return NextResponse.json({ error: "Emoji required" }, { status: 400 });

  const reactions = (msg.reactions as Record<string, string[]>) || {};
  const current = reactions[emoji] || [];
  const updated = current.includes(user.id)
    ? current.filter((id) => id !== user.id)
    : [...current, user.id];

  const newReactions = { ...reactions, [emoji]: updated };

  const { data, error } = await supabase
    .from("community_inbox_messages")
    .update({ reactions: newReactions })
    .eq("id", messageId)
    .select("reactions")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ reactions: data.reactions });
}
