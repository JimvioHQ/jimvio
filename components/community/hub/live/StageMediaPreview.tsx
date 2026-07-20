"use client";

import { useEffect, useRef } from "react";

/** Functional media layer only — fills existing stage bounds, no chrome changes. */
export function StageMediaPreview({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 z-[1] h-full w-full object-contain bg-neutral-950"
      aria-label="Live media preview"
    />
  );
}
