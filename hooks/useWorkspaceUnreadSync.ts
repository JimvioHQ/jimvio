"use client";

/**
 * Community-scoped unread badge sync — mounts at workspace shell so badges
 * update even when Discussion / ChatRoom is not open.
 */

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChangesMany,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import {
  bumpWorkspaceUnread,
  getActiveChatTarget,
} from "@/lib/community/chat/active-chat-target";

export function useWorkspaceUnreadSync(opts: {
  communityId: string | null | undefined;
  userId: string | null | undefined;
}): void {
  const { communityId, userId } = opts;
  const supabase = useMemo(() => createClient(), []);
  const communityIdRef = useRef(communityId);
  useEffect(() => {
    communityIdRef.current = communityId;
  }, [communityId]);

  useEffect(() => {
    if (!communityId || !userId) return;

    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChangesMany>> = null;
    const channelName = `shell_unread_${communityId}`;
    const inboxCommunityCache = new Map<string, string>();

    async function inboxBelongsToCommunity(conversationId: string): Promise<boolean> {
      const cid = communityIdRef.current;
      if (!cid) return false;
      const cached = inboxCommunityCache.get(conversationId);
      if (cached) return cached === cid;
      const { data } = await supabase
        .from("community_inbox_conversations")
        .select("community_id")
        .eq("id", conversationId)
        .maybeSingle();
      const community = (data?.community_id as string | undefined) ?? "";
      if (community) inboxCommunityCache.set(conversationId, community);
      return community === cid;
    }

    void (async () => {
      channel = await subscribePostgresChangesMany(
        supabase,
        channelName,
        [
          {
            config: {
              event: "INSERT",
              schema: "public",
              table: "community_inbox_messages",
            },
            onChange: (payload) => {
              const r = payload?.new;
              if (!r || r.sender_id === userId) return;
              const conversationId = String(r.conversation_id ?? "");
              if (!conversationId) return;
              const { convId } = getActiveChatTarget();
              if (convId && conversationId === convId) return;
              void inboxBelongsToCommunity(conversationId).then((ok) => {
                if (ok && !cancelled) bumpWorkspaceUnread(conversationId);
              });
            },
          },
          {
            config: {
              event: "INSERT",
              schema: "public",
              table: "community_messages",
              filter: `community_id=eq.${communityId}`,
            },
            onChange: (payload) => {
              const r = payload?.new;
              if (!r || r.sender_id === userId) return;
              if (r.thread_id) return;
              const { roomId } = getActiveChatTarget();
              if (roomId && r.room_id === roomId) return;
              bumpWorkspaceUnread(String(r.room_id));
            },
          },
        ],
        () => cancelled
      );
    })();

    return () => {
      cancelled = true;
      unsubscribeRealtime(supabase, channel, channelName);
    };
  }, [communityId, userId, supabase]);
}
