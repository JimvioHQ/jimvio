"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoomTransport,
  type LiveKitRemoteMedia,
  type LiveKitRoomSnapshot,
} from "@/lib/live/livekit-room";
import type { RoomStageFocus } from "@/lib/live/stage-selection";

const INITIAL: LiveKitRoomSnapshot = {
  connected: false,
  connecting: false,
  connectionState: "disconnected",
  roomName: null,
  error: null,
  remotes: [],
  stageStream: null,
  activeScreenShareIdentity: null,
  stageKind: "camera",
  screenShares: [],
  activeSpeakerId: null,
  resyncGeneration: 0,
};

type TokenResponse = {
  token?: string;
  url?: string;
  roomName?: string;
  role?: string;
  error?: string;
  anonymous?: boolean;
};

function isBenignDisconnect(message: string): boolean {
  return /client initiated disconnect|connection interrupted|cancelled|aborted/i.test(
    message
  );
}

/**
 * Connects to LiveKit for a Jimvio live session.
 * Publishes tracks sourced from the existing LiveMediaPlane (preview / share).
 */
export function useLiveKitRoom(opts: {
  sessionId: string | null | undefined;
  enabled?: boolean;
  /** When true, mint a view-only anonymous preview token. */
  anonymousPreview?: boolean;
  /** Wait until auth hydration finishes before requesting an authenticated token. */
  authReady?: boolean;
  /** Authenticated Jimvio user id — required for non-preview tokens. */
  userId?: string | null;
  /** Local AV stream from media plane (camera+mic). */
  localAvStream?: MediaStream | null;
  camOn?: boolean;
  micOn?: boolean;
  /** Screen share stream from media plane. */
  shareStream?: MediaStream | null;
  sharing?: boolean;
  /** Prefer the local camera when this participant is hosting and no screen is selected. */
  preferLocalCamera?: boolean;
  /** Host user id — viewers see the host when no screen is selected. */
  hostIdentity?: string | null;
  /** Host-selected main stage. Does not restart media tracks. */
  stageFocus?: RoomStageFocus | null;
}) {
  const {
    sessionId,
    enabled = true,
    anonymousPreview = false,
    authReady = true,
    userId = null,
    localAvStream = null,
    camOn = false,
    micOn = false,
    shareStream = null,
    sharing = false,
    preferLocalCamera = true,
    hostIdentity = null,
    stageFocus = null,
  } = opts;

  const transportRef = useRef<LiveKitRoomTransport | null>(null);
  const [snap, setSnap] = useState<LiveKitRoomSnapshot>(INITIAL);
  const connectGen = useRef(0);
  const wasAnonymousRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const t = new LiveKitRoomTransport();
    transportRef.current = t;
    const unsub = t.subscribe(setSnap);
    return () => {
      unsub();
      void t.dispose();
      transportRef.current = null;
    };
  }, [enabled]);

  const fetchToken = useCallback(
    async (sid: string, anon: boolean): Promise<TokenResponse> => {
      const path = anon ? "/api/live/token/preview" : "/api/live/token";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
      return (await res.json()) as TokenResponse & { status?: number };
    },
    []
  );

  /* Connect when session is live and auth/preview mode is ready */
  useEffect(() => {
    if (!enabled || !sessionId) return;
    if (!authReady) return;
    if (!anonymousPreview && !userId) return;

    let cancelled = false;
    const gen = ++connectGen.current;
    const useAnon = Boolean(anonymousPreview && !userId);

    void (async () => {
      try {
        const json = await fetchToken(sessionId, useAnon);
        if (cancelled || gen !== connectGen.current) return;
        if (!json.token || !json.url) {
          const err = json.error ?? "Failed to get LiveKit token";
          if (isBenignDisconnect(err)) return;
          setSnap((s) => ({
            ...s,
            error: err,
            connecting: false,
          }));
          return;
        }
        wasAnonymousRef.current = useAnon;
        await transportRef.current?.connect(json.url, json.token);
      } catch (e) {
        if (cancelled || gen !== connectGen.current) return;
        const msg = e instanceof Error ? e.message : "LiveKit connect failed";
        if (isBenignDisconnect(msg)) {
          // Auth remount / Strict Mode / token handoff — auto-retry once.
          try {
            const retry = await fetchToken(sessionId, useAnon);
            if (cancelled || gen !== connectGen.current) return;
            if (retry.token && retry.url) {
              await transportRef.current?.connect(retry.url, retry.token);
              return;
            }
          } catch {
            /* fall through */
          }
          return;
        }
        setSnap((s) => ({
          ...s,
          error: msg,
          connecting: false,
        }));
      }
    })();

    return () => {
      cancelled = true;
      // Do not disconnect on every dependency blip — only when effect is truly
      // superseded (session change / disable). disconnect happens below.
    };
  }, [enabled, sessionId, authReady, userId, anonymousPreview, fetchToken]);

  /* Tear down when session ends or preview→auth identity changes */
  useEffect(() => {
    if (!enabled) {
      void transportRef.current?.disconnect();
      return;
    }
    if (!sessionId) {
      void transportRef.current?.disconnect();
    }
  }, [enabled, sessionId]);

  /* When anonymous preview upgrades to authenticated user, remint + reconnect */
  useEffect(() => {
    if (!enabled || !sessionId || !authReady || !userId) return;
    if (!wasAnonymousRef.current && !anonymousPreview) return;
    if (anonymousPreview && !userId) return;

    let cancelled = false;
    void (async () => {
      try {
        const json = await fetchToken(sessionId, false);
        if (cancelled || !json.token || !json.url) return;
        wasAnonymousRef.current = false;
        await transportRef.current?.connect(json.url, json.token);
      } catch {
        /* reconnect() surface remains available */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, sessionId, authReady, userId, anonymousPreview, fetchToken]);

  /* Publish local AV — only when connected; re-run after LiveKit reconnect */
  useEffect(() => {
    if (!snap.connected) return;
    if (anonymousPreview && !userId) return;
    void transportRef.current?.syncLocalAv(localAvStream, { camOn, micOn });
  }, [
    localAvStream,
    camOn,
    micOn,
    snap.connected,
    snap.resyncGeneration,
    anonymousPreview,
    userId,
  ]);

  /* Publish screen share (+ screen audio) */
  useEffect(() => {
    if (!snap.connected) return;
    if (anonymousPreview && !userId) return;
    void transportRef.current?.syncScreenShare(shareStream, sharing);
  }, [
    shareStream,
    sharing,
    snap.connected,
    snap.resyncGeneration,
    anonymousPreview,
    userId,
  ]);

  /* Local screen and camera stay published independently of which source is featured. */
  useEffect(() => {
    const screen = sharing ? shareStream ?? null : null;
    const camera = camOn && localAvStream ? localAvStream : null;
    const transport = transportRef.current;
    transport?.setPreferLocalCamera(preferLocalCamera);
    transport?.setLocalScreen(screen);
    transport?.setLocalCamera(camera);
  }, [preferLocalCamera, sharing, shareStream, localAvStream, camOn]);

  useEffect(() => {
    transportRef.current?.setHostIdentity(hostIdentity ?? null);
    transportRef.current?.setLocalIdentity(userId);
  }, [hostIdentity, userId]);

  useEffect(() => {
    transportRef.current?.setStageFocus(stageFocus ?? null);
  }, [stageFocus]);

  const reconnect = useCallback(async () => {
    if (!sessionId) return;
    const useAnon = Boolean(anonymousPreview && !userId);
    if (!useAnon && !userId) {
      throw new Error("Sign in to reconnect");
    }
    const json = await fetchToken(sessionId, useAnon);
    if (!json.token || !json.url) {
      throw new Error(json.error ?? "Token failed");
    }
    wasAnonymousRef.current = useAnon;
    await transportRef.current?.connect(json.url, json.token);
  }, [sessionId, anonymousPreview, userId, fetchToken]);

  const disconnect = useCallback(async () => {
    await transportRef.current?.disconnect();
  }, []);

  return {
    ...snap,
    remotes: snap.remotes as LiveKitRemoteMedia[],
    reconnect,
    disconnect,
  };
}
