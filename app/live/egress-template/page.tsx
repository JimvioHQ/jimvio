"use client";

/**
 * LiveKit Room Composite custom template.
 *
 * Avatar-only hosts: START_RECORDING after connect (no published tracks).
 * Screen share / camera: wait for decoded frames before START so the MP4
 * does not bake in a tiny avatar-only composite.
 *
 * adaptiveStream is OFF — LiveKit pauses adaptive streams when elements are
 * briefly "invisible", which produces empty/tiny screen-share recordings.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import {
  buildEgressTiles,
  decideEgressStartSignal,
  type EgressPubSnapshot,
  type EgressTile,
} from "@/lib/live/egress-template-logic";

const FRAME_DECODE_TIMEOUT_MS = 8_000;

function queryParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name)?.trim() || "";
}

function displayName(p: RemoteParticipant): string {
  return (p.name || p.identity || "Participant").trim() || "Participant";
}

function sourceOf(pub: RemoteTrackPublication): EgressPubSnapshot["source"] {
  if (pub.source === Track.Source.ScreenShare) return "screen";
  if (pub.source === Track.Source.Camera) return "camera";
  if (pub.kind === Track.Kind.Audio) return "audio";
  return "unknown";
}

async function framesDecodedFor(pub: RemoteTrackPublication): Promise<number> {
  const vt = pub.videoTrack;
  if (!vt) return 0;
  try {
    const stats = await vt.getRTCStatsReport();
    if (!stats) return 0;
    for (const item of stats.values()) {
      const row = item as { type?: string; framesDecoded?: number };
      if (row.type === "inbound-rtp" && typeof row.framesDecoded === "number") {
        return row.framesDecoded;
      }
    }
  } catch {
    /* ignore */
  }
  return 0;
}

async function snapshotPubs(room: Room): Promise<EgressPubSnapshot[]> {
  const out: EgressPubSnapshot[] = [];
  for (const p of room.remoteParticipants.values()) {
    for (const pub of p.trackPublications.values()) {
      const kind =
        pub.kind === Track.Kind.Video
          ? "video"
          : pub.kind === Track.Kind.Audio
            ? "audio"
            : "other";
      out.push({
        identity: p.identity,
        name: displayName(p),
        source: sourceOf(pub),
        kind,
        subscribed: pub.isSubscribed,
        hasTrack: Boolean(pub.track),
        framesDecoded: kind === "video" ? await framesDecodedFor(pub) : 0,
      });
    }
  }
  return out;
}

function collectVideoTracks(room: Room): Map<string, RemoteTrack> {
  const map = new Map<string, RemoteTrack>();
  for (const p of room.remoteParticipants.values()) {
    for (const pub of p.trackPublications.values()) {
      if (
        pub.kind === Track.Kind.Video &&
        pub.isSubscribed &&
        pub.track &&
        (pub.source === Track.Source.Camera ||
          pub.source === Track.Source.ScreenShare ||
          pub.source === Track.Source.Unknown)
      ) {
        const src = sourceOf(pub);
        const key = `${p.identity}:${src}:sub`;
        map.set(key, pub.track);
      }
    }
  }
  return map;
}

/** Ensure egress subscribes to every remote video publication (esp. screen). */
function forceSubscribeVideos(room: Room): void {
  for (const p of room.remoteParticipants.values()) {
    for (const pub of p.trackPublications.values()) {
      if (pub.kind !== Track.Kind.Video) continue;
      if (
        pub.source === Track.Source.Camera ||
        pub.source === Track.Source.ScreenShare ||
        pub.source === Track.Source.Unknown
      ) {
        if (!pub.isSubscribed) {
          try {
            void pub.setSubscribed(true);
          } catch {
            /* ignore */
          }
        }
      }
    }
  }
}

function VideoTile({
  track,
  name,
  screen,
}: {
  track: RemoteTrack;
  name: string;
  screen?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    el.muted = true;
    el.playsInline = true;
    void el.play().catch(() => undefined);
    return () => {
      track.detach(el);
    };
  }, [track]);
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className={
          screen
            ? "h-full w-full object-contain bg-black"
            : "h-full w-full object-cover bg-black"
        }
      />
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">
        {screen ? `${name} · Screen` : name}
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
  const [tiles, setTiles] = useState<EgressTile[]>([]);
  const [trackMap, setTrackMap] = useState<Map<string, RemoteTrack>>(new Map());
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
    // adaptiveStream/dynacast must stay off for egress — they pause layers when
    // the headless page briefly has no "visible" video attachment.
    const room = new Room({
      adaptiveStream: false,
      dynacast: false,
    });
    roomRef.current = room;

    const refreshTiles = async () => {
      if (cancelled) return;
      forceSubscribeVideos(room);
      const pubs = await snapshotPubs(room);
      if (cancelled) return;
      setTiles(buildEgressTiles(pubs));
      setTrackMap(collectVideoTracks(room));
    };

    const signalStart = (reason: string) => {
      if (startedRef.current || cancelled) return;
      startedRef.current = true;
      console.log("START_RECORDING");
      console.log(`JIMVIO_EGRESS_START_REASON=${reason}`);
    };

    room.on(RoomEvent.TrackSubscribed, () => {
      void refreshTiles();
    });
    room.on(RoomEvent.TrackUnsubscribed, () => {
      void refreshTiles();
    });
    room.on(RoomEvent.TrackPublished, () => {
      forceSubscribeVideos(room);
      void refreshTiles();
    });
    room.on(RoomEvent.ParticipantConnected, () => {
      forceSubscribeVideos(room);
      void refreshTiles();
    });
    room.on(RoomEvent.ParticipantDisconnected, () => {
      void refreshTiles();
    });
    room.on(RoomEvent.TrackMuted, () => {
      void refreshTiles();
    });
    room.on(RoomEvent.TrackUnmuted, () => {
      void refreshTiles();
    });
    room.on(RoomEvent.Disconnected, () => {
      console.log("END_RECORDING");
    });

    void (async () => {
      try {
        await room.connect(url, token, { autoSubscribe: true });
        if (cancelled) return;
        forceSubscribeVideos(room);
        await refreshTiles();

        const startTime = Date.now();
        const interval = window.setInterval(() => {
          void (async () => {
            if (cancelled || startedRef.current) {
              window.clearInterval(interval);
              return;
            }
            if (room.state !== ConnectionState.Connected) return;
            forceSubscribeVideos(room);
            const pubs = await snapshotPubs(room);
            if (cancelled || startedRef.current) return;
            setTiles(buildEgressTiles(pubs));
            setTrackMap(collectVideoTracks(room));
            const decision = decideEgressStartSignal({
              elapsedMs: Date.now() - startTime,
              pubs,
              frameDecodeTimeoutMs: FRAME_DECODE_TIMEOUT_MS,
            });
            if (decision.shouldStart) {
              window.clearInterval(interval);
              signalStart(decision.reason);
            }
          })();
        }, 150);
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

  const screenTile = tiles.find((t) => t.kind === "video" && t.screen) ?? null;
  const otherVideos = tiles.filter(
    (t) => t.kind === "video" && !t.screen
  ) as Extract<EgressTile, { kind: "video" }>[];
  const avatars = tiles.filter((t) => t.kind === "avatar") as Extract<
    EgressTile,
    { kind: "avatar" }
  >[];
  const pip =
    otherVideos[0] ??
    (avatars[0]
      ? ({ ...avatars[0], screen: false } as const)
      : null);
  const isSpeaker = layout.startsWith("speaker") || layout.startsWith("single-speaker");

  // Screen-share dominant: full-bleed screen + PIP camera/avatar (matches Live stage).
  if (screenTile && screenTile.kind === "video") {
    const screenTrack = trackMap.get(screenTile.key);
    const pipVideo =
      pip && pip.kind === "video" ? trackMap.get(pip.key) : null;
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
        <div className="absolute inset-0">
          {screenTrack ? (
            <VideoTile track={screenTrack} name={screenTile.name} screen />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
              Waiting for screen…
            </div>
          )}
        </div>
        {pip ? (
          <div
            className="absolute bottom-4 right-4 z-10 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/20"
            style={{ width: 200, height: 112 }}
          >
            {pip.kind === "video" && pipVideo ? (
              <VideoTile track={pipVideo} name={pip.name} />
            ) : (
              <AvatarTile name={pip.name} />
            )}
          </div>
        ) : null}
      </div>
    );
  }

  const primary = tiles[0];
  const secondary = tiles.slice(1);

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
            {primary.kind === "video" && trackMap.get(primary.key) ? (
              <VideoTile
                track={trackMap.get(primary.key)!}
                name={primary.name}
                screen={primary.screen}
              />
            ) : (
              <AvatarTile name={primary.name} />
            )}
          </div>
          {secondary.length ? (
            <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
              {secondary.map((t) => (
                <div key={t.key} className="min-h-0 flex-1 overflow-hidden rounded">
                  {t.kind === "video" && trackMap.get(t.key) ? (
                    <VideoTile
                      track={trackMap.get(t.key)!}
                      name={t.name}
                      screen={t.screen}
                    />
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
              tiles.length <= 1 ? "1fr" : "1fr 1fr",
            gridTemplateRows: tiles.length > 2 ? "1fr 1fr" : "1fr",
          }}
        >
          {tiles.map((t) => (
            <div key={t.key} className="min-h-0 min-w-0 overflow-hidden rounded">
              {t.kind === "video" && trackMap.get(t.key) ? (
                <VideoTile
                  track={trackMap.get(t.key)!}
                  name={t.name}
                  screen={t.screen}
                />
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
