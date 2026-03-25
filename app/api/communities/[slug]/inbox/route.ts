import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Get or create a 1:1 inbox thread with another active member. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { peerUserId?: string };
  if (!body.peerUserId || typeof body.peerUserId !== "string") {
    return NextResponse.json({ error: "peerUserId required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_or_create_community_inbox_conversation", {
    p_community_id: communityId,
    p_peer_id: body.peerUserId,
  });

  if (error) {
    const msg = error.message || "Failed";
    const status = msg.includes("not authenticated") ? 401 : msg.includes("forbidden") || msg.includes("peer") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ conversationId: data as string });
}
