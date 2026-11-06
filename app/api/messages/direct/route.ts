import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/messages/direct { peerId } → { conversationId }
 * Finds or creates the platform-wide DM with another user. The database function
 * validates the recipient and is safe under concurrent calls (unique pair index).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to send messages" }, { status: 401 });

  const limited = rateLimit(`dm-open:${user.id}`, 30, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many new conversations — try again shortly" }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { peerId?: unknown } | null;
  const peerId = typeof body?.peerId === "string" ? body.peerId.trim() : "";
  if (!UUID.test(peerId)) return NextResponse.json({ error: "Choose someone to message" }, { status: 400 });
  if (peerId === user.id) return NextResponse.json({ error: "You can't message yourself" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_or_create_direct_conversation", { p_peer: peerId });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "PGRST202" || code === "42883") {
      // Platform-wide DMs are not enabled in the database yet: use a community you both belong to.
      const shared = await sharedCommunityConversation(supabase, user.id, peerId);
      if (shared) return NextResponse.json(shared);
      return NextResponse.json(
        { error: "For now you can message people you share a community with. Messaging anyone is being enabled." },
        { status: 409 },
      );
    }
    if (code === "P0002") return NextResponse.json({ error: "That account isn't available" }, { status: 404 });
    if (code === "22023") return NextResponse.json({ error: "You can't message this account" }, { status: 400 });
    return NextResponse.json({ error: "Couldn't open the conversation. Try again." }, { status: 400 });
  }
  if (typeof data !== "string") return NextResponse.json({ error: "Couldn't open the conversation. Try again." }, { status: 400 });
  return NextResponse.json({ conversationId: data });
}

type Supa = Awaited<ReturnType<typeof createClient>>;

/** Existing or new community DM in a community where both people are active members (RLS applies). */
async function sharedCommunityConversation(supabase: Supa, me: string, peer: string): Promise<{ conversationId: string; communitySlug: string } | null> {
  const [{ data: mine }, { data: theirs }] = await Promise.all([
    supabase.from("community_memberships").select("community_id").eq("user_id", me).eq("status", "active"),
    supabase.from("community_memberships").select("community_id").eq("user_id", peer).eq("status", "active"),
  ]);
  const theirSet = new Set((theirs ?? []).map((row) => row.community_id));
  const sharedIds = (mine ?? []).map((row) => row.community_id).filter((id) => theirSet.has(id));
  if (!sharedIds.length) return null;
  const user_low = me < peer ? me : peer;
  const user_high = me < peer ? peer : me;
  const { data: existing } = await supabase
    .from("community_inbox_conversations")
    .select("id, community_id, communities(slug)")
    .in("community_id", sharedIds)
    .eq("user_low", user_low)
    .eq("user_high", user_high)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const slugOf = (row: unknown) => ((row as { communities?: { slug?: string } | null } | null)?.communities?.slug ?? "");
  if (existing) return { conversationId: existing.id, communitySlug: slugOf(existing) };
  const { data: created } = await supabase
    .from("community_inbox_conversations")
    .insert({ community_id: sharedIds[0], user_low, user_high })
    .select("id, communities(slug)")
    .single();
  return created ? { conversationId: created.id, communitySlug: slugOf(created) } : null;
}
