import type { SupabaseClient } from "@supabase/supabase-js";
import { isCommunityUuid } from "@/lib/community/resolve-community";
import { canonicalLiveUrl } from "@/lib/live/live-url";
import { liveStudioLog } from "@/lib/live/observability";
import {
  LIVE_SHARE_CLIENT_MESSAGE,
  type LiveShareCode,
} from "@/lib/live/share-messages";
import type { LiveSessionRow } from "@/services/live/session-service";

export { LIVE_SHARE_CLIENT_MESSAGE, type LiveShareCode };

function liveShareBody(title: string, url: string): string {
  const heading = title.trim() || "Jimvio Live";
  return `🔴 Live: ${heading}\n${url}`;
}

export async function shareLiveToInbox(input: {
  supabase: SupabaseClient;
  session: LiveSessionRow;
  senderId: string;
  conversationId: string;
}): Promise<{ ok: true; url: string } | { error: string; status: number; code: LiveShareCode }> {
  const conversationId = input.conversationId.trim();
  if (!isCommunityUuid(conversationId)) {
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.invalid_target,
      status: 400,
      code: "invalid_target",
    };
  }

  if (input.session.status === "ended" || input.session.status === "cancelled") {
    return { error: LIVE_SHARE_CLIENT_MESSAGE.ended, status: 410, code: "ended" };
  }

  const { data: conv, error: convError } = await input.supabase
    .from("community_inbox_conversations")
    .select("id, community_id, user_low, user_high")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError || !conv) {
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.conversation_unavailable,
      status: 404,
      code: "conversation_unavailable",
    };
  }

  if (conv.user_low !== input.senderId && conv.user_high !== input.senderId) {
    liveStudioLog("warn", "security_denied", {
      action: "live_share",
      sessionId: input.session.id,
      userId: input.senderId,
      reason: "not_conversation_participant",
    });
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.conversation_unavailable,
      status: 403,
      code: "conversation_unavailable",
    };
  }

  if (input.session.community_id && conv.community_id !== input.session.community_id) {
    liveStudioLog("warn", "security_denied", {
      action: "live_share",
      sessionId: input.session.id,
      userId: input.senderId,
      reason: "cross_community_share",
    });
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.conversation_unavailable,
      status: 403,
      code: "conversation_unavailable",
    };
  }

  const url = canonicalLiveUrl(input.session.id);
  const body = liveShareBody(input.session.title, url);

  const { error: insertError } = await input.supabase
    .from("community_inbox_messages")
    .insert({
      conversation_id: conv.id,
      sender_id: input.senderId,
      body,
      message_type: "text",
      reactions: {},
    });

  if (insertError) {
    liveStudioLog("error", "unhandled", {
      action: "live_share_insert",
      sessionId: input.session.id,
      userId: input.senderId,
      code: insertError.code ?? null,
    });
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.send_failed,
      status: 400,
      code: "send_failed",
    };
  }

  await input.supabase
    .from("community_inbox_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conv.id);

  return { ok: true, url };
}
