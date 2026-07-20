"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveMediaPlane, type MediaPlaneSnapshot, type RecordingState } from "@/lib/live/media-plane";

const INITIAL: MediaPlaneSnapshot = {
  micOn: false,
  camOn: false,
  sharing: false,
  recording: "idle",
  audioDevices: [],
  videoDevices: [],
  activeAudioId: null,
  activeVideoId: null,
  permissionDenied: { audio: false, video: false },
  lastError: null,
};

export function useLiveMediaPlane(enabled = true) {
  const planeRef = useRef<LiveMediaPlane | null>(null);
  const [snap, setSnap] = useState<MediaPlaneSnapshot>(INITIAL);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [shareStream, setShareStream] = useState<MediaStream | null>(null);
  const onlineRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    const plane = new LiveMediaPlane();
    planeRef.current = plane;
    void plane.init();
    const unsub = plane.subscribe((s) => {
      setSnap(s);
      setPreviewStream(plane.getPreviewStream());
      setCameraStream(plane.getCameraStream());
      setShareStream(plane.getShareStream());
    });
    return () => {
      unsub();
      plane.dispose();
      planeRef.current = null;
    };
  }, [enabled]);

  /* Network: pause tracks offline, recover on reconnect */
  useEffect(() => {
    if (!enabled) return;
    const onOffline = () => {
      onlineRef.current = false;
    };
    const onOnline = () => {
      onlineRef.current = true;
      void planeRef.current?.recover();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled]);

  const toggleMic = useCallback(async () => {
    return (await planeRef.current?.toggleMic()) ?? false;
  }, []);

  const toggleCamera = useCallback(async () => {
    return (await planeRef.current?.toggleCamera()) ?? false;
  }, []);

  const switchCamera = useCallback(async (deviceId: string) => {
    return (await planeRef.current?.switchCamera(deviceId)) ?? false;
  }, []);

  const switchMicrophone = useCallback(async (deviceId: string) => {
    return (await planeRef.current?.switchMicrophone(deviceId)) ?? false;
  }, []);

  const startScreenShare = useCallback(async () => {
    return (await planeRef.current?.startScreenShare()) ?? false;
  }, []);

  const stopScreenShare = useCallback(() => {
    planeRef.current?.stopScreenShare();
  }, []);

  const switchScreenShare = useCallback(async () => {
    return (await planeRef.current?.switchScreenShare()) ?? false;
  }, []);

  const startRecording = useCallback(async () => {
    return (await planeRef.current?.startRecording()) ?? false;
  }, []);

  const pauseRecording = useCallback(() => {
    planeRef.current?.pauseRecording();
  }, []);

  const resumeRecording = useCallback(() => {
    planeRef.current?.resumeRecording();
  }, []);

  const stopRecording = useCallback(async (opts?: { download?: boolean; filename?: string }) => {
    const blob = await planeRef.current?.stopRecording();
    if (blob && opts?.download !== false) {
      planeRef.current?.downloadRecording(blob, opts?.filename);
    }
    return blob ?? null;
  }, []);

  const recover = useCallback(async () => {
    await planeRef.current?.recover();
  }, []);

  return {
    ...snap,
    recordingState: snap.recording as RecordingState,
    previewStream,
    cameraStream,
    shareStream,
    toggleMic,
    toggleCamera,
    switchCamera,
    switchMicrophone,
    startScreenShare,
    stopScreenShare,
    switchScreenShare,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    recover,
    plane: planeRef,
  };
}
