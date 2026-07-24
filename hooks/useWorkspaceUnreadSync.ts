"use client";

/**
 * Community-scoped unread badge sync — mounts at workspace shell so badges
 * update even when Discussion / ChatRoom is not open.
 */

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  bumpWorkspaceUnread,
  getActiveChatTarget,
} from "@/lib/community/chat/active-chat-target";

type RealtimePayload = { new: Record<string, unknown> };

export function useWorkspaceUnreadSync(opts: {
  communityId: string | null | undefined;
  userId: string | null | undefined;
}): void {
  const { communityId, userId } = opts;
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!communityId || !userId) return;

    const gi = supabase
      .channel(`shell_inbox_unread_${communityId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_inbox_messages" },
        (p: RealtimePayload) => {
          const r = p.new;
          if (r.sender_id === userId) return;
          const { convId } = getActiveChatTarget();
          if (convId && r.conversation_id === convId) return;
          bumpWorkspaceUnread(String(r.conversation_id));
        }
      )
      .subscribe();

    const gr = supabase
      .channel(`shell_rooms_unread_${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
          filter: `community_id=eq.${communityId}`,
        },
        (p: RealtimePayload) => {
          const r = p.new;
          if (r.sender_id === userId) return;
          if (r.thread_id) return;
          const { roomId } = getActiveChatTarget();
          if (roomId && r.room_id === roomId) return;
          bumpWorkspaceUnread(String(r.room_id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gi);
      supabase.removeChannel(gr);
    };
  }, [communityId, userId, supabase]);
}
