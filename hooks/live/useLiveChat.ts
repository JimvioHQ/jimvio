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
  is_pinned?: boolean | null;
  reply_to_id?: string | null;
  reply_to_body?: string | null;
  reply_to_sender?: string | null;
  reaction_count?: number;
  sender_name?: string;
  sender_avatar?: string | null;
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
    sender_name:
      m.sender_name ||
      m.profiles?.full_name ||
      m.profiles?.username ||
      "Member",
    sender_avatar: m.sender_avatar ?? m.profiles?.avatar_url ?? null,
    reaction_count: m.reaction_count ?? 0,
    is_pinned: Boolean(m.is_pinned),
    reply_to_id: m.reply_to_id ?? null,
    reply_to_body: m.reply_to_body ?? null,
    reply_to_sender: m.reply_to_sender ?? null,
  };
}

/**
 * Live chat — prefers community room messages when roomId is set;
 * falls back to live_session_messages for Creator Live (no room).
 */
export function useLiveChat(
  roomId: string | null | undefined,
  sessionId?: string | null | undefined
) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenInserts = useRef<Set<string>>(new Set());
  const roomKey = roomId ?? "";
  const sessionKey = !roomKey && sessionId ? sessionId : "";
  const chatKey = roomKey || sessionKey;
  const mode: "room" | "session" | "none" = roomKey
    ? "room"
    : sessionKey
      ? "session"
      : "none";

  const load = useCallback(async () => {
    if (mode === "room") {
      const res = await fetch(`/api/messages/${roomKey}?limit=100`);
      const json = (await res.json()) as { messages?: ApiMessage[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load chat");
      setMessages((json.messages ?? []).map(toChatMessage));
      return;
    }
    if (mode === "session") {
      const res = await fetch(`/api/c/live/sessions/${sessionKey}/chat`);
      const json = (await res.json()) as { messages?: ApiMessage[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load chat");
      setMessages((json.messages ?? []).map(toChatMessage));
    }
  }, [mode, roomKey, sessionKey]);

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      void load().catch(() => undefined);
    }, 220);
  }, [load]);

  useEffect(() => {
    if (mode === "none") {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Chat load failed");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [mode, load]);

  useEffect(() => {
    if (mode !== "room" || !roomKey) return;
    useRoomMessageIndex
      .getState()
      .sync(
        roomKey,
        messages.map((m) => liveChatToMsg(m, roomKey))
      );
  }, [mode, roomKey, messages]);

  useEffect(() => {
    if (mode === "none" || !chatKey) return;
    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;

    void (async () => {
      if (mode === "room") {
        channel = await subscribePostgresChanges(
          supabase,
          `live_chat:${chatKey}`,
          {
            event: "*",
            schema: "public",
            table: "community_messages",
            filter: `room_id=eq.${chatKey}`,
          },
          (payload) => {
            const eventType = payload?.eventType;
            const row = payload?.new as ApiMessage | null;
            if (eventType === "INSERT" && row?.id) {
              if (seenInserts.current.has(row.id)) return;
              seenInserts.current.add(row.id);
              if (seenInserts.current.size > 300) {
                seenInserts.current = new Set(Array.from(seenInserts.current).slice(-100));
              }
              if (row.body && row.created_at) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === row.id)) return prev;
                  return [...prev, toChatMessage(row)];
                });
              }
              scheduleReload();
              return;
            }
            scheduleReload();
          },
          () => cancelled
        );
      } else {
        channel = await subscribePostgresChanges(
          supabase,
          `live_session_chat:${chatKey}`,
          {
            event: "*",
            schema: "public",
            table: "live_session_messages",
            filter: `session_id=eq.${chatKey}`,
          },
          (payload) => {
            const eventType = payload?.eventType;
            const row = payload?.new as {
              id?: string;
              body?: string;
              created_at?: string;
              user_id?: string;
            } | null;
            if (eventType === "INSERT" && row?.id) {
              if (seenInserts.current.has(row.id)) return;
              seenInserts.current.add(row.id);
              scheduleReload();
              return;
            }
            scheduleReload();
          },
          () => cancelled
        );
      }
    })();

    return () => {
      cancelled = true;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      unsubscribeRealtime(
        supabase,
        channel,
        mode === "room" ? `live_chat:${chatKey}` : `live_session_chat:${chatKey}`
      );
    };
  }, [mode, chatKey, supabase, scheduleReload]);

  const send = useCallback(
    async (
      body: string,
      reply?: { reply_to_id: string; reply_to_body?: string; reply_to_sender?: string }
    ) => {
      if (!chatKey || !body.trim() || mode === "none") return;
      setSending(true);
      setError(null);
      try {
        const url =
          mode === "room"
            ? `/api/messages/${roomKey}`
            : `/api/c/live/sessions/${sessionKey}/chat`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: body.trim(),
            message_type: "text",
            ...(reply?.reply_to_id
              ? {
                  reply_to_id: reply.reply_to_id,
                  reply_to_body: reply.reply_to_body ?? null,
                  reply_to_sender: reply.reply_to_sender ?? null,
                }
              : {}),
          }),
        });
        const json = (await res.json()) as { message?: ApiMessage; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Send failed");
        if (json.message) {
          seenInserts.current.add(json.message.id);
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
    [chatKey, mode, roomKey, sessionKey]
  );

  const signalTyping = useCallback(() => {
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 1200);
  }, []);

  return {
    messages: mode === "none" ? [] : messages,
    sending,
    error,
    typing,
    send,
    signalTyping,
    reload: () => (mode === "none" ? Promise.resolve() : load()),
  };
}
