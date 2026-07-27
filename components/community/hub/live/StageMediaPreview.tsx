"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Functional media layer only — fills existing stage bounds. */
export function StageMediaPreview({
  stream,
  cover = false,
  className,
}: {
  stream: MediaStream | null;
  cover?: boolean;
  className?: string;
}) {
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
      className={cn(
        "absolute inset-0 z-[1] h-full w-full bg-neutral-950",
        cover ? "object-cover" : "object-contain",
        className
      )}
      aria-label="Live media preview"
    />
  );
}
