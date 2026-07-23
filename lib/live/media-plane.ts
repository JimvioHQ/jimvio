/**
 * Live Studio media plane — persistent A/V, screen share, device recovery, MediaRecorder.
 * No UI — consumed by hooks only.
 */

export type LiveMediaDevice = {
  deviceId: string;
  label: string;
  kind: "audioinput" | "videoinput";
};

export type RecordingState = "idle" | "recording" | "paused";

export type MediaPlaneSnapshot = {
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  recording: RecordingState;
  audioDevices: LiveMediaDevice[];
  videoDevices: LiveMediaDevice[];
  activeAudioId: string | null;
  activeVideoId: string | null;
  permissionDenied: { audio: boolean; video: boolean };
  lastError: string | null;
};

type Listener = (snap: MediaPlaneSnapshot) => void;

function pickVideoMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ]) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export class LiveMediaPlane {
  private camStream: MediaStream | null = null;
  private shareStream: MediaStream | null = null;
  private micEnabled = true;
  private camEnabled = false;
  private recordingState: RecordingState = "idle";
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private activeAudioId: string | null = null;
  private activeVideoId: string | null = null;
  private audioDevices: LiveMediaDevice[] = [];
  private videoDevices: LiveMediaDevice[] = [];
  private permissionDenied = { audio: false, video: false };
  private lastError: string | null = null;
  private listeners = new Set<Listener>();
  private deviceHandler: (() => void) | null = null;
  private disposed = false;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): MediaPlaneSnapshot {
    return {
      micOn: this.micEnabled && this.hasLiveAudio(),
      camOn: this.camEnabled && this.hasLiveVideo(),
      sharing: Boolean(this.shareStream?.getVideoTracks().some((t) => t.readyState === "live")),
      recording: this.recordingState,
      audioDevices: this.audioDevices,
      videoDevices: this.videoDevices,
      activeAudioId: this.activeAudioId,
      activeVideoId: this.activeVideoId,
      permissionDenied: { ...this.permissionDenied },
      lastError: this.lastError,
    };
  }

  /** Combined preview: screen share takes priority over camera; always prefer live audio. */
  getPreviewStream(): MediaStream | null {
    const video =
      this.shareStream?.getVideoTracks().find((t) => t.readyState === "live") ??
      this.camStream?.getVideoTracks().find((t) => t.readyState === "live" && this.camEnabled) ??
      null;
    const audio =
      this.camStream?.getAudioTracks().find((t) => t.readyState === "live") ??
      this.shareStream?.getAudioTracks().find((t) => t.readyState === "live") ??
      null;

    if (!video && !audio) return null;
    const out = new MediaStream();
    if (video) out.addTrack(video);
    if (audio) out.addTrack(audio);
    return out;
  }

  getCameraStream(): MediaStream | null {
    return this.camStream;
  }

  getShareStream(): MediaStream | null {
    return this.shareStream;
  }

  async init(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      this.lastError = "Media devices unavailable";
      this.emit();
      return;
    }
    await this.refreshDevices();
    if (!this.deviceHandler) {
      this.deviceHandler = () => {
        void this.onDeviceChange();
      };
      navigator.mediaDevices.addEventListener("devicechange", this.deviceHandler);
    }
  }

  async enableCamera(deviceId?: string): Promise<boolean> {
    this.lastError = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.lastError = "Camera unavailable";
      this.emit();
      return false;
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : this.activeVideoId
            ? { deviceId: { ideal: this.activeVideoId } }
            : true,
        audio: this.camStream
          ? false
          : this.activeAudioId
            ? { deviceId: { ideal: this.activeAudioId } }
            : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.permissionDenied.video = false;
      if (!this.camStream) {
        this.camStream = stream;
        const a = stream.getAudioTracks()[0];
        if (a) {
          a.enabled = this.micEnabled;
          this.activeAudioId = a.getSettings().deviceId ?? this.activeAudioId;
        }
      } else {
        this.replaceVideoTrack(stream.getVideoTracks()[0] ?? null);
        stream.getAudioTracks().forEach((t) => t.stop());
      }
      const v = this.camStream.getVideoTracks()[0];
      if (v) {
        this.activeVideoId = v.getSettings().deviceId ?? deviceId ?? this.activeVideoId;
        v.enabled = true;
      }
      this.camEnabled = true;
      await this.refreshDevices();
      this.emit();
      return true;
    } catch (err) {
      this.permissionDenied.video = true;
      this.lastError = err instanceof Error ? err.message : "Camera access denied";
      this.camEnabled = false;
      this.emit();
      return false;
    }
  }

  async ensureMicrophone(deviceId?: string): Promise<boolean> {
    this.lastError = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.lastError = "Microphone unavailable";
      this.emit();
      return false;
    }
    try {
      if (this.camStream?.getAudioTracks().some((t) => t.readyState === "live")) {
        this.permissionDenied.audio = false;
        this.setMicEnabled(true);
        return true;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId
          ? { deviceId: { exact: deviceId } }
          : this.activeAudioId
            ? { deviceId: { ideal: this.activeAudioId } }
            : true,
        video: false,
      });
      this.permissionDenied.audio = false;
      const track = stream.getAudioTracks()[0];
      if (!track) return false;
      track.enabled = true;
      this.micEnabled = true;
      this.activeAudioId = track.getSettings().deviceId ?? deviceId ?? this.activeAudioId;
      if (!this.camStream) {
        this.camStream = stream;
      } else {
        this.camStream.getAudioTracks().forEach((t) => {
          this.camStream?.removeTrack(t);
          t.stop();
        });
        this.camStream.addTrack(track);
      }
      await this.refreshDevices();
      this.emit();
      return true;
    } catch (err) {
      this.permissionDenied.audio = true;
      this.lastError = err instanceof Error ? err.message : "Microphone access denied";
      this.emit();
      return false;
    }
  }

  async disableCamera(): Promise<void> {
    this.camEnabled = false;
    if (this.camStream) {
      this.camStream.getVideoTracks().forEach((t) => {
        t.stop();
        this.camStream?.removeTrack(t);
      });
    }
    this.emit();
  }

  setMicEnabled(on: boolean): void {
    this.micEnabled = on;
    this.camStream?.getAudioTracks().forEach((t) => {
      t.enabled = on;
    });
    this.emit();
  }

  async toggleMic(): Promise<boolean> {
    if (this.micEnabled && this.hasLiveAudio()) {
      this.setMicEnabled(false);
      return false;
    }
    const ok = await this.ensureMicrophone();
    if (ok) this.setMicEnabled(true);
    return ok;
  }

  async toggleCamera(): Promise<boolean> {
    if (this.camEnabled && this.hasLiveVideo()) {
      await this.disableCamera();
      return false;
    }
    return this.enableCamera();
  }

  async switchCamera(deviceId: string): Promise<boolean> {
    return this.enableCamera(deviceId);
  }

  async switchMicrophone(deviceId: string): Promise<boolean> {
    const wasOn = this.micEnabled;
    const ok = await this.ensureMicrophone(deviceId);
    if (ok) this.setMicEnabled(wasOn);
    return ok;
  }

  async startScreenShare(options?: {
    target?: "entire_screen" | "window" | "browser_tab";
    quality?: "standard" | "high";
  }): Promise<boolean> {
    this.lastError = null;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.lastError = "Screen share unavailable";
      this.emit();
      return false;
    }
    try {
      const surface =
        options?.target === "browser_tab"
          ? "browser"
          : options?.target === "window"
            ? "window"
            : "monitor";
      const high = options?.quality !== "standard";
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: surface,
          width: { ideal: high ? 1920 : 1280 },
          height: { ideal: high ? 1080 : 720 },
          frameRate: { ideal: high ? 30 : 24 },
        } as MediaTrackConstraints,
        audio: true,
      });
      this.stopShareTracks();
      this.shareStream = stream;
      const vt = stream.getVideoTracks()[0];
      if (vt) {
        vt.addEventListener("ended", () => {
          this.stopScreenShare();
        });
      }
      this.emit();
      return true;
    } catch (err) {
      // User cancelled picker — not a hard error
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "AbortError") {
        this.lastError = null;
      } else {
        this.lastError = err instanceof Error ? err.message : "Screen share failed";
      }
      this.emit();
      return false;
    }
  }

  /** Re-open the display picker to switch window/monitor/tab. */
  async switchScreenShare(): Promise<boolean> {
    return this.startScreenShare();
  }

  stopScreenShare(): void {
    this.stopShareTracks();
    this.emit();
  }

  async startRecording(): Promise<boolean> {
    this.lastError = null;
    if (typeof MediaRecorder === "undefined") {
      this.lastError = "Recording unavailable";
      this.emit();
      return false;
    }
    const stream = this.buildRecordStream();
    if (!stream || stream.getTracks().length === 0) {
      this.lastError = "Nothing to record — enable camera, mic, or screen share";
      this.emit();
      return false;
    }
    try {
      this.chunks = [];
      const mime = pickVideoMime();
      this.recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      this.recorder.start(1000);
      this.recordingState = "recording";
      this.emit();
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Recording failed";
      this.recordingState = "idle";
      this.emit();
      return false;
    }
  }

  pauseRecording(): void {
    if (this.recorder?.state === "recording") {
      this.recorder.pause();
      this.recordingState = "paused";
      this.emit();
    }
  }

  resumeRecording(): void {
    if (this.recorder?.state === "paused") {
      this.recorder.resume();
      this.recordingState = "recording";
      this.emit();
    }
  }

  async stopRecording(): Promise<Blob | null> {
    const rec = this.recorder;
    if (!rec || this.recordingState === "idle") {
      this.recordingState = "idle";
      this.emit();
      return null;
    }
    const blob = await new Promise<Blob | null>((resolve) => {
      rec.onstop = () => {
        const type = rec.mimeType || "video/webm";
        resolve(this.chunks.length ? new Blob(this.chunks, { type }) : null);
      };
      try {
        if (rec.state !== "inactive") rec.stop();
        else resolve(null);
      } catch {
        resolve(null);
      }
    });
    this.recorder = null;
    this.chunks = [];
    this.recordingState = "idle";
    this.emit();
    return blob;
  }

  downloadRecording(blob: Blob, filename = `jimvio-live-${Date.now()}.webm`): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Hook for upload pipelines — returns the blob for the caller to POST. */
  async finalizeRecordingForUpload(): Promise<Blob | null> {
    return this.stopRecording();
  }

  async recover(): Promise<void> {
    const wantCam = this.camEnabled;
    const wantMic = this.micEnabled;
    const audioId = this.activeAudioId;
    const videoId = this.activeVideoId;
    if (wantCam) await this.enableCamera(videoId ?? undefined);
    else if (wantMic) await this.ensureMicrophone(audioId ?? undefined);
    if (this.shareStream) {
      const live = this.shareStream.getVideoTracks().some((t) => t.readyState === "live");
      if (!live) this.stopScreenShare();
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.deviceHandler && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener("devicechange", this.deviceHandler);
      this.deviceHandler = null;
    }
    void this.stopRecording();
    this.stopShareTracks();
    this.camStream?.getTracks().forEach((t) => t.stop());
    this.camStream = null;
    this.listeners.clear();
  }

  private async onDeviceChange(): Promise<void> {
    if (this.disposed) return;
    await this.refreshDevices();
    const audioAlive = this.camStream?.getAudioTracks().some((t) => t.readyState === "live");
    const videoAlive = this.camStream?.getVideoTracks().some((t) => t.readyState === "live");
    if (this.micEnabled && !audioAlive) {
      await this.ensureMicrophone(this.activeAudioId ?? undefined);
    }
    if (this.camEnabled && !videoAlive) {
      await this.enableCamera(this.activeVideoId ?? undefined);
    }
    this.emit();
  }

  private async refreshDevices(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      this.audioDevices = all
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 4)}`,
          kind: "audioinput" as const,
        }));
      this.videoDevices = all
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 4)}`,
          kind: "videoinput" as const,
        }));
    } catch {
      /* ignore */
    }
  }

  private replaceVideoTrack(track: MediaStreamTrack | null): void {
    if (!this.camStream) return;
    this.camStream.getVideoTracks().forEach((t) => {
      this.camStream?.removeTrack(t);
      t.stop();
    });
    if (track) this.camStream.addTrack(track);
  }

  private stopShareTracks(): void {
    this.shareStream?.getTracks().forEach((t) => t.stop());
    this.shareStream = null;
  }

  private hasLiveAudio(): boolean {
    return Boolean(this.camStream?.getAudioTracks().some((t) => t.readyState === "live" && t.enabled));
  }

  private hasLiveVideo(): boolean {
    return Boolean(this.camStream?.getVideoTracks().some((t) => t.readyState === "live" && t.enabled));
  }

  private buildRecordStream(): MediaStream | null {
    const preview = this.getPreviewStream();
    if (preview) return preview;
    if (this.camStream) return this.camStream;
    return this.shareStream;
  }

  private emit(): void {
    if (this.disposed) return;
    const snap = this.snapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}
