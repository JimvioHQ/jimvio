"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChanges,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import type { LiveStageRole } from "@/lib/live/roles";
import type { LiveParticipantRow, LiveSessionRow } from "@/services/live/session-service";

async function sessionAction(sessionId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/c/live/sessions/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Request failed");
  return json;
}

function eventKey(payload: {
  eventType?: string;
  new?: { id?: string; updated_at?: string; status?: string } | null;
  old?: { id?: string } | null;
}): string {
  const row = payload.new ?? payload.old;
  return [
    payload.eventType ?? "*",
    row?.id ?? "",
    (payload.new as { updated_at?: string } | null)?.updated_at ??
      (payload.new as { status?: string } | null)?.status ??
      "",
  ].join(":");
}

export function useLiveSession(initialSessionId?: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<LiveSessionRow | null>(null);
  const [participants, setParticipants] = useState<LiveParticipantRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cancelled = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    cancelled.current = false;
    void supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
      const id = res.data.user?.id ?? null;
      if (!cancelled.current) setUserId(id);
    });
    return () => {
      cancelled.current = true;
    };
  }, [supabase]);

  const refresh = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/c/live/sessions/${sessionId}`);
    const json = (await res.json()) as {
      session?: LiveSessionRow;
      participants?: LiveParticipantRow[];
      error?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "Failed to load session");
    setSession(json.session ?? null);
    setParticipants(json.participants ?? []);
  }, []);

  const scheduleRefresh = useCallback(
    (sessionId: string, payload?: Parameters<typeof eventKey>[0]) => {
      if (payload) {
        const key = eventKey(payload);
        if (seenEvents.current.has(key)) return;
        seenEvents.current.add(key);
        if (seenEvents.current.size > 200) {
          seenEvents.current = new Set(Array.from(seenEvents.current).slice(-80));
        }
      }
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        void refresh(sessionId).catch(() => undefined);
      }, 180);
    },
    [refresh]
  );

  useEffect(() => {
    if (!initialSessionId) return;
    let cancelledLoad = false;
    void (async () => {
      try {
        await refresh(initialSessionId);
      } catch (e) {
        if (!cancelledLoad) setError(e instanceof Error ? e.message : "Load failed");
      }
    })();
    return () => {
      cancelledLoad = true;
    };
  }, [initialSessionId, refresh]);

  const myRole: LiveStageRole = useMemo(() => {
    if (!userId) return "viewer";
    const me = participants.find((p) => p.user_id === userId);
    if (me) return me.role;
    if (session?.host_id === userId) return "host";
    return "viewer";
  }, [participants, userId, session?.host_id]);

  /* Realtime sync — debounced + deduped full refresh */
  useEffect(() => {
    if (!session?.id) return;
    let cancelledSub = false;
    let chSession: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;
    let chPart: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;
    const sid = session.id;

    void (async () => {
      chSession = await subscribePostgresChanges(
        supabase,
        `live_session:${sid}`,
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${sid}`,
        },
        (payload) => {
          const row = payload?.new as LiveSessionRow | null;
          if (row && typeof row === "object" && "id" in row) {
            setSession((prev) => (prev ? { ...prev, ...row } : row));
          }
          if (payload) scheduleRefresh(sid, payload as Parameters<typeof eventKey>[0]);
        },
        () => cancelledSub
      );
      chPart = await subscribePostgresChanges(
        supabase,
        `live_session_participants:${sid}`,
        {
          event: "*",
          schema: "public",
          table: "live_session_participants",
          filter: `session_id=eq.${sid}`,
        },
        (payload) => {
          const eventType = payload?.eventType;
          const row = payload?.new as LiveParticipantRow | null;
          const old = payload?.old as LiveParticipantRow | null;

          if (eventType === "DELETE" && old?.user_id) {
            setParticipants((prev) => prev.filter((p) => p.user_id !== old.user_id));
          } else if (row?.user_id) {
            setParticipants((prev) => {
              const idx = prev.findIndex((p) => p.user_id === row.user_id);
              if (row.status === "left" || row.status === "removed") {
                return prev.filter((p) => p.user_id !== row.user_id);
              }
              if (idx >= 0) {
                const next = prev.slice();
                next[idx] = { ...next[idx], ...row };
                return next;
              }
              if (["joined", "requested", "invited"].includes(row.status)) {
                return [...prev, row];
              }
              return prev;
            });
          }
          if (payload) scheduleRefresh(sid, payload as Parameters<typeof eventKey>[0]);
        },
        () => cancelledSub
      );
    })();

    return () => {
      cancelledSub = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      unsubscribeRealtime(supabase, chSession, `live_session:${sid}`);
      unsubscribeRealtime(supabase, chPart, `live_session_participants:${sid}`);
    };
  }, [session?.id, supabase, scheduleRefresh]);

  const createLive = useCallback(
    async (input: {
      communityId?: string | null;
      roomId?: string | null;
      spaceId?: string | null;
      title?: string;
      scheduledAt?: string | null;
      privacy?: string;
    }) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/c/live/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = (await res.json()) as { session?: LiveSessionRow; error?: string };
        if (!res.ok || !json.session) throw new Error(json.error ?? "Create failed");
        setSession(json.session);
        if (json.session.status === "live") {
          await refresh(json.session.id);
        }
        return json.session;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create failed";
        setError(msg);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const join = useCallback(
    async (sessionId: string) => {
      setBusy(true);
      setError(null);
      try {
        await sessionAction(sessionId, { action: "join" });
        await refresh(sessionId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Join failed");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const leave = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "leave" });
    setSession(null);
    setParticipants([]);
  }, [session]);

  const endLive = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "end" });
    setSession((s) => (s ? { ...s, status: "ended" } : null));
    await refresh(session.id);
  }, [session, refresh]);

  const startScheduled = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "start" });
    await refresh(session.id);
  }, [session, refresh]);

  const cancelScheduled = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "cancel" });
    await refresh(session.id);
  }, [session, refresh]);

  const invite = useCallback(
    async (targetUserId: string, role?: LiveStageRole) => {
      if (!session) return;
      await sessionAction(session.id, {
        action: "invite",
        targetUserId,
        ...(role ? { role } : {}),
      });
      await refresh(session.id);
    },
    [session, refresh]
  );

  const acceptInvite = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "accept-invite" });
    await refresh(session.id);
  }, [session, refresh]);

  const accept = useCallback(
    async (targetUserId: string) => {
      if (!session) return;
      await sessionAction(session.id, { action: "accept", targetUserId });
      await refresh(session.id);
    },
    [session, refresh]
  );

  const admit = useCallback(
    async (targetUserId: string) => {
      if (!session) return;
      await sessionAction(session.id, { action: "admit", targetUserId });
      await refresh(session.id);
    },
    [session, refresh]
  );

  const admitAll = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "admit-all" });
    await refresh(session.id);
  }, [session, refresh]);

  const setWaitingRoom = useCallback(
    async (enabled: boolean) => {
      if (!session) return;
      await sessionAction(session.id, { action: "waiting-room", enabled });
      await refresh(session.id);
    },
    [session, refresh]
  );

  const reject = useCallback(
    async (targetUserId: string) => {
      if (!session) return;
      await sessionAction(session.id, { action: "reject", targetUserId });
      await refresh(session.id);
    },
    [session, refresh]
  );

  const remove = useCallback(
    async (targetUserId: string) => {
      if (!session) return;
      await sessionAction(session.id, { action: "remove", targetUserId });
      await refresh(session.id);
    },
    [session, refresh]
  );

  const mute = useCallback(
    async (targetUserId: string, micOn: boolean) => {
      if (!session) return;
      await sessionAction(session.id, { action: "mute", targetUserId, micOn });
      await refresh(session.id);
    },
    [session, refresh]
  );

  const promote = useCallback(
    async (targetUserId: string, role: LiveStageRole) => {
      if (!session) return;
      await sessionAction(session.id, { action: "promote", targetUserId, role });
      await refresh(session.id);
    },
    [session, refresh]
  );

  const transferHost = useCallback(
    async (targetUserId: string) => {
      if (!session) return;
      await sessionAction(session.id, { action: "transfer-host", targetUserId });
      await refresh(session.id);
    },
    [session, refresh]
  );

  const react = useCallback(
    async (emoji: string) => {
      if (!session) return;
      await sessionAction(session.id, { action: "react", emoji });
    },
    [session]
  );

  const syncMedia = useCallback(
    async (patch: { micOn?: boolean; camOn?: boolean; sharing?: boolean }) => {
      if (!session) return;
      await sessionAction(session.id, { action: "media", ...patch });
    },
    [session]
  );

  const requestSpeak = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "request" });
    await refresh(session.id);
  }, [session, refresh]);

  const launchPoll = useCallback(
    async (question: string, options: string[]) => {
      if (!session) return;
      return sessionAction(session.id, { action: "poll", question, options });
    },
    [session]
  );

  const viewerCount = useMemo(
    () =>
      session?.viewer_count ??
      participants.filter((p) => p.status === "joined").length,
    [session?.viewer_count, participants]
  );
  const speakers = useMemo(
    () =>
      participants.filter(
        (p) =>
          p.status === "joined" &&
          (p.role === "host" || p.role === "cohost" || p.role === "speaker")
      ),
    [participants]
  );

  useEffect(() => {
    if (!session?.id || session.status !== "live") return;
    const sid = session.id;
    const tick = () => {
      void fetch(`/api/c/live/sessions/${sid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat" }),
        keepalive: true,
      }).catch(() => undefined);
    };
    tick();
    const timer = window.setInterval(tick, 120_000);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (!session?.id || !userId) return;
    const sid = session.id;
    const isHost = session.host_id === userId;
    const onPageHide = () => {
      if (isHost) return;
      void fetch(`/api/c/live/sessions/${sid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [session?.id, session?.host_id, userId]);

  return {
    session,
    participants,
    speakers,
    viewerCount,
    myRole,
    userId,
    error,
    busy,
    createLive,
    join,
    leave,
    endLive,
    startScheduled,
    cancelScheduled,
    invite,
    acceptInvite,
    accept,
    admit,
    admitAll,
    setWaitingRoom,
    reject,
    remove,
    mute,
    promote,
    transferHost,
    react,
    syncMedia,
    requestSpeak,
    launchPoll,
    refresh,
    setSession,
  };
}
