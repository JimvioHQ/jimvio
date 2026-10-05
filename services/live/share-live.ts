import type { SupabaseClient } from "@supabase/supabase-js";
import { assertCanPublishInRoom } from "@/lib/community/workspace/assert-can-publish";
import { isCommunityUuid } from "@/lib/community/resolve-community";
import { canonicalLiveUrl } from "@/lib/live/live-url";
import { liveStudioLog } from "@/lib/live/observability";
import {
  LIVE_SHARE_CLIENT_MESSAGE,
  type LiveShareCode,
} from "@/lib/live/share-messages";
import { canAccessRoom } from "@/services/accessControl";
import type { LiveSessionRow } from "@/services/live/session-service";

export { LIVE_SHARE_CLIENT_MESSAGE, type LiveShareCode };

function liveShareBody(title: string, url: string): string {
  const heading = title.trim() || "Jimvio Live";
  return `🔴 Live: ${heading}\n${url}`;
}

type ShareResult =
  | { ok: true; url: string }
  | { error: string; status: number; code: LiveShareCode };

function assertShareableSession(session: LiveSessionRow): ShareResult | null {
  if (session.status === "ended" || session.status === "cancelled") {
    return { error: LIVE_SHARE_CLIENT_MESSAGE.ended, status: 410, code: "ended" };
  }
  return null;
}

export async function shareLiveToInbox(input: {
  supabase: SupabaseClient;
  session: LiveSessionRow;
  senderId: string;
  conversationId: string;
}): Promise<ShareResult> {
  const conversationId = input.conversationId.trim();
  if (!isCommunityUuid(conversationId)) {
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.invalid_target,
      status: 400,
      code: "invalid_target",
    };
  }

  const ended = assertShareableSession(input.session);
  if (ended) return ended;

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

/** Share Live invitation into an accessible Space/group chat room. */
export async function shareLiveToRoom(input: {
  supabase: SupabaseClient;
  session: LiveSessionRow;
  senderId: string;
  roomId: string;
}): Promise<ShareResult> {
  const roomId = input.roomId.trim();
  if (!isCommunityUuid(roomId)) {
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.invalid_target,
      status: 400,
      code: "invalid_target",
    };
  }

  const ended = assertShareableSession(input.session);
  if (ended) return ended;

  const hasAccess = await canAccessRoom(input.senderId, roomId);
  if (!hasAccess) {
    liveStudioLog("warn", "security_denied", {
      action: "live_share_room",
      sessionId: input.session.id,
      userId: input.senderId,
      reason: "no_room_access",
    });
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.conversation_unavailable,
      status: 403,
      code: "conversation_unavailable",
    };
  }

  const publishGate = await assertCanPublishInRoom(
    input.supabase,
    input.senderId,
    roomId
  );
  if (!publishGate.ok) {
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.conversation_unavailable,
      status: publishGate.status,
      code: "conversation_unavailable",
    };
  }

  const { data: room } = await input.supabase
    .from("rooms")
    .select("id, community_id")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) {
    return {
      error: LIVE_SHARE_CLIENT_MESSAGE.conversation_unavailable,
      status: 404,
      code: "conversation_unavailable",
    };
  }

  if (
    input.session.community_id &&
    room.community_id &&
    room.community_id !== input.session.community_id
  ) {
    liveStudioLog("warn", "security_denied", {
      action: "live_share_room",
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

  const { error: insertError } = await input.supabase.from("community_messages").insert({
    room_id: roomId,
    community_id: room.community_id,
    sender_id: input.senderId,
    body,
    message_type: "text",
  });

  if (insertError) {
    liveStudioLog("error", "unhandled", {
      action: "live_share_room_insert",
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

  return { ok: true, url };
}
