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

  const conversations = (data ?? []).map((conv) => {
    const isLow = conv.user_low === user.id;
    const peer = (isLow ? conv.user_high_profile : conv.user_low_profile) as
      | { full_name: string | null; avatar_url: string | null; username: string | null }
      | null
      | undefined;
    return {
      id: conv.id,
      peerId: isLow ? conv.user_high : conv.user_low,
      peerName: peer?.full_name || peer?.username || "Member",
      peerAvatar: peer?.avatar_url || null,
      lastMessage: (conv as { last_message_preview?: string | null }).last_message_preview || "",
      updatedAt: conv.updated_at,
    };
  });

  return NextResponse.json({ conversations });
}

/** Create or return existing DM conversation with a peer in this community. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { peerUserId?: string };
  const peerUserId = typeof body.peerUserId === "string" ? body.peerUserId : "";
  if (!peerUserId) return NextResponse.json({ error: "peerUserId is required" }, { status: 400 });
  if (peerUserId === user.id) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const { data: myMembership } = await supabase
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!myMembership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: peerMembership } = await supabase
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", community.id)
    .eq("user_id", peerUserId)
    .eq("status", "active")
    .maybeSingle();

  if (!peerMembership) {
    return NextResponse.json({ error: "Peer is not a member" }, { status: 404 });
  }

  const user_low = user.id < peerUserId ? user.id : peerUserId;
  const user_high = user.id < peerUserId ? peerUserId : user.id;

  const { data: existing } = await supabase
    .from("community_inbox_conversations")
    .select("id")
    .eq("community_id", community.id)
    .eq("user_low", user_low)
    .eq("user_high", user_high)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ conversationId: existing.id });
  }

  const { data: created, error } = await supabase
    .from("community_inbox_conversations")
    .insert({ community_id: community.id, user_low, user_high })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ conversationId: created.id });
}
