"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChanges,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import type { LiveStageRole } from "@/lib/live/roles";
import {
  applyParticipantEvent,
  participantNeedsProfile,
  reconcileParticipants,
} from "@/lib/live/participant-state";
import {
  diffPresenceEvents,
  formatPresenceBody,
  markSeenPresenceId,
  type PresenceSystemEvent,
} from "@/lib/live/presence-events";
import type { LiveParticipantRow, LiveSessionRow } from "@/services/live/session-service";
import { mergeLiveSessionSettings } from "@/lib/live/stage-selection";

type ProfileCacheEntry = {
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

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

function applyProfileCache(
  row: LiveParticipantRow,
  cache: Map<string, ProfileCacheEntry>
): LiveParticipantRow {
  const hit = cache.get(row.user_id);
  if (!hit) return row;
  return {
    ...row,
    display_name: row.display_name || hit.display_name,
    avatar_url: row.avatar_url ?? hit.avatar_url,
    username: row.username ?? hit.username,
  };
}

export function useLiveSession(initialSessionId?: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<LiveSessionRow | null>(null);
  const [participants, setParticipants] = useState<LiveParticipantRow[]>([]);
  const [presenceEvents, setPresenceEvents] = useState<PresenceSystemEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [anonymousWatch, setAnonymousWatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cancelled = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenEvents = useRef<Set<string>>(new Set());
  const seenPresence = useRef<Set<string>>(new Set());
  const profileCache = useRef<Map<string, ProfileCacheEntry>>(new Map());
  const profileInflight = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);
  const presenceBootstrapped = useRef<string | null>(null);
  /** Suppress stale "joined" rows briefly after a leave event (read race). */
  const leftTombstones = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    cancelled.current = false;
    void supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
      const id = res.data.user?.id ?? null;
      if (!cancelled.current) {
        setUserId(id);
        setAuthReady(true);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, sessionAuth: { user?: { id: string } | null } | null) => {
        if (cancelled.current) return;
        const id = sessionAuth?.user?.id ?? null;
        setUserId(id);
        setAuthReady(true);
        if (id) setAnonymousWatch(false);
      }
    );
    return () => {
      cancelled.current = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const seedPresenceSeen = useCallback((sessionId: string, rows: LiveParticipantRow[]) => {
    for (const row of rows) {
      if (row.status !== "joined" || !row.user_id) continue;
      const marker = row.joined_at || row.updated_at || "join";
      markSeenPresenceId(
        seenPresence.current,
        `sys:join:${sessionId}:${row.user_id}:${marker}`
      );
    }
    presenceBootstrapped.current = sessionId;
  }, []);

  const emitPresenceDiff = useCallback(
    (prev: LiveParticipantRow[], next: LiveParticipantRow[], sessionId: string) => {
      // First authoritative snapshot: seed seen set so existing members don't
      // all appear as fresh "joined" notices for late openers.
      if (presenceBootstrapped.current !== sessionId) {
        seedPresenceSeen(sessionId, next);
        return;
      }
      const events = diffPresenceEvents({
        sessionId,
        prev,
        next,
        selfUserId: userIdRef.current,
        seenIds: seenPresence.current,
      });
      if (!events.length) return;
      for (const e of events) markSeenPresenceId(seenPresence.current, e.id);
      setPresenceEvents((cur) => {
        const ids = new Set(cur.map((x) => x.id));
        const add = events.filter((e) => !ids.has(e.id));
        if (!add.length) return cur;
        return [...cur, ...add].slice(-80);
      });
    },
    [seedPresenceSeen]
  );

  const hydrateProfile = useCallback(
    (uid: string, cancelledSub: () => boolean) => {
      if (!uid || profileInflight.current.has(uid)) return;
      const cached = profileCache.current.get(uid);
      if (cached?.display_name && cached.avatar_url && cached.username) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.user_id === uid
              ? {
                  ...p,
                  display_name: p.display_name || cached.display_name,
                  avatar_url: p.avatar_url ?? cached.avatar_url,
                  username: p.username ?? cached.username,
                }
              : p
          )
        );
        if (cached.display_name) {
          setPresenceEvents((prev) =>
            prev.map((e) =>
              e.user_id === uid &&
              (e.display_name === "Someone" || !e.display_name)
                ? {
                    ...e,
                    display_name: cached.display_name!,
                    body: formatPresenceBody(e.kind, cached.display_name!),
                  }
                : e
            )
          );
        }
        return;
      }
      profileInflight.current.add(uid);
      void supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .eq("id", uid)
        .maybeSingle()
        .then(({ data: profile }: { data: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          username: string | null;
        } | null }) => {
          profileInflight.current.delete(uid);
          if (!profile || cancelledSub()) return;
          const entry: ProfileCacheEntry = {
            display_name: profile.full_name || profile.username || null,
            avatar_url: profile.avatar_url ?? null,
            username: profile.username ?? null,
          };
          profileCache.current.set(uid, entry);
          setParticipants((prev) =>
            prev.map((p) =>
              p.user_id === uid
                ? {
                    ...p,
                    display_name: p.display_name || entry.display_name,
                    avatar_url: p.avatar_url ?? entry.avatar_url,
                    username: p.username ?? entry.username,
                  }
                : p
            )
          );
          if (entry.display_name) {
            setPresenceEvents((prev) =>
              prev.map((e) =>
                e.user_id === uid &&
                (e.display_name === "Someone" || !e.display_name)
                  ? {
                      ...e,
                      display_name: entry.display_name!,
                      body: formatPresenceBody(e.kind, entry.display_name!),
                    }
                  : e
              )
            );
          }
        })
        .catch(() => {
          profileInflight.current.delete(uid);
        });
    },
    [supabase]
  );

  const refresh = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/c/live/sessions/${sessionId}`);
    const json = (await res.json()) as {
      session?: LiveSessionRow;
      participants?: LiveParticipantRow[];
      error?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "Failed to load session");
    setError(null);
    setSession((prev) => {
      const next = json.session ?? null;
      if (!next) return null;
      if (!prev || prev.id !== next.id) return next;
      return {
        ...next,
        settings: mergeLiveSessionSettings(prev.settings, next.settings),
      };
    });
    const now = Date.now();
    for (const [uid, ts] of leftTombstones.current) {
      if (now - ts > 5_000) leftTombstones.current.delete(uid);
    }
    const server = (json.participants ?? [])
      .filter((row) => {
        const leftAt = leftTombstones.current.get(row.user_id);
        if (leftAt == null) return true;
        // Tombstone wins over a lagging joined read for a few seconds.
        if (row.status === "joined" || row.status === "requested" || row.status === "invited") {
          return false;
        }
        leftTombstones.current.delete(row.user_id);
        return true;
      })
      .map((row) => {
        if (row.display_name || row.avatar_url || row.username) {
          profileCache.current.set(row.user_id, {
            display_name: row.display_name ?? null,
            avatar_url: row.avatar_url ?? null,
            username: row.username ?? null,
          });
        }
        return applyProfileCache(row, profileCache.current);
      });
    setParticipants((prev) => {
      const next = reconcileParticipants(prev, server);
      emitPresenceDiff(prev, next, sessionId);
      return next;
    });
  }, [emitPresenceDiff]);

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

  const loadAnonymousWatch = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/c/live/sessions/${sessionId}/watch`);
    const json = (await res.json()) as {
      canWatch?: boolean;
      session?: LiveSessionRow;
      participants?: LiveParticipantRow[];
      error?: string;
    };
    if (!res.ok || !json.canWatch || !json.session) {
      throw new Error(json.error ?? "Preview unavailable");
    }
    setError(null);
    setAnonymousWatch(true);
    setSession(json.session);
    const rows = (json.participants ?? []).map((row) =>
      applyProfileCache(row, profileCache.current)
    );
    setParticipants(rows);
    seedPresenceSeen(sessionId, rows);
  }, [seedPresenceSeen]);

  useEffect(() => {
    if (!initialSessionId || !authReady) return;
    let cancelledLoad = false;
    void (async () => {
      try {
        if (userId) {
          setAnonymousWatch(false);
          await refresh(initialSessionId);
          return;
        }
        // Unauthenticated public Live — hydrate watch bootstrap (view-only).
        await loadAnonymousWatch(initialSessionId);
      } catch (e) {
        if (!cancelledLoad) setError(e instanceof Error ? e.message : "Load failed");
      }
    })();
    return () => {
      cancelledLoad = true;
    };
  }, [initialSessionId, authReady, userId, refresh, loadAnonymousWatch]);

  const myRole: LiveStageRole = useMemo(() => {
    if (!userId) return "viewer";
    const me = participants.find((p) => p.user_id === userId);
    if (me) return me.role;
    if (session?.host_id === userId) return "host";
    return "viewer";
  }, [participants, userId, session?.host_id]);

  /* Realtime sync — optimistic local apply + debounced authoritative refresh */
  useEffect(() => {
    if (!session?.id || !userId) return;
    let cancelledSub = false;
    let chSession: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;
    let chPart: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;
    const sid = session.id;
    const isCancelled = () => cancelledSub;
    const onChannelReady = (status: string) => {
      if (status !== "SUBSCRIBED" || cancelledSub) return;
      // Catch events missed between initial fetch and channel ready.
      void refresh(sid).catch(() => undefined);
    };

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
            setSession((prev) => {
              if (!prev) return row;
              return {
                ...prev,
                ...row,
                settings: mergeLiveSessionSettings(prev.settings, row.settings),
              };
            });
          }
          if (payload) scheduleRefresh(sid, payload as Parameters<typeof eventKey>[0]);
        },
        isCancelled,
        { onStatus: onChannelReady }
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
          const raw = payload?.new as LiveParticipantRow | null;
          const old = payload?.old as LiveParticipantRow | null;
          const row = raw ? applyProfileCache(raw, profileCache.current) : raw;

          const leftUid =
            eventType === "DELETE"
              ? old?.user_id ?? row?.user_id
              : row && (row.status === "left" || row.status === "removed")
                ? row.user_id
                : null;
          if (leftUid) {
            leftTombstones.current.set(leftUid, Date.now());
          } else if (row?.user_id && row.status === "joined") {
            leftTombstones.current.delete(row.user_id);
          }

          setParticipants((prev) => {
            const next = applyParticipantEvent(prev, { eventType, row, old });
            emitPresenceDiff(prev, next, sid);
            return next;
          });

          if (
            row?.user_id &&
            eventType !== "DELETE" &&
            row.status !== "left" &&
            row.status !== "removed" &&
            participantNeedsProfile(row)
          ) {
            hydrateProfile(row.user_id, isCancelled);
          }

          // INSERT is already applied optimistically — avoid a racing GET that
          // can briefly omit the new row and wipe it via reconcile.
          if (payload && eventType !== "INSERT") {
            scheduleRefresh(sid, payload as Parameters<typeof eventKey>[0]);
          }
        },
        isCancelled,
        { onStatus: onChannelReady }
      );
    })();

    return () => {
      cancelledSub = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      unsubscribeRealtime(supabase, chSession, `live_session:${sid}`);
      unsubscribeRealtime(supabase, chPart, `live_session_participants:${sid}`);
    };
  }, [session?.id, userId, supabase, scheduleRefresh, hydrateProfile, emitPresenceDiff, refresh]);

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
    setPresenceEvents([]);
    presenceBootstrapped.current = null;
    leftTombstones.current.clear();
    seenPresence.current.clear();
  }, [session]);

  const endLive = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "end" });
    setSession((s) => (s ? { ...s, status: "ended" } : null));
    await refresh(session.id);
  }, [session, refresh]);

  const updateTitle = useCallback(
    async (title: string) => {
      if (!session) throw new Error("No live session");
      const previous = session.title;
      const optimistic = title.trim().slice(0, 120);
      setSession((s) => (s ? { ...s, title: optimistic } : s));
      try {
        const json = await sessionAction(session.id, {
          action: "update-title",
          title: optimistic,
        });
        const next = (json as { session?: LiveSessionRow }).session;
        if (next) setSession(next);
        return next ?? session;
      } catch (e) {
        setSession((s) => (s ? { ...s, title: previous } : s));
        throw e;
      }
    },
    [session]
  );

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

  const updateParticipantPermissions = useCallback(
    async (permissions: {
      allowAudio?: boolean;
      allowVideo?: boolean;
      allowScreenShare?: boolean;
      allowRecording?: boolean;
    }) => {
      if (!session) return;
      const json = await sessionAction(session.id, {
        action: "participant-permissions",
        permissions,
      });
      const next = (json as { session?: LiveSessionRow }).session;
      if (next) setSession(next);
      return next;
    },
    [session]
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
      if (!session || !userId) return;
      setParticipants((prev) =>
        prev.map((p) =>
          p.user_id === userId
            ? {
                ...p,
                ...(typeof patch.micOn === "boolean" ? { mic_on: patch.micOn } : {}),
                ...(typeof patch.camOn === "boolean" ? { cam_on: patch.camOn } : {}),
                ...(typeof patch.sharing === "boolean" ? { sharing: patch.sharing } : {}),
              }
            : p
        )
      );
      await sessionAction(session.id, { action: "media", ...patch });
    },
    [session, userId]
  );

  const requestSpeak = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "request" });
    await refresh(session.id);
  }, [session, refresh]);

  const lowerHand = useCallback(async () => {
    if (!session) return;
    await sessionAction(session.id, { action: "lower-hand" });
    await refresh(session.id);
  }, [session, refresh]);

  const setStageFocus = useCallback(
    async (focus: {
      identity: string | null;
      kind?: "default" | "participant" | "screen";
    }) => {
      if (!session) return;
      const json = await sessionAction(session.id, {
        action: "stage-focus",
        stageFocus: focus,
      });
      const next = (json as { session?: LiveSessionRow }).session;
      if (next) setSession(next);
      return next;
    },
    [session]
  );

  const forceMedia = useCallback(
    async (
      targetUserId: string,
      patch: { micOn?: boolean; camOn?: boolean; sharing?: boolean }
    ) => {
      if (!session) return;
      await sessionAction(session.id, {
        action: "force-media",
        targetUserId,
        ...patch,
      });
      await refresh(session.id);
    },
    [session, refresh]
  );

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

  /* Tab visibility / reconnect — reconcile authoritative participant list */
  useEffect(() => {
    if (!session?.id || session.status !== "live") return;
    const sid = session.id;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh(sid).catch(() => undefined);
    };
    const onOnline = () => {
      void refresh(sid).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [session?.id, session?.status, refresh]);

  return {
    session,
    participants,
    speakers,
    viewerCount,
    presenceEvents,
    myRole,
    userId,
    authReady,
    anonymousWatch,
    error,
    busy,
    createLive,
    join,
    leave,
    endLive,
    updateTitle,
    startScheduled,
    cancelScheduled,
    invite,
    acceptInvite,
    accept,
    admit,
    admitAll,
    setWaitingRoom,
    updateParticipantPermissions,
    reject,
    remove,
    mute,
    promote,
    transferHost,
    react,
    syncMedia,
    requestSpeak,
    lowerHand,
    setStageFocus,
    forceMedia,
    launchPoll,
    refresh,
    setSession,
  };
}
