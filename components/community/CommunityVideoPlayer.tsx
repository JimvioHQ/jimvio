"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toPlayableCommunityVideoUrl } from "@/lib/community-chat-upload";
import { cn } from "@/lib/utils";

type CommunityVideoPlayerProps = {
  src: string;
  poster?: string | null;
  className?: string;
  /** Compact preview (composer thumbnails) */
  compact?: boolean;
};

/**
 * Reliable community video playback — progressive MP4, mobile-safe, seekable.
 */
export function CommunityVideoPlayer({
  src,
  poster,
  className,
  compact = false,
}: CommunityVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);

  const sources = useMemo(() => {
    const playable = toPlayableCommunityVideoUrl(src);
    const unique = Array.from(new Set([playable, src].filter(Boolean)));
    return unique;
  }, [src]);

  const activeSrc = sources[Math.min(attempt, sources.length - 1)] ?? src;

  const onError = useCallback(() => {
    setAttempt((a) => (a + 1 < sources.length ? a + 1 : a));
  }, [sources.length]);

  if (compact) {
    return (
      <video
        ref={videoRef}
        src={activeSrc}
        className={cn("h-full w-full object-cover", className)}
        muted
        playsInline
        preload="metadata"
        onError={onError}
      />
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-black", className)}>
      <video
        ref={videoRef}
        key={activeSrc}
        src={activeSrc}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        className="max-h-96 w-full bg-black"
        onError={onError}
      >
        <source src={activeSrc} type="video/mp4" />
      </video>
    </div>
  );
}
