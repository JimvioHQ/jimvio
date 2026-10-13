"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Functional media layer only — fills existing stage bounds. */
export function StageMediaPreview({
  stream,
  cover = false,
  className,
  onFrame,
}: {
  stream: MediaStream | null;
  cover?: boolean;
  className?: string;
  onFrame?: (frame: { width: number; height: number }) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    const publish = () => {
      const width = el.videoWidth;
      const height = el.videoHeight;
      if (width >= 2 && height >= 2) onFrame?.({ width, height });
    };
    el.addEventListener("loadedmetadata", publish);
    el.addEventListener("resize", publish);
    if (stream) void el.play().catch(() => undefined);
    publish();
    return () => {
      el.removeEventListener("loadedmetadata", publish);
      el.removeEventListener("resize", publish);
    };
  }, [onFrame, stream]);

  if (!stream) return null;

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={cn(
        "absolute inset-0 z-[1] h-full w-full bg-neutral-950",
        cover ? "object-cover" : "object-contain",
        className
      )}
      aria-label="Live media preview"
    />
  );
}
