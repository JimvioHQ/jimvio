import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; conversationId: string; messageId: string }> }
) {
  const { conversationId, messageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json();
  const isDelete = !!payload.delete;

  if (isDelete) {
    const { error } = await supabase
      .from("community_inbox_messages")
      .update({ is_deleted: true })
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .eq("sender_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  // Handle actual edit...
  const body = payload.body?.trim();
  if (!body) return NextResponse.json({ error: "Empty body" }, { status: 400 });

  const { data, error } = await supabase
    .from("community_inbox_messages")
    .update({ body })
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .eq("sender_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: data });
}
