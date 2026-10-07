"use client";

/**
 * LiveKit Room Composite custom template.
 *
 * Default LiveKit template waits for a subscribed track before logging
 * START_RECORDING. Jimvio Live supports avatar-only / silent hosts (camera
 * and mic off), so that default aborts with "Start signal not received".
 *
 * This page joins as the hidden recorder, renders available media (or avatar
 * tiles when none), and signals START_RECORDING once the room is connected —
 * without requiring the host to publish camera/mic tracks.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";

type Tile =
  | {
      key: string;
      kind: "video";
      track: RemoteTrack;
      name: string;
      screen: boolean;
    }
  | {
      key: string;
      kind: "avatar";
      name: string;
      identity: string;
    };

function queryParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name)?.trim() || "";
}

function displayName(p: RemoteParticipant): string {
  return (p.name || p.identity || "Participant").trim() || "Participant";
}

function collectTiles(room: Room): Tile[] {
  const tiles: Tile[] = [];
  for (const p of room.remoteParticipants.values()) {
    let hasVideo = false;
    for (const pub of p.trackPublications.values()) {
      if (
        pub.kind === Track.Kind.Video &&
        pub.isSubscribed &&
        pub.track &&
        (pub.source === Track.Source.Camera ||
          pub.source === Track.Source.ScreenShare ||
          pub.source === Track.Source.Unknown)
      ) {
        hasVideo = true;
        tiles.push({
          key: `${p.identity}:${pub.trackSid}`,
          kind: "video",
          track: pub.track,
          name: displayName(p),
          screen: pub.source === Track.Source.ScreenShare,
        });
      }
    }
    if (!hasVideo) {
      tiles.push({
        key: `avatar:${p.identity}`,
        kind: "avatar",
        name: displayName(p),
        identity: p.identity,
      });
    }
  }
  // Prefer screen share as primary when present
  tiles.sort((a, b) => {
    const as = a.kind === "video" && a.screen ? 0 : 1;
    const bs = b.kind === "video" && b.screen ? 0 : 1;
    return as - bs;
  });
  return tiles;
}

function VideoTile({ track, name }: { track: RemoteTrack; name: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video ref={ref} autoPlay playsInline muted className="h-full w-full object-contain" />
      <span className="absolute bottom-3 left-3 rounded bg-black/55 px-2 py-1 text-xs text-white">
        {name}
      </span>
    </div>
  );
}

function AvatarTile({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#0f172a] text-white">
      <div
        className="flex items-center justify-center rounded-full bg-[#FF5A1F] text-3xl font-semibold"
        style={{ width: 120, height: 120 }}
      >
        {initial}
      </div>
      <p className="mt-4 max-w-[80%] truncate text-lg font-medium">{name}</p>
    </div>
  );
}

export default function LiveEgressTemplatePage() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [connectError, setConnectError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const roomRef = useRef<Room | null>(null);

  const layout = useMemo(() => queryParam("layout") || "speaker", []);
  const missingParams =
    typeof window !== "undefined" && (!queryParam("url") || !queryParam("token"))
      ? "Missing LiveKit url or token"
      : null;
  const error = missingParams || connectError;

  useEffect(() => {
    const url = queryParam("url");
    const token = queryParam("token");
    if (!url || !token) return;

    let cancelled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const refresh = () => {
      if (cancelled) return;
      setTiles(collectTiles(room));
    };

    const signalStart = () => {
      if (startedRef.current || cancelled) return;
      startedRef.current = true;
      // LiveKit egress watches the browser console for this exact string.
      // eslint-disable-next-line no-console
      console.log("START_RECORDING");
    };

    const onTrackSubscribed = (
      _track: RemoteTrack,
      _pub: RemoteTrackPublication,
      _participant: RemoteParticipant
    ) => {
      refresh();
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, refresh);
    room.on(RoomEvent.ParticipantConnected, refresh);
    room.on(RoomEvent.ParticipantDisconnected, refresh);
    room.on(RoomEvent.TrackMuted, refresh);
    room.on(RoomEvent.TrackUnmuted, refresh);
    room.on(RoomEvent.Disconnected, () => {
      // eslint-disable-next-line no-console
      console.log("END_RECORDING");
    });

    void (async () => {
      try {
        await room.connect(url, token);
        if (cancelled) return;
        refresh();

        // Allow a brief window for existing publishers to subscribe, then start
        // even for avatar-only / silent rooms (no published tracks).
        const startAfterMs = 750;
        window.setTimeout(() => {
          if (cancelled) return;
          refresh();
          if (room.state === ConnectionState.Connected) {
            signalStart();
          }
        }, startAfterMs);

        // Safety: if connection settles later, still start once.
        room.once(RoomEvent.Connected, () => {
          window.setTimeout(() => {
            if (!cancelled) signalStart();
          }, 200);
        });
      } catch (e) {
        if (!cancelled) {
          setConnectError(e instanceof Error ? e.message : "Failed to connect");
        }
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      void room.disconnect();
      roomRef.current = null;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        {error}
      </div>
    );
  }

  const primary = tiles[0];
  const secondary = tiles.slice(1);
  const isSpeaker = layout.startsWith("speaker") || layout.startsWith("single-speaker");

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white">
      {!primary ? (
        <div className="flex h-full w-full flex-col items-center justify-center">
          <div
            className="flex items-center justify-center rounded-full bg-[#FF5A1F] text-4xl font-semibold"
            style={{ width: 140, height: 140 }}
          >
            J
          </div>
          <p className="mt-4 text-lg font-medium">Jimvio Live</p>
        </div>
      ) : isSpeaker ? (
        <div
          className="grid h-full w-full gap-2 p-2"
          style={{
            gridTemplateColumns: secondary.length ? "1fr 180px" : "1fr",
          }}
        >
          <div className="min-h-0 min-w-0">
            {primary.kind === "video" ? (
              <VideoTile track={primary.track} name={primary.name} />
            ) : (
              <AvatarTile name={primary.name} />
            )}
          </div>
          {secondary.length ? (
            <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
              {secondary.map((t) => (
                <div key={t.key} className="min-h-0 flex-1 overflow-hidden rounded">
                  {t.kind === "video" ? (
                    <VideoTile track={t.track} name={t.name} />
                  ) : (
                    <AvatarTile name={t.name} />
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="grid h-full w-full gap-2 p-2"
          style={{
            gridTemplateColumns:
              tiles.length <= 1 ? "1fr" : tiles.length === 2 ? "1fr 1fr" : "1fr 1fr",
            gridTemplateRows: tiles.length > 2 ? "1fr 1fr" : "1fr",
          }}
        >
          {tiles.map((t) => (
            <div key={t.key} className="min-h-0 min-w-0 overflow-hidden rounded">
              {t.kind === "video" ? (
                <VideoTile track={t.track} name={t.name} />
              ) : (
                <AvatarTile name={t.name} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
