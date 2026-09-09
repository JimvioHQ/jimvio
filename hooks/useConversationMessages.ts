"use client";

/**
 * Shared conversation message engine — room + inbox.
 * One load/pagination/realtime path for ChatRoom, DM dialog, and consumers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChangesMany,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import {
  CONVERSATION_PAGE_SIZE,
  dedupeSort,
  fetchConversationPage,
  isOptimisticMessageId,
  mergeMessages,
  oldestCursor,
  type ConversationTarget,
} from "@/lib/community/chat/conversation-messages";
import type { Msg, Profile } from "@/types";
import { isCallSignalingMessage } from "@/lib/community/message-signaling";

type Options = {
  target: ConversationTarget | null;
  /** Load history when target is set. Default true. */
  enabled?: boolean;
  /** Subscribe to realtime. Default mirrors `enabled`. */
  realtimeEnabled?: boolean;
  userId?: string | null;
  onIncomingCall?: (payload: {
    type: "audio" | "video";
    sender: Profile | null;
    roomId: string;
    convId?: string;
  }) => void;
  /** Fired when a thread reply lands while this conversation is open. */
  onThreadReply?: (threadId: string) => void;
};

function rowToMsg(row: Record<string, unknown>, profiles: Profile | null): Msg {
  return {
    id: String(row.id),
    body: String(row.body ?? ""),
    sender_id: String(row.sender_id),
    created_at: String(row.created_at),
    message_type: String(row.message_type ?? "text"),
    thread_id: (row.thread_id as string | null) ?? null,
    reactions: (row.reactions as Record<string, unknown>) ?? {},
    attachments: row.attachments ?? [],
    profiles,
    reply_count: (row.reply_count as number) ?? 0,
    is_edited: (row.is_edited as boolean) ?? false,
    edited_at: (row.edited_at as string) ?? null,
    reply_to_id: (row.reply_to_id as string) ?? null,
    reply_to_body: (row.reply_to_body as string) ?? null,
    reply_to_sender: (row.reply_to_sender as string) ?? null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    is_pinned: (row.is_pinned as boolean) ?? false,
    pinned_at: (row.pinned_at as string) ?? null,
    pinned_by: (row.pinned_by as string) ?? null,
    is_deleted: (row.is_deleted as boolean) ?? false,
  };
}

function channelNameFor(target: ConversationTarget): string {
  return target.kind === "room"
    ? `conv_room:${target.roomId}`
    : `conv_inbox:${target.conversationId}`;
}

export function useConversationMessages({
  target,
  enabled = true,
  realtimeEnabled,
  userId = null,
  onIncomingCall,
  onThreadReply,
}: Options) {
  const live = realtimeEnabled ?? enabled;
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const loadingOlderRef = useRef(false);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const onIncomingCallRef = useRef(onIncomingCall);
  const onThreadReplyRef = useRef(onThreadReply);
  const targetRef = useRef(target);
  const softResyncInFlightRef = useRef(false);

  useEffect(() => {
    onIncomingCallRef.current = onIncomingCall;
    onThreadReplyRef.current = onThreadReply;
    targetRef.current = target;
  }, [onIncomingCall, onThreadReply, target]);

  const targetKey = target
    ? target.kind === "room"
      ? `room:${target.roomId}`
      : `inbox:${target.slug}:${target.conversationId}`
    : null;

  const upsertMessage = useCallback((msg: Msg) => {
    setMessages((prev) => mergeMessages(prev, [msg], "append"));
  }, []);

  const patchMessage = useCallback((id: string, patch: Partial<Msg>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const replaceMessages = useCallback((next: Msg[]) => {
    setMessages(dedupeSort(next));
  }, []);

  /** Merge latest page without wiping optimistic rows (reconnect / race catch-up). */
  const softResync = useCallback(async () => {
    const t = targetRef.current;
    if (!t || softResyncInFlightRef.current) return;
    softResyncInFlightRef.current = true;
    try {
      const page = await fetchConversationPage(t, {
        limit: CONVERSATION_PAGE_SIZE,
      });
      const cleaned = page.messages.filter(
        (m) => !isCallSignalingMessage(m.message_type, m.body)
      );
      setMessages((prev) => {
        const pending = prev.filter((m) => isOptimisticMessageId(m.id));
        return mergeMessages(cleaned, pending, "append");
      });
      if (!nextCursorRef.current) {
        nextCursorRef.current = page.nextCursor;
        setHasMore(!!page.nextCursor);
      }
    } catch {
      /* soft resync is best-effort */
    } finally {
      softResyncInFlightRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!enabled || !target || !targetKey) {
      setMessages([]);
      setLoading(false);
      setHasMore(false);
      nextCursorRef.current = null;
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    seenEventIdsRef.current = new Set();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const page = await fetchConversationPage(target!, {
          limit: CONVERSATION_PAGE_SIZE,
          signal: controller.signal,
        });
        if (cancelled) return;
        const cleaned = page.messages.filter(
          (m) => !isCallSignalingMessage(m.message_type, m.body)
        );
        // Merge — don't replace — so realtime inserts that arrived during
        // the fetch are not discarded.
        setMessages((prev) => {
          const pending = prev.filter((m) => isOptimisticMessageId(m.id));
          const liveServer = prev.filter((m) => !isOptimisticMessageId(m.id));
          return mergeMessages(cleaned, [...liveServer, ...pending], "append");
        });
        nextCursorRef.current = page.nextCursor;
        setHasMore(!!page.nextCursor);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof Error && e.name === "AbortError") return;
        setMessages([]);
        setHasMore(false);
        nextCursorRef.current = null;
        setError(e instanceof Error ? e.message : "Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, targetKey, target]);

  // Realtime — subscribe independently of initial fetch; soft-resync on (re)subscribe
  useEffect(() => {
    if (!live || !target || !targetKey) return;

    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChangesMany>> = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let wasSubscribed = false;
    const activeTarget = target;
    const name = channelNameFor(activeTarget);

    async function enrich(id: string): Promise<Profile | null> {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, username")
        .eq("id", id)
        .maybeSingle();
      return data as Profile | null;
    }

    const remember = (eventKey: string): boolean => {
      if (seenEventIdsRef.current.has(eventKey)) return false;
      seenEventIdsRef.current.add(eventKey);
      if (seenEventIdsRef.current.size > 500) {
        const arr = [...seenEventIdsRef.current];
        seenEventIdsRef.current = new Set(arr.slice(-250));
      }
      return true;
    };

    const handleInsert = async (row: Record<string, unknown>) => {
      if (!row?.id) return;
      if (!remember(`i:${row.id}`)) return;
      if (row.message_type === "call_start" && row.sender_id !== userId) {
        onIncomingCallRef.current?.({
          type: row.body === "video" ? "video" : "audio",
          sender: await enrich(String(row.sender_id)),
          roomId: String(row.room_id ?? ""),
          convId: row.conversation_id ? String(row.conversation_id) : undefined,
        });
        return;
      }
      if (row.thread_id) {
        onThreadReplyRef.current?.(String(row.thread_id));
        return;
      }
      if (
        isCallSignalingMessage(
          String(row.message_type ?? ""),
          String(row.body ?? "")
        )
      ) {
        return;
      }
      const prof = await enrich(String(row.sender_id));
      upsertMessage(rowToMsg(row, prof));
    };

    const handleRoomUpdate = (row: Record<string, unknown>) => {
      if (!row?.id) return;
      const eventKey = `u:${row.id}:${row.edited_at ?? row.is_deleted ?? ""}:${JSON.stringify(row.reactions ?? {})}`;
      if (!remember(eventKey)) return;
      if (row.is_deleted) {
        removeMessage(String(row.id));
        return;
      }
      patchMessage(String(row.id), {
        body: String(row.body ?? ""),
        reactions: (row.reactions as Record<string, unknown>) ?? {},
        is_edited: (row.is_edited as boolean) ?? false,
        edited_at: (row.edited_at as string) ?? null,
        reply_count: (row.reply_count as number) ?? 0,
        metadata:
          row.metadata && typeof row.metadata === "object"
            ? (row.metadata as Record<string, unknown>)
            : null,
        is_pinned: (row.is_pinned as boolean) ?? false,
        pinned_at: (row.pinned_at as string) ?? null,
        pinned_by: (row.pinned_by as string) ?? null,
      });
    };

    const handleInboxUpdate = (row: Record<string, unknown>) => {
      if (!row?.id) return;
      const eventKey = `u:${row.id}:${row.edited_at ?? row.is_deleted ?? ""}:${JSON.stringify(row.reactions ?? {})}`;
      if (!remember(eventKey)) return;
      if (row.is_deleted) {
        removeMessage(String(row.id));
        return;
      }
      patchMessage(String(row.id), {
        body: String(row.body ?? ""),
        reactions: (row.reactions as Record<string, unknown>) ?? {},
        is_edited: (row.is_edited as boolean) ?? false,
        edited_at: (row.edited_at as string) ?? null,
        reply_to_id: (row.reply_to_id as string) ?? null,
        reply_to_body: (row.reply_to_body as string) ?? null,
        reply_to_sender: (row.reply_to_sender as string) ?? null,
      });
    };

    const listeners =
      activeTarget.kind === "room"
        ? [
            {
              config: {
                event: "INSERT" as const,
                schema: "public" as const,
                table: "community_messages",
                filter: `room_id=eq.${activeTarget.roomId}`,
              },
              onChange: async (payload?: { new: Record<string, unknown> }) => {
                if (payload?.new) await handleInsert(payload.new);
              },
            },
            {
              config: {
                event: "UPDATE" as const,
                schema: "public" as const,
                table: "community_messages",
                filter: `room_id=eq.${activeTarget.roomId}`,
              },
              onChange: (payload?: { new: Record<string, unknown> }) => {
                if (payload?.new) handleRoomUpdate(payload.new);
              },
            },
          ]
        : [
            {
              config: {
                event: "INSERT" as const,
                schema: "public" as const,
                table: "community_inbox_messages",
                filter: `conversation_id=eq.${activeTarget.conversationId}`,
              },
              onChange: async (payload?: { new: Record<string, unknown> }) => {
                if (payload?.new) await handleInsert(payload.new);
              },
            },
            {
              config: {
                event: "UPDATE" as const,
                schema: "public" as const,
                table: "community_inbox_messages",
                filter: `conversation_id=eq.${activeTarget.conversationId}`,
              },
              onChange: (payload?: { new: Record<string, unknown> }) => {
                if (payload?.new) handleInboxUpdate(payload.new);
              },
            },
          ];

    const start = () => {
      void (async () => {
        channel = await subscribePostgresChangesMany(
          supabase,
          name,
          listeners,
          () => cancelled,
          {
            onStatus: (status) => {
              if (cancelled) return;
              if (status === "SUBSCRIBED") {
                // Catch messages that arrived between initial fetch and subscribe,
                // and anything missed while disconnected.
                void softResync();
                wasSubscribed = true;
              } else if (
                status === "CHANNEL_ERROR" ||
                status === "TIMED_OUT"
              ) {
                if (retryTimer) clearTimeout(retryTimer);
                retryTimer = setTimeout(() => {
                  if (cancelled) return;
                  unsubscribeRealtime(supabase, channel, name);
                  channel = null;
                  start();
                }, wasSubscribed ? 1500 : 800);
              }
            },
          }
        );
      })();
    };

    start();

    const onVisible = () => {
      if (document.visibilityState === "visible") void softResync();
    };
    const onOnline = () => {
      void softResync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      unsubscribeRealtime(supabase, channel, name);
    };
  }, [
    live,
    targetKey,
    target,
    supabase,
    userId,
    upsertMessage,
    patchMessage,
    removeMessage,
    softResync,
  ]);

  const loadOlder = useCallback(async (): Promise<{
    added: number;
    anchorId: string | null;
  }> => {
    if (!target || !hasMore || loadingOlderRef.current) {
      return { added: 0, anchorId: null };
    }
    const before = nextCursorRef.current ?? oldestCursor(messages);
    if (!before) return { added: 0, anchorId: null };

    const anchorId = messages[0]?.id ?? null;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await fetchConversationPage(target, {
        before,
        limit: CONVERSATION_PAGE_SIZE,
      });
      const cleaned = page.messages.filter(
        (m) => !isCallSignalingMessage(m.message_type, m.body)
      );
      setMessages((prev) => mergeMessages(prev, cleaned, "prepend"));
      nextCursorRef.current = page.nextCursor;
      setHasMore(!!page.nextCursor);
      return { added: cleaned.length, anchorId };
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load older messages");
      return { added: 0, anchorId: null };
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [target, hasMore, messages]);

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    setError,
    upsertMessage,
    patchMessage,
    removeMessage,
    replaceMessages,
    loadOlder,
    softResync,
  };
}
