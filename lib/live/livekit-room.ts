/**
 * LiveKit media transport — SFU only.
 * Captures stay in LiveMediaPlane (getUserMedia / getDisplayMedia);
 * this module publishes those tracks and subscribes to remotes.
 */

import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type LocalTrack,
  type RemoteParticipant,
  type Participant,
} from "livekit-client";
import type { LiveStageRole } from "@/lib/live/roles";

export type LiveKitRemoteMedia = {
  identity: string;
  name: string;
  role: LiveStageRole | "unknown";
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  speaking: boolean;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  audioStream: MediaStream | null;
};

export type LiveKitRoomSnapshot = {
  connected: boolean;
  connecting: boolean;
  connectionState: ConnectionState | "disconnected";
  roomName: string | null;
  error: string | null;
  remotes: LiveKitRemoteMedia[];
  /** Prefer screen share, else first camera among remotes / local. */
  stageStream: MediaStream | null;
  activeSpeakerId: string | null;
  /** Bumps after LiveKit auto-reconnect so publishers re-sync tracks. */
  resyncGeneration: number;
};

type Listener = (snap: LiveKitRoomSnapshot) => void;

function parseRole(metadata: string | undefined): LiveStageRole | "unknown" {
  if (!metadata) return "unknown";
  try {
    const j = JSON.parse(metadata) as { role?: string };
    const r = j.role;
    if (r === "host" || r === "cohost" || r === "speaker" || r === "moderator" || r === "viewer") {
      return r;
    }
  } catch {
    /* ignore */
  }
  return "unknown";
}

function remoteToMedia(
  p: RemoteParticipant,
  speakingIds: Set<string>,
  streamCache: Map<string, MediaStream>
): LiveKitRemoteMedia {
  let cameraStream: MediaStream | null = null;
  let screenStream: MediaStream | null = null;
  let audioStream: MediaStream | null = null;
  let camOn = false;
  let micOn = false;
  let sharing = false;

  const trackMs = (trackId: string, mediaTrack: MediaStreamTrack): MediaStream => {
    const existing = streamCache.get(trackId);
    if (existing) {
      const current = existing.getTracks()[0];
      if (current === mediaTrack) return existing;
    }
    const ms = new MediaStream([mediaTrack]);
    streamCache.set(trackId, ms);
    return ms;
  };

  p.trackPublications.forEach((pub) => {
    const track = pub.track;
    if (!track || pub.isMuted) return;
    const ms = trackMs(track.sid || `${p.identity}:${pub.trackSid}`, track.mediaStreamTrack);
    if (pub.source === Track.Source.Camera && pub.kind === Track.Kind.Video) {
      cameraStream = ms;
      camOn = true;
    } else if (pub.source === Track.Source.ScreenShare && pub.kind === Track.Kind.Video) {
      screenStream = ms;
      sharing = true;
    } else if (
      pub.kind === Track.Kind.Audio &&
      (pub.source === Track.Source.Microphone || pub.source === Track.Source.ScreenShareAudio)
    ) {
      if (!audioStream) {
        audioStream = new MediaStream([track.mediaStreamTrack]);
      } else if (!audioStream.getAudioTracks().includes(track.mediaStreamTrack)) {
        audioStream.addTrack(track.mediaStreamTrack);
      }
      if (pub.source === Track.Source.Microphone) micOn = true;
    }
  });

  return {
    identity: p.identity,
    name: p.name || p.identity.slice(0, 8),
    role: parseRole(p.metadata),
    micOn,
    camOn,
    sharing,
    speaking: speakingIds.has(p.identity),
    cameraStream,
    screenStream,
    audioStream,
  };
}

export class LiveKitRoomTransport {
  private room: Room | null = null;
  private listeners = new Set<Listener>();
  private speakingIds = new Set<string>();
  private connecting = false;
  private error: string | null = null;
  private publishedCamera: LocalTrack | null = null;
  private publishedMic: LocalTrack | null = null;
  private publishedScreen: LocalTrack | null = null;
  private publishedScreenAudio: LocalTrack | null = null;
  private disposed = false;
  private localPreview: MediaStream | null = null;
  private preferLocalStage = false;
  private resyncGeneration = 0;
  private remoteStreamCache = new Map<string, MediaStream>();
  private syncQueue: Promise<void> = Promise.resolve();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): LiveKitRoomSnapshot {
    const remotes = this.listRemotes();
    const stageFromRemote =
      remotes.find((r) => r.role === "host" && r.screenStream)?.screenStream ??
      remotes.find((r) => r.role === "cohost" && r.screenStream)?.screenStream ??
      remotes.find((r) => r.screenStream)?.screenStream ??
      remotes.find((r) => r.role === "host" && r.cameraStream)?.cameraStream ??
      remotes.find((r) => r.cameraStream)?.cameraStream ??
      null;
    const active =
      [...this.speakingIds][0] ??
      remotes.find((r) => r.sharing || r.camOn)?.identity ??
      null;

    const stageStream =
      this.preferLocalStage && this.localPreview
        ? this.localPreview
        : (stageFromRemote ?? this.localPreview);

    return {
      connected: this.room?.state === ConnectionState.Connected,
      connecting: this.connecting,
      connectionState: this.room?.state ?? "disconnected",
      roomName: this.room?.name ?? null,
      error: this.error,
      remotes,
      stageStream,
      activeSpeakerId: active,
      resyncGeneration: this.resyncGeneration,
    };
  }

  setLocalPreview(stream: MediaStream | null): void {
    if (this.localPreview === stream) return;
    this.localPreview = stream;
    this.emit();
  }

  setPreferLocalStage(prefer: boolean): void {
    if (this.preferLocalStage === prefer) return;
    this.preferLocalStage = prefer;
    this.emit();
  }

  async connect(url: string, token: string): Promise<void> {
    if (this.disposed) return;
    this.connecting = true;
    this.error = null;
    this.emit();

    await this.disconnect();

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
        videoCodec: "vp8",
      },
    });

    this.bindRoom(room);
    this.room = room;

    try {
      await room.connect(url, token, { autoSubscribe: true });
      this.connecting = false;
      this.emit();
    } catch (e) {
      this.connecting = false;
      this.error = e instanceof Error ? e.message : "LiveKit connect failed";
      this.room = null;
      this.emit();
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    await this.unpublishAll();
    if (this.room) {
      this.room.removeAllListeners();
      await this.room.disconnect(true);
      this.room = null;
    }
    this.speakingIds.clear();
    this.remoteStreamCache.clear();
    this.emit();
  }

  /**
   * Publish camera + mic tracks from an existing MediaStream (from LiveMediaPlane).
   */
  async syncLocalAv(stream: MediaStream | null, opts: { camOn: boolean; micOn: boolean }): Promise<void> {
    return this.enqueueSync(async () => {
      if (!this.room || this.room.state !== ConnectionState.Connected) return;
      const lp = this.room.localParticipant;
      let changed = false;

      const videoTrack = stream?.getVideoTracks().find((t) => t.readyState === "live") ?? null;
      const audioTrack = stream?.getAudioTracks().find((t) => t.readyState === "live") ?? null;

      if (opts.camOn && videoTrack) {
        if (!this.publishedCamera || this.publishedCamera.mediaStreamTrack !== videoTrack) {
          if (this.publishedCamera) {
            await lp.unpublishTrack(this.publishedCamera);
            this.publishedCamera = null;
          }
          const pubs = await lp.publishTrack(videoTrack, {
            source: Track.Source.Camera,
            simulcast: true,
          });
          this.publishedCamera = pubs.track ?? null;
          changed = true;
        }
      } else {
        if (this.publishedCamera) {
          await lp.unpublishTrack(this.publishedCamera);
          this.publishedCamera = null;
          changed = true;
        }
      }

      if (opts.micOn && audioTrack) {
        if (!this.publishedMic || this.publishedMic.mediaStreamTrack !== audioTrack) {
          if (this.publishedMic) {
            await lp.unpublishTrack(this.publishedMic);
            this.publishedMic = null;
          }
          const pubs = await lp.publishTrack(audioTrack, {
            source: Track.Source.Microphone,
          });
          this.publishedMic = pubs.track ?? null;
          changed = true;
        }
      } else {
        if (this.publishedMic) {
          await lp.unpublishTrack(this.publishedMic);
          this.publishedMic = null;
          changed = true;
        }
      }

      if (changed) this.emit();
    });
  }

  async syncScreenShare(stream: MediaStream | null, sharing: boolean): Promise<void> {
    return this.enqueueSync(async () => {
      if (!this.room || this.room.state !== ConnectionState.Connected) return;
      const lp = this.room.localParticipant;
      const videoTrack = stream?.getVideoTracks().find((t) => t.readyState === "live") ?? null;
      const audioTrack = stream?.getAudioTracks().find((t) => t.readyState === "live") ?? null;
      let changed = false;

      if (sharing && videoTrack) {
        if (!this.publishedScreen || this.publishedScreen.mediaStreamTrack !== videoTrack) {
          if (this.publishedScreen) {
            await lp.unpublishTrack(this.publishedScreen);
            this.publishedScreen = null;
          }
          const pubs = await lp.publishTrack(videoTrack, {
            source: Track.Source.ScreenShare,
            simulcast: true,
          });
          this.publishedScreen = pubs.track ?? null;
          changed = true;
        }
      } else if (this.publishedScreen) {
        await lp.unpublishTrack(this.publishedScreen);
        this.publishedScreen = null;
        changed = true;
      }

      if (sharing && audioTrack) {
        if (!this.publishedScreenAudio || this.publishedScreenAudio.mediaStreamTrack !== audioTrack) {
          if (this.publishedScreenAudio) {
            await lp.unpublishTrack(this.publishedScreenAudio);
            this.publishedScreenAudio = null;
          }
          const pubs = await lp.publishTrack(audioTrack, {
            source: Track.Source.ScreenShareAudio,
          });
          this.publishedScreenAudio = pubs.track ?? null;
          changed = true;
        }
      } else if (this.publishedScreenAudio) {
        await lp.unpublishTrack(this.publishedScreenAudio);
        this.publishedScreenAudio = null;
        changed = true;
      }

      if (changed) this.emit();
    });
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await this.disconnect();
    this.listeners.clear();
  }

  private enqueueSync(fn: () => Promise<void>): Promise<void> {
    const run = this.syncQueue.then(fn, fn);
    this.syncQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async unpublishAll(): Promise<void> {
    const lp = this.room?.localParticipant;
    if (!lp) {
      this.publishedCamera = null;
      this.publishedMic = null;
      this.publishedScreen = null;
      this.publishedScreenAudio = null;
      return;
    }
    try {
      if (this.publishedCamera) await lp.unpublishTrack(this.publishedCamera);
      if (this.publishedMic) await lp.unpublishTrack(this.publishedMic);
      if (this.publishedScreen) await lp.unpublishTrack(this.publishedScreen);
      if (this.publishedScreenAudio) await lp.unpublishTrack(this.publishedScreenAudio);
    } catch {
      /* ignore */
    }
    this.publishedCamera = null;
    this.publishedMic = null;
    this.publishedScreen = null;
    this.publishedScreenAudio = null;
  }

  private listRemotes(): LiveKitRemoteMedia[] {
    if (!this.room) return [];
    const out: LiveKitRemoteMedia[] = [];
    this.room.remoteParticipants.forEach((p) => {
      out.push(remoteToMedia(p, this.speakingIds, this.remoteStreamCache));
    });
    return out;
  }

  private bindRoom(room: Room): void {
    const refresh = () => this.emit();

    room.on(RoomEvent.ConnectionStateChanged, refresh);
    room.on(RoomEvent.ParticipantConnected, refresh);
    room.on(RoomEvent.ParticipantDisconnected, refresh);
    room.on(RoomEvent.TrackSubscribed, () => {
      refresh();
    });
    room.on(RoomEvent.TrackUnsubscribed, refresh);
    room.on(RoomEvent.TrackPublished, refresh);
    room.on(RoomEvent.TrackMuted, refresh);
    room.on(RoomEvent.TrackUnmuted, refresh);
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      this.speakingIds = new Set(speakers.map((s) => s.identity));
      refresh();
    });
    room.on(RoomEvent.Disconnected, () => {
      this.error = this.error ?? null;
      refresh();
    });
    room.on(RoomEvent.Reconnecting, refresh);
    room.on(RoomEvent.Reconnected, () => {
      this.resyncGeneration += 1;
      refresh();
    });
    room.on(RoomEvent.MediaDevicesError, (e: Error) => {
      this.error = e.message;
      refresh();
    });
  }

  private emit(): void {
    if (this.disposed) return;
    const snap = this.snapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}
