"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type HubTypingPeer = { userId: string; name: string };

/**
 * Conversation-scoped presence + typing for hub Messages.
 * Uses ephemeral Realtime channels (no DB writes).
 */
export function useHubChatPresence({
  channelKey,
  userId,
  displayName,
  avatarUrl,
  enabled = true,
}: {
  channelKey: string | null;
  userId: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  enabled?: boolean;
}) {
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [typing, setTyping] = useState<HubTypingPeer[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingSelfRef = useRef({ active: false, lastSentAt: 0 });
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !channelKey || !userId) {
      setOnlineIds([]);
      setTyping([]);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`presence:hub-msg:${channelKey}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ user_id?: string }>
        >;
        const ids = Object.keys(state).map((key) => {
          const row = state[key]?.[0];
          return row?.user_id || key;
        });
        setOnlineIds(ids);
      })
      .on(
        "broadcast",
        { event: "typing" },
        ({
          payload,
        }: {
          payload: { user_id?: string; name?: string; typing?: boolean };
        }) => {
          if (!payload?.user_id || payload.user_id === userId) return;
          if (typingTimeoutsRef.current[payload.user_id]) {
            clearTimeout(typingTimeoutsRef.current[payload.user_id]);
            delete typingTimeoutsRef.current[payload.user_id];
          }
          setTyping((prev) => {
            const rest = prev.filter((t) => t.userId !== payload.user_id);
            return payload.typing
              ? [...rest, { userId: payload.user_id!, name: payload.name || "Member" }]
              : rest;
          });
          if (payload.typing) {
            typingTimeoutsRef.current[payload.user_id] = setTimeout(() => {
              setTyping((prev) => prev.filter((t) => t.userId !== payload.user_id));
              delete typingTimeoutsRef.current[payload.user_id!];
            }, 4000);
          }
        }
      )
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            name: displayName || "Member",
            avatar_url: avatarUrl ?? null,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      typingSelfRef.current = { active: false, lastSentAt: 0 };
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [enabled, channelKey, userId, displayName, avatarUrl]);

  const sendTypingBroadcast = useCallback(
    (isTyping: boolean) => {
      const channel = channelRef.current;
      if (!channel || !userId) return;
      typingSelfRef.current = { active: isTyping, lastSentAt: Date.now() };
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: userId,
          name: displayName || "Member",
          typing: isTyping,
        },
      });
    },
    [userId, displayName]
  );

  const setTypingState = useCallback(
    (isTyping: boolean) => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      const shouldSend =
        isTyping !== typingSelfRef.current.active ||
        Date.now() - typingSelfRef.current.lastSentAt > 2000;
      if (shouldSend) sendTypingBroadcast(isTyping);
      if (isTyping) {
        stopTimerRef.current = setTimeout(() => sendTypingBroadcast(false), 2500);
      }
    },
    [sendTypingBroadcast]
  );

  return {
    onlineIds,
    typing,
    setTypingState,
    isPeerOnline: (peerId: string | null | undefined) =>
      !!peerId && onlineIds.includes(peerId),
  };
}
