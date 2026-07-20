import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/** Untyped access for tables added in migration 084 before generated types catch up. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untyped(supabase: Awaited<ReturnType<typeof createClient>>): any {
  return supabase;
}

/** POST — report a chat message. Body: { reason?: string, details?: string } */
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

  const body = (await req.json().catch(() => ({}))) as {
    reason?: string;
    details?: string;
  };

  const { data: message } = await supabase
    .from("community_messages")
    .select("id, room_id, community_id, sender_id")
    .eq("id", messageId)
    .maybeSingle();

  if (!message || message.room_id !== roomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (message.sender_id === user.id) {
    return NextResponse.json({ error: "Cannot report your own message" }, { status: 400 });
  }

  const { error } = await untyped(supabase).from("community_content_reports").insert({
    community_id: message.community_id,
    reporter_id: user.id,
    target_type: "message",
    target_id: messageId,
    reason: (body.reason ?? "other").slice(0, 80),
    details: body.details?.slice(0, 2000) ?? null,
    status: "open",
  });

  if (error) {
    if (error.message?.includes("community_content_reports") || error.code === "42P01") {
      return NextResponse.json(
        { error: "Reports table not applied yet — run migration 084" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
