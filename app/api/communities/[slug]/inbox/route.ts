import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  // Check active membership
  const { data: membership } = await supabase
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  // Fetch inbox conversations with peer profiles
  const { data } = await supabase
    .from("community_inbox_conversations")
    .select(`
      id, user_low, user_high, updated_at, last_message_preview,
      user_low_profile:profiles!community_inbox_conversations_user_low_fkey(full_name, avatar_url, username),
      user_high_profile:profiles!community_inbox_conversations_user_high_fkey(full_name, avatar_url, username)
    `)
    .eq("community_id", community.id)
    .or(`user_low.eq.${user.id},user_high.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .limit(50);

  const conversations = (data ?? []).map((conv: any) => {
    const isLow = conv.user_low === user.id;
    const peer = isLow ? conv.user_high_profile : conv.user_low_profile;
    return {
      id: conv.id,
      peerId: isLow ? conv.user_high : conv.user_low,
      peerName: peer?.full_name || peer?.username || "Member",
      peerAvatar: peer?.avatar_url || null,
      lastMessage: conv.last_message_preview || "",
      updatedAt: conv.updated_at,
    };
  });

  return NextResponse.json({ conversations });
}
