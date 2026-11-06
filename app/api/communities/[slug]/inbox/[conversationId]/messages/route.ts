import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveCommunityBySlugOrId } from "@/lib/community/resolve-community";
import { isParticipant, listInboxMessages, sendInboxMessage, type InboxConversation } from "@/lib/messaging/inbox-messages";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; conversationId: string }> };

/** Community DM: the conversation must belong to this community and the viewer must be in it. */
async function load(slug: string, conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;

  const community = await resolveCommunityBySlugOrId(supabase, slug);
  if (!community) return { error: NextResponse.json({ error: "Community not found" }, { status: 404 }) } as const;

  const { data: conv } = await supabase
    .from("community_inbox_conversations")
    .select("id, community_id, user_low, user_high")
    .eq("id", conversationId)
    .eq("community_id", community.id)
    .maybeSingle();
  const c = conv as InboxConversation | null;
  if (!c) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  if (!isParticipant(c, user.id)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  return { supabase, user, conv: c } as const;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug, conversationId } = await params;
  const r = await load(slug, conversationId);
  if ("error" in r) return r.error;
  return listInboxMessages(r.supabase, r.user.id, r.conv, new URL(req.url));
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug, conversationId } = await params;
  const r = await load(slug, conversationId);
  if ("error" in r) return r.error;
  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  return sendInboxMessage(r.supabase, r.user.id, r.conv, payload as Record<string, unknown>);
}
