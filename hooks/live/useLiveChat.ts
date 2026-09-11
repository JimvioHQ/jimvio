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
import {
  enqueueOutbox,
  loadOutbox,
  newOutboxClientId,
  removeOutbox,
  type HubOutboxItem,
} from "@/lib/community/chat/message-outbox";

type ApiMessage = {
  id: string;
  body: string;
  created_at: string;
  is_pinned?: boolean | null;
  reply_to_id?: string | null;
  reply_to_body?: string | null;
  reply_to_sender?: string | null;
  reaction_count?: number;
  reactions?: Record<string, string[]> | null;
  sender_name?: string;
  sender_avatar?: string | null;
  sender_id?: string | null;
  user_id?: string | null;
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
    username?: string | null;
  } | null;
};

export type LiveTypingUser = { id: string; name: string };

/** Honest chat transport state — never map idle/unavailable to "Reconnecting". */
export type LiveChatConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "unavailable";

function reactionCount(reactions: Record<string, string[]> | null | undefined): number {
  if (!reactions || typeof reactions !== "object") return 0;
  return Object.values(reactions).reduce((n, users) => n + (Array.isArray(users) ? users.length : 0), 0);
}

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
    reaction_count: m.reaction_count ?? reactionCount(m.reactions),
    is_pinned: Boolean(m.is_pinned),
    reply_to_id: m.reply_to_id ?? null,
    reply_to_body: m.reply_to_body ?? null,
    reply_to_sender: m.reply_to_sender ?? null,
  };
}

function outboxThreadId(mode: "room" | "session", key: string) {
  return `live:${mode}:${key}`;
}

/**
 * Live chat — prefers community room messages when roomId is set;
 * falls back to live_session_messages for Creator Live (no room).
 */
export function useLiveChat(
  roomId: string | null | undefined,
  sessionId?: string | null | undefined,
  opts?: { userId?: string | null; displayName?: string | null }
) {
  const supabase = useMemo(() => createClient(), []);
  const userId = opts?.userId ?? null;
  const displayName = opts?.displayName ?? "Member";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<LiveChatConnectionStatus>("idle");
  const [typingUsers, setTypingUsers] = useState<LiveTypingUser[]>([]);
  const hadConnectionRef = useRef(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingSelfRef = useRef<{ active: boolean; lastSentAt: number }>({
    active: false,
    lastSentAt: 0,
  });
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
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
  const roomActions = mode === "room";

  const refreshQueued = useCallback(() => {
    if (mode === "none" || !chatKey) {
      setQueuedCount(0);
      return;
    }
    const thread = outboxThreadId(mode, chatKey);
    setQueuedCount(loadOutbox().filter((i) => i.threadId === thread).length);
  }, [mode, chatKey]);

  const load = useCallback(async () => {
    if (mode === "room") {
      const res = await fetch(`/api/messages/${roomKey}?limit=100`);
      const json = (await res.json()) as { messages?: ApiMessage[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load chat");
      setMessages((json.messages ?? []).map(toChatMessage));
      hadConnectionRef.current = true;
      setConnectionStatus("connected");
      setError(null);
      return;
    }
    if (mode === "session") {
      const res = await fetch(`/api/c/live/sessions/${sessionKey}/chat`);
      const json = (await res.json()) as { messages?: ApiMessage[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load chat");
      setMessages((json.messages ?? []).map(toChatMessage));
      hadConnectionRef.current = true;
      setConnectionStatus("connected");
      setError(null);
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
      hadConnectionRef.current = false;
      setConnectionStatus("idle");
      setError(null);
      return;
    }
    let cancelled = false;
    setConnectionStatus((prev) =>
      prev === "connected" || hadConnectionRef.current ? "reconnecting" : "connecting"
    );
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Chat load failed");
          setConnectionStatus(
            hadConnectionRef.current
              ? navigator.onLine
                ? "reconnecting"
                : "disconnected"
              : "unavailable"
          );
        }
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
            const row = payload?.new as { id?: string } | null;
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

  /* Typing broadcast (room or session topic) */
  useEffect(() => {
    if (mode === "none" || !chatKey || !userId) {
      setTypingUsers([]);
      return;
    }
    const topic =
      mode === "room" ? `presence:room:${chatKey}` : `presence:live-session:${chatKey}`;
    const channel = supabase.channel(topic, {
      config: { presence: { key: userId } },
    });
    channel
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }: { payload: { user_id?: string; name?: string; typing?: boolean } }) => {
          if (!payload?.user_id || payload.user_id === userId) return;
          const uid = payload.user_id;
          if (typingTimeoutsRef.current[uid]) {
            clearTimeout(typingTimeoutsRef.current[uid]);
            delete typingTimeoutsRef.current[uid];
          }
          setTypingUsers((prev) => {
            const rest = prev.filter((t) => t.id !== uid);
            return payload.typing
              ? [...rest, { id: uid, name: payload.name || "Someone" }]
              : rest;
          });
          if (payload.typing) {
            typingTimeoutsRef.current[uid] = setTimeout(() => {
              setTypingUsers((prev) => prev.filter((t) => t.id !== uid));
            }, 4000);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });
    typingChannelRef.current = channel;
    return () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      typingSelfRef.current = { active: false, lastSentAt: 0 };
      setTypingUsers([]);
      void supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [mode, chatKey, userId, supabase]);

  const sendTypingBroadcast = useCallback(
    (isTyping: boolean) => {
      const channel = typingChannelRef.current;
      if (!channel || !userId) return;
      typingSelfRef.current = { active: isTyping, lastSentAt: Date.now() };
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId, name: displayName, typing: isTyping },
      });
    },
    [userId, displayName]
  );

  const signalTyping = useCallback(() => {
    if (!userId) return;
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = null;
    }
    const shouldSend =
      !typingSelfRef.current.active ||
      Date.now() - typingSelfRef.current.lastSentAt > 2000;
    if (shouldSend) sendTypingBroadcast(true);
    typingStopTimer.current = setTimeout(() => sendTypingBroadcast(false), 3000);
  }, [userId, sendTypingBroadcast]);

  const postBody = useCallback(
    async (
      body: string,
      reply?: { reply_to_id: string; reply_to_body?: string; reply_to_sender?: string },
      extra?: { message_type?: string; attachments?: unknown[]; metadata?: Record<string, unknown> }
    ) => {
      if (!chatKey || !body.trim() || mode === "none") return;
      const url =
        mode === "room"
          ? `/api/messages/${roomKey}`
          : `/api/c/live/sessions/${sessionKey}/chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          message_type: extra?.message_type ?? "text",
          ...(extra?.attachments ? { attachments: extra.attachments } : {}),
          ...(extra?.metadata ? { metadata: extra.metadata } : {}),
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
    },
    [chatKey, mode, roomKey, sessionKey]
  );

  const flushOutbox = useCallback(async () => {
    if (mode === "none" || !chatKey || !navigator.onLine) return;
    const thread = outboxThreadId(mode, chatKey);
    const pending = loadOutbox().filter((i) => i.threadId === thread);
    for (const item of pending) {
      try {
        await postBody(
          item.body,
          item.replyToId
            ? {
                reply_to_id: item.replyToId,
                reply_to_body: item.replyToBody ?? undefined,
                reply_to_sender: item.replyToSender ?? undefined,
              }
            : undefined,
          { message_type: item.messageType ?? "text", attachments: item.attachments }
        );
        removeOutbox(item.clientId);
      } catch {
        break;
      }
    }
    refreshQueued();
  }, [mode, chatKey, postBody, refreshQueued]);

  useEffect(() => {
    refreshQueued();
    const onOnline = () => {
      if (mode === "none") return;
      setConnectionStatus(hadConnectionRef.current ? "reconnecting" : "connecting");
      void load()
        .then(() => undefined)
        .catch(() => {
          setConnectionStatus("disconnected");
        });
      void flushOutbox();
    };
    const onOffline = () => {
      if (mode === "none") return;
      setConnectionStatus("disconnected");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (mode !== "none" && !navigator.onLine) {
      setConnectionStatus("disconnected");
    }
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [load, flushOutbox, refreshQueued, mode]);

  const send = useCallback(
    async (
      body: string,
      reply?: { reply_to_id: string; reply_to_body?: string; reply_to_sender?: string }
    ) => {
      if (!chatKey || !body.trim() || mode === "none") return;
      setSending(true);
      setError(null);
      sendTypingBroadcast(false);
      try {
        if (!navigator.onLine) {
          const item: HubOutboxItem = {
            clientId: newOutboxClientId(),
            threadId: outboxThreadId(mode, chatKey),
            kind: "group",
            communitySlug: null,
            roomId: mode === "room" ? roomKey : null,
            body: body.trim(),
            attachments: [],
            messageType: "text",
            replyToId: reply?.reply_to_id ?? null,
            replyToBody: reply?.reply_to_body ?? null,
            replyToSender: reply?.reply_to_sender ?? null,
            createdAt: new Date().toISOString(),
            attempts: 0,
          };
          enqueueOutbox(item);
          refreshQueued();
          setMessages((prev) => [
            ...prev,
            {
              id: item.clientId,
              body: item.body,
              created_at: item.createdAt,
              sender_name: displayName,
              sender_avatar: null,
              reaction_count: 0,
              reply_to_id: item.replyToId,
              reply_to_body: item.replyToBody,
              reply_to_sender: item.replyToSender,
            },
          ]);
          return;
        }
        await postBody(body, reply);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Send failed";
        setError(msg);
        if (chatKey) {
          enqueueOutbox({
            clientId: newOutboxClientId(),
            threadId: outboxThreadId(mode, chatKey),
            kind: "group",
            communitySlug: null,
            roomId: mode === "room" ? roomKey : null,
            body: body.trim(),
            attachments: [],
            messageType: "text",
            replyToId: reply?.reply_to_id ?? null,
            replyToBody: reply?.reply_to_body ?? null,
            replyToSender: reply?.reply_to_sender ?? null,
            createdAt: new Date().toISOString(),
            attempts: 1,
            lastError: msg,
          });
          refreshQueued();
        }
        throw e;
      } finally {
        setSending(false);
      }
    },
    [
      chatKey,
      mode,
      roomKey,
      displayName,
      postBody,
      sendTypingBroadcast,
      refreshQueued,
    ]
  );

  const sendGif = useCallback(
    async (url: string, title?: string) => {
      if (!roomActions) throw new Error("GIFs require a community room");
      await postBody(url || title || "GIF", undefined, {
        message_type: "gif",
        metadata: { gif_url: url, title: title || null },
      });
    },
    [roomActions, postBody]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji = "❤️") => {
      if (!roomActions) throw new Error("Reactions require a community room");
      const res = await fetch(`/api/messages/${roomKey}/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const json = (await res.json()) as {
        reactions?: Record<string, string[]>;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "React failed");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reaction_count: reactionCount(json.reactions) }
            : m
        )
      );
    },
    [roomActions, roomKey]
  );

  const togglePin = useCallback(
    async (messageId: string, pin: boolean) => {
      if (!roomActions) throw new Error("Pin requires a community room");
      const res = await fetch(`/api/messages/${roomKey}/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const json = (await res.json()) as { message?: ApiMessage; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Pin failed");
      if (json.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? toChatMessage(json.message!) : m))
        );
      } else {
        scheduleReload();
      }
    },
    [roomActions, roomKey, scheduleReload]
  );

  const editMessage = useCallback(
    async (messageId: string, body: string) => {
      if (!roomActions) throw new Error("Edit requires a community room");
      const res = await fetch(`/api/messages/${roomKey}/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = (await res.json()) as { message?: ApiMessage; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Edit failed");
      if (json.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? toChatMessage(json.message!) : m))
        );
      } else {
        scheduleReload();
      }
    },
    [roomActions, roomKey, scheduleReload]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!roomActions) throw new Error("Delete requires a community room");
      const res = await fetch(`/api/messages/${roomKey}/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delete: true }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [roomActions, roomKey]
  );

  return {
    messages: mode === "none" ? [] : messages,
    sending,
    error,
    connected: connectionStatus === "connected",
    connectionStatus: mode === "none" ? "idle" : connectionStatus,
    typingUsers,
    queuedCount,
    roomActions,
    send,
    sendGif,
    signalTyping,
    toggleReaction,
    togglePin,
    editMessage,
    deleteMessage,
    reload: () => (mode === "none" ? Promise.resolve() : load()),
    flushOutbox,
  };
}
