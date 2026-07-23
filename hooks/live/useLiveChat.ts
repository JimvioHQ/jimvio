"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChanges,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import type { ChatMessage } from "@/lib/community/hub-live-types";
import { liveChatToMsg } from "@/lib/community/live-collab";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";

type ApiMessage = {
  id: string;
  body: string;
  created_at: string;
  reaction_count?: number;
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
    username?: string | null;
  } | null;
};

function toChatMessage(m: ApiMessage): ChatMessage {
  return {
    id: m.id,
    body: m.body,
    created_at: m.created_at,
    sender_name: m.profiles?.full_name || m.profiles?.username || "Member",
    sender_avatar: m.profiles?.avatar_url ?? null,
    reaction_count: m.reaction_count ?? 0,
  };
}

export function useLiveChat(roomId: string | null | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomKey = roomId ?? "";

  const load = useCallback(async (id: string) => {
    const res = await fetch(`/api/messages/${id}?limit=100`);
    const json = (await res.json()) as { messages?: ApiMessage[]; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to load chat");
    setMessages((json.messages ?? []).map(toChatMessage));
  }, []);

  useEffect(() => {
    if (!roomKey) return;
    let cancelled = false;
    const run = async () => {
      try {
        await load(roomKey);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Chat load failed");
      }
    };
    // Fire-and-forget hydrate; setState only after await
    void run();
    return () => {
      cancelled = true;
    };
  }, [roomKey, load]);

  // Keep channel message index in sync so Knowledge / Resources / Files reuse history
  useEffect(() => {
    if (!roomKey) return;
    useRoomMessageIndex
      .getState()
      .sync(
        roomKey,
        messages.map((m) => liveChatToMsg(m, roomKey))
      );
  }, [roomKey, messages]);

  useEffect(() => {
    if (!roomKey) return;
    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;

    void (async () => {
      channel = await subscribePostgresChanges(
        supabase,
        `live_chat:${roomKey}`,
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
          filter: `room_id=eq.${roomKey}`,
        },
        () => {
          void load(roomKey);
        },
        () => cancelled
      );
    })();

    return () => {
      cancelled = true;
      unsubscribeRealtime(supabase, channel, `live_chat:${roomKey}`);
    };
  }, [roomKey, supabase, load]);

  const send = useCallback(
    async (body: string) => {
      if (!roomKey || !body.trim()) return;
      setSending(true);
      setError(null);
      try {
        const res = await fetch(`/api/messages/${roomKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: body.trim(), message_type: "text" }),
        });
        const json = (await res.json()) as { message?: ApiMessage; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Send failed");
        if (json.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === json.message!.id)) return prev;
            return [...prev, toChatMessage(json.message!)];
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Send failed");
        throw e;
      } finally {
        setSending(false);
      }
    },
    [roomKey]
  );

  const signalTyping = useCallback(() => {
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 1200);
  }, []);

  return {
    messages: roomKey ? messages : [],
    sending,
    error,
    typing,
    send,
    signalTyping,
    reload: () => (roomKey ? load(roomKey) : Promise.resolve()),
  };
}
