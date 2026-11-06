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
      return NextResponse.json({ error: "Direct messages are being set up. Try again soon." }, { status: 503 });
    }
    if (code === "P0002") return NextResponse.json({ error: "That account isn't available" }, { status: 404 });
    if (code === "22023") return NextResponse.json({ error: "You can't message this account" }, { status: 400 });
    return NextResponse.json({ error: "Couldn't open the conversation. Try again." }, { status: 400 });
  }
  if (typeof data !== "string") return NextResponse.json({ error: "Couldn't open the conversation. Try again." }, { status: 400 });
  return NextResponse.json({ conversationId: data });
}
