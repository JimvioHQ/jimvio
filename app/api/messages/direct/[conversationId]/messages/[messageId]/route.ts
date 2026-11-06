import type { NextRequest } from "next/server";
import { PATCH as patchInboxMessage } from "@/app/api/communities/[slug]/inbox/[conversationId]/messages/[messageId]/route";

// Edit / delete own message — same handler as community DMs (scoped by conversation, sender and RLS).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ conversationId: string; messageId: string }> }) {
  const p = await params;
  return patchInboxMessage(req, { params: Promise.resolve({ slug: "", ...p }) });
}
