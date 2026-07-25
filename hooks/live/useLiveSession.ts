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

export function useLiveSession(initialSessionId?: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<LiveSessionRow | null>(null);
  const [participants, setParticipants] = useState<LiveParticipantRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cancelled = useRef(false);

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

  /* Realtime sync */
  useEffect(() => {
    if (!session?.id) return;
    let cancelledSub = false;
    let chSession: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;
    let chPart: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;

    void (async () => {
      chSession = await subscribePostgresChanges(
        supabase,
        `live_session:${session.id}`,
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${session.id}`,
        },
        () => {
          void refresh(session.id);
        },
        () => cancelledSub
      );
      chPart = await subscribePostgresChanges(
        supabase,
        `live_session_participants:${session.id}`,
        {
          event: "*",
          schema: "public",
          table: "live_session_participants",
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          void refresh(session.id);
        },
        () => cancelledSub
      );
    })();

    return () => {
      cancelledSub = true;
      unsubscribeRealtime(supabase, chSession, `live_session:${session.id}`);
      unsubscribeRealtime(supabase, chPart, `live_session_participants:${session.id}`);
    };
  }, [session?.id, supabase, refresh]);

  const createLive = useCallback(
    async (input: { communityId: string; roomId?: string | null; title?: string }) => {
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
        await refresh(json.session.id);
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

  const invite = useCallback(
    async (targetUserId: string) => {
      if (!session) return;
      await sessionAction(session.id, { action: "invite", targetUserId });
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

  const viewerCount = participants.filter((p) => p.status === "joined").length;
  const speakers = participants.filter(
    (p) => p.status === "joined" && (p.role === "host" || p.role === "cohost" || p.role === "speaker")
  );

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
    invite,
    acceptInvite,
    accept,
    reject,
    remove,
    mute,
    syncMedia,
    requestSpeak,
    launchPoll,
    refresh,
    setSession,
  };
}
