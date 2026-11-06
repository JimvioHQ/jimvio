import type { NextRequest } from "next/server";
import { POST as reactInboxMessage } from "@/app/api/communities/[slug]/inbox/[conversationId]/messages/[messageId]/react/route";

// Reactions — same handler as community DMs (the RPC checks participation).
export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string; messageId: string }> }) {
  const p = await params;
  return reactInboxMessage(req, { params: Promise.resolve({ slug: "", ...p }) });
}
