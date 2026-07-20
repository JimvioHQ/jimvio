import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/** GET — full-room message search (root messages + thread replies). Query: ?q=&limit= */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessRoom(user.id, roomId);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));

  if (!q) return NextResponse.json({ messages: [] });
  if (q.length > 200) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("community_messages")
    .select("*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)")
    .eq("room_id", roomId)
    .eq("is_deleted", false)
    .ilike("body", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ messages: data ?? [] });
}
