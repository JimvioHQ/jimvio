import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getHubDirectMessages,
  getHubMessagePeer,
  getHubRoomMessages,
  sendHubDirectMessage,
} from "@/services/community/hub-messages-data";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "direct";
  const peerId = req.nextUrl.searchParams.get("peerId");

  if (kind === "room" && id.startsWith("room:")) {
    const roomId = id.replace("room:", "");
    const data = await getHubRoomMessages(user.id, roomId);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ kind: "room", ...data });
  }

  if (id.startsWith("room:")) {
    const roomId = id.replace("room:", "");
    const data = await getHubRoomMessages(user.id, roomId);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ kind: "room", ...data });
  }

  const data = await getHubDirectMessages(user.id, id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let peer = null;
  if (peerId) {
    peer = await getHubMessagePeer(user.id, peerId);
  }

  return NextResponse.json({ kind: "direct", ...data, peer });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body } = (await req.json()) as { body?: string };
  if (id.startsWith("room:")) {
    return NextResponse.json({ error: "Use community room chat to send group messages" }, { status: 400 });
  }

  const result = await sendHubDirectMessage(user.id, id, body ?? "");
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ message: result.message });
}
