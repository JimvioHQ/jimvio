"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoomTransport,
  type LiveKitRemoteMedia,
  type LiveKitRoomSnapshot,
} from "@/lib/live/livekit-room";

const INITIAL: LiveKitRoomSnapshot = {
  connected: false,
  connecting: false,
  connectionState: "disconnected",
  roomName: null,
  error: null,
  remotes: [],
  stageStream: null,
  activeSpeakerId: null,
};

type TokenResponse = {
  token?: string;
  url?: string;
  roomName?: string;
  role?: string;
  error?: string;
};

/**
 * Connects to LiveKit for a Jimvio live session.
 * Publishes tracks sourced from the existing LiveMediaPlane (preview / share).
 */
export function useLiveKitRoom(opts: {
  sessionId: string | null | undefined;
  enabled?: boolean;
  /** Local AV stream from media plane (camera+mic). */
  localAvStream?: MediaStream | null;
  camOn?: boolean;
  micOn?: boolean;
  /** Screen share stream from media plane. */
  shareStream?: MediaStream | null;
  sharing?: boolean;
  /** Prefer local preview on stage when hosting. */
  preferLocalStage?: boolean;
}) {
  const {
    sessionId,
    enabled = true,
    localAvStream = null,
    camOn = false,
    micOn = false,
    shareStream = null,
    sharing = false,
    preferLocalStage = true,
  } = opts;

  const transportRef = useRef<LiveKitRoomTransport | null>(null);
  const [snap, setSnap] = useState<LiveKitRoomSnapshot>(INITIAL);

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

  /* Connect when session is live */
  useEffect(() => {
    if (!enabled || !sessionId) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = (await res.json()) as TokenResponse;
        if (cancelled) return;
        if (!res.ok || !json.token || !json.url) {
          setSnap((s) => ({
            ...s,
            error: json.error ?? "Failed to get LiveKit token",
            connecting: false,
          }));
          return;
        }
        await transportRef.current?.connect(json.url, json.token);
      } catch (e) {
        if (cancelled) return;
        setSnap((s) => ({
          ...s,
          error: e instanceof Error ? e.message : "LiveKit connect failed",
          connecting: false,
        }));
      }
    })();

    return () => {
      cancelled = true;
      void transportRef.current?.disconnect();
    };
  }, [enabled, sessionId]);

  /* Publish local AV */
  useEffect(() => {
    void transportRef.current?.syncLocalAv(localAvStream, { camOn, micOn });
  }, [localAvStream, camOn, micOn, snap.connected]);

  /* Publish screen share */
  useEffect(() => {
    void transportRef.current?.syncScreenShare(shareStream, sharing);
  }, [shareStream, sharing, snap.connected]);

  /* Stage composition: local preview preferred for host; remotes for viewers */
  useEffect(() => {
    let localStage: MediaStream | null = null;
    if (preferLocalStage) {
      if (sharing) localStage = shareStream ?? null;
      else if ((camOn || micOn) && localAvStream) localStage = localAvStream;
    }
    transportRef.current?.setLocalPreview(localStage);
  }, [preferLocalStage, sharing, shareStream, localAvStream, camOn, micOn]);

  const reconnect = useCallback(async () => {
    if (!sessionId) return;
    const res = await fetch("/api/live/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const json = (await res.json()) as TokenResponse;
    if (!res.ok || !json.token || !json.url) {
      throw new Error(json.error ?? "Token failed");
    }
    await transportRef.current?.connect(json.url, json.token);
  }, [sessionId]);

  return {
    ...snap,
    remotes: snap.remotes as LiveKitRemoteMedia[],
    reconnect,
  };
}
