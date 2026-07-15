"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import {
  JoinResult,
  LiveSessionDetail,
  BrowseOptions,
  BrowseResult,
  SessionAccess,
  SendMessageInput,
  ChatMessage,
  SessionConfig,
} from "./types";

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

/** Browse live sessions with SWR + optional realtime */
export function useLiveSessions(
  spaceId: string,
  options?: BrowseOptions
) {
  const key = spaceId
    ? `/api/c/live?spaceId=${spaceId}&${new URLSearchParams(
        options as Record<string, string>
      ).toString()}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<BrowseResult>(key, () =>
    fetcher(key!)
  );

  // Realtime subscription for session updates
  useEffect(() => {
    if (!spaceId) return;

    let cancelled = false;
    let channel: ReturnType<typeof import("@/lib/supabase/browser").createClient>["channel"] | null = null;

    (async () => {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();

      channel = supabase
        .channel(`live-sessions-${spaceId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_sessions",
            filter: `space_id=eq.${spaceId}`,
          },
          () => {
            if (!cancelled) mutate();
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        if (channel) channel.unsubscribe();
      };
    })();
  }, [spaceId, mutate]);

  return {
    sessions: data?.sessions ?? [],
    nextCursor: data?.nextCursor,
    loadMore: mutate,
    isLoading,
    isError: error,
  };
}

/** Check if user can access a session */
export function useSessionAccess(sessionId: string) {
  const key = sessionId
    ? `/api/c/live/${sessionId}/check-access`
    : null;

  const { data, error, isLoading, mutate } = useSWR<SessionAccess>(
    key,
    () => fetcher(key!)
  );

  return {
    access: data,
    isLoading,
    isError: error,
    recheck: mutate,
  };
}

/** Join a session with access check + payment flow */
export function useJoinSession() {
  const [isJoining, setIsJoining] = useState(false);

  const joinSession = useCallback(
    async (sessionId: string, paymentToken?: string) => {
      setIsJoining(true);
      try {
        const res = await fetch(`/api/c/live/${sessionId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentToken }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to join");
        return result as JoinResult;
      } finally {
        setIsJoining(false);
      }
    },
    []
  );

  return { joinSession, isJoining };
}

/** Live session detail with realtime viewer count */
export function useLiveSession(sessionId: string, accessToken?: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    session: LiveSessionDetail;
  }>(
    sessionId ? `/api/c/live/${sessionId}` : null,
    () => fetcher(`/api/c/live/${sessionId}`),
    { refreshInterval: 30000 }
  );

  // Realtime viewer count
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let channel: ReturnType<typeof import("@/lib/supabase/browser").createClient>["channel"] | null = null;

    (async () => {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();

      channel = supabase
        .channel(`live-session-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "live_sessions",
            filter: `id=eq.${sessionId}`,
          },
          () => {
            if (!cancelled) mutate();
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        if (channel) channel.unsubscribe();
      };
    })();
  }, [sessionId, mutate]);

  const leaveSession = useCallback(async () => {
    await fetch(`/api/c/live/${sessionId}/leave`, { method: "POST" });
    mutate();
  }, [sessionId, mutate]);

  return {
    session: data?.session ?? null,
    leaveSession,
    viewerCount: data?.session?.viewer_count ?? 0,
    isLive: data?.session?.status === "live",
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

/** Real-time chat with optimistic sends */
export function useChat(sessionId: string, chatToken?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Fetch initial messages
  const { data, error, isLoading, mutate } = useSWR<{ messages: ChatMessage[] }>(
    sessionId ? `/api/c/live/${sessionId}/messages?limit=50` : null,
    () => fetcher(`/api/c/live/${sessionId}/messages?limit=50`)
  );

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let channel: ReturnType<typeof import("@/lib/supabase/browser").createClient>["channel"] | null = null;

    (async () => {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();

      channel = supabase
        .channel(`live-chat-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_session_messages",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            if (!cancelled) {
              const newMsg = payload.new as ChatMessage;
              setMessages((prev) => [...prev, newMsg].slice(-200));
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) channel.unsubscribe();
    };
  }, [sessionId]);

  const sendMessage = useCallback(
    async (input: SendMessageInput): Promise<ChatMessage | null> => {
      setIsSending(true);
      try {
        const res = await fetch(`/api/c/live/${sessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error(await res.text());
        const message = await res.json();
        setMessages((prev) => [...prev, message].slice(-200));
        return message;
      } finally {
        setIsSending(false);
      }
    },
    [sessionId]
  );

  return {
    messages: data?.messages ?? [],
    sendMessage,
    isSending,
    isLoading: isLoading || error,
    refresh: mutate,
  };
}

/** Helper: join session with access check + payment */
export async function joinSessionWithAccess(
  sessionId: string,
  paymentToken?: string
): Promise<{ session: LiveSessionDetail; accessToken: string; chatToken: string; hlsUrl: string; userRole: "host" | "viewer" | "moderator" }> {
  // Check access
  const checkRes = await fetch(`/api/c/live/${sessionId}/check-access`);
  const checkData = await checkRes.json();
  if (!checkRes.ok) throw new Error(checkData.error || "Access denied");

  // Join
  const joinRes = await fetch(`/api/c/live/${sessionId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentToken }),
  });
  const joinData = await joinRes.json();
  if (!joinRes.ok) throw new Error(joinData.error || "Failed to join");

  return joinData;
}

/** Host: start session */
export async function startLiveSession(sessionId: string): Promise<{ session: LiveSessionDetail; accessToken: string; hlsUrl: string }> {
  const res = await fetch(`/api/c/live/${sessionId}/start`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to start");
  return data;
}

/** Host: end session */
export async function endLiveSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/c/live/${sessionId}/end`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
}

/** Send a tip */
export async function sendTip(
  sessionId: string,
  amountCents: number,
  message?: string
): Promise<{ success: boolean; transactionId: string }> {
  const res = await fetch(`/api/c/live/${sessionId}/tips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountCents, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send tip");
  return data;
}

/** Purchase a ticket */
export async function purchaseTicket(
  sessionId: string,
  tierId: string
): Promise<{ success: boolean; ticketId: string; accessToken: string }> {
  const res = await fetch(`/api/c/live/${sessionId}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tierId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to purchase");
  return data;
}

/** Host: start recording */
export async function startRecording(
  sessionId: string,
  config?: { quality?: string; format?: string }
): Promise<{ recordingId: string; hlsUrl: string }> {
  const res = await fetch(`/api/c/live/${sessionId}/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to start recording");
  return data;
}

/** Host: stop recording */
export async function stopRecording(
  sessionId: string
): Promise<{ recordingId: string; playbackUrl: string }> {
  const res = await fetch(`/api/c/live/${sessionId}/record/stop`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to stop recording");
  return data;
}

/** Moderation actions */
export async function moderateAction(action: {
  type: "delete_message" | "ban_user" | "pin_message" | "mute_user";
  sessionId: string;
  targetId: string;
  reason?: string;
  durationMinutes?: number;
}): Promise<void> {
  const res = await fetch(`/api/c/live/${action.sessionId}/moderate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!res.ok) throw new Error(await res.text());
}