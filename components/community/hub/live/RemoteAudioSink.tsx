"use client";

import { useEffect, useRef } from "react";

/** Invisible sink for LiveKit remote audio — no visual chrome. */
export function RemoteAudioSink({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  if (!stream) return null;

  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}
