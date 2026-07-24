"use client";

/**
 * Community-scoped presence + typing (Supabase Realtime).
 * Mirrors the room presence pattern in hooks/useChatRoom.ts without
 * changing that architecture — reusable for overview, members, workspace.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PresencePeer = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  onlineAt: string;
};

export type TypingPeer = {
  userId: string;
  name: string;
};

type PresencePayload = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  online_at: string;
};

type TypingBroadcast = {
  user_id: string;
  name: string;
  typing: boolean;
};

export function useCommunityPresence({
  communityId,
  userId,
  displayName,
  avatarUrl,
  enabled = true,
}: {
  communityId: string | null | undefined;
  userId: string | null | undefined;
  displayName?: string | null;
  avatarUrl?: string | null;
  enabled?: boolean;
}) {
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const [typing, setTyping] = useState<TypingPeer[]>([]);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const typingSelfRef = useRef({ active: false, lastSentAt: 0 });
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !communityId || !userId) {
      setPeers([]);
      setTyping([]);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`presence:community:${communityId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, PresencePayload[]>;
        const next: PresencePeer[] = [];
        for (const [key, rows] of Object.entries(state)) {
          const row = rows[0];
          if (!row) continue;
          next.push({
            userId: row.user_id || key,
            name: row.name || "Member",
            avatarUrl: row.avatar_url ?? null,
            onlineAt: row.online_at || new Date().toISOString(),
          });
        }
        next.sort((a, b) => a.name.localeCompare(b.name));
        setPeers(next);
      })
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }: { payload: TypingBroadcast }) => {
          if (!payload || payload.user_id === userId) return;
          if (typingTimeoutsRef.current[payload.user_id]) {
            clearTimeout(typingTimeoutsRef.current[payload.user_id]);
            delete typingTimeoutsRef.current[payload.user_id];
          }
          setTyping((prev) => {
            const rest = prev.filter((t) => t.userId !== payload.user_id);
            return payload.typing
              ? [...rest, { userId: payload.user_id, name: payload.name }]
              : rest;
          });
          if (payload.typing) {
            typingTimeoutsRef.current[payload.user_id] = setTimeout(() => {
              setTyping((prev) =>
                prev.filter((t) => t.userId !== payload.user_id)
              );
            }, 4000);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            user_id: userId,
            name: displayName?.trim() || "Member",
            avatar_url: avatarUrl ?? null,
            online_at: new Date().toISOString(),
          } satisfies PresencePayload);
        }
      });

    channelRef.current = channel;

    return () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      typingSelfRef.current = { active: false, lastSentAt: 0 };
      setPeers([]);
      setTyping([]);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [avatarUrl, communityId, displayName, enabled, userId]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const channel = channelRef.current;
      if (!channel || !userId) return;
      const now = Date.now();
      const changed = typingSelfRef.current.active !== isTyping;
      const due = now - typingSelfRef.current.lastSentAt > 1500;
      if (!changed && !due && isTyping) return;
      typingSelfRef.current = { active: isTyping, lastSentAt: now };
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: userId,
          name: displayName?.trim() || "Member",
          typing: isTyping,
        } satisfies TypingBroadcast,
      });
    },
    [displayName, userId]
  );

  const signalTyping = useCallback(() => {
    sendTyping(true);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => sendTyping(false), 3000);
  }, [sendTyping]);

  const onlineCount = peers.length;
  const others = peers.filter((p) => p.userId !== userId);

  return {
    peers,
    others,
    onlineCount,
    typing,
    signalTyping,
    sendTyping,
  };
}
