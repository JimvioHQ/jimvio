"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Play } from "lucide-react";
import { toPlayableCommunityVideoUrl } from "@/lib/community-chat-upload";
import {
  CommunityFeedVideoEngine,
  FEED_VIDEO_NEAR_MARGIN,
  FEED_VIDEO_VISIBILITY_THRESHOLDS,
} from "@/lib/community/feed-video-engine";
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
 * Feed mode: viewport autoplay (muted), single active video, hover/tap audio.
 */
export function CommunityVideoPlayer({
  src,
  poster,
  className,
  compact = false,
}: CommunityVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const unmutedRef = useRef(false);
  const reactId = useId();
  const videoId = useMemo(() => `cv-${reactId.replace(/:/g, "")}`, [reactId]);

  const [attempt, setAttempt] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [unmuted, setUnmuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [preload, setPreload] = useState<"none" | "metadata" | "auto">("none");
  const [srcReady, setSrcReady] = useState(false);

  const sources = useMemo(() => {
    const playable = toPlayableCommunityVideoUrl(src);
    return Array.from(new Set([playable, src].filter(Boolean)));
  }, [src]);

  const activeSrc = sources[Math.min(attempt, sources.length - 1)] ?? src;

  const onError = useCallback(() => {
    setAttempt((a) => (a + 1 < sources.length ? a + 1 : a));
  }, [sources.length]);

  const tryPlay = useCallback(async (muted: boolean) => {
    const video = videoRef.current;
    if (!video) return false;
    video.muted = muted;
    try {
      await video.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
      return true;
    } catch {
      setIsPlaying(false);
      setAutoplayBlocked(true);
      return false;
    }
  }, []);

  useEffect(() => {
    unmutedRef.current = unmuted;
  }, [unmuted]);

  useEffect(() => {
    if (compact) return;

    const engine = CommunityFeedVideoEngine.getInstance();

    const handleActivate = () => {
      const audioOn =
        engine.hasUnlockedAudio(videoId) || unmutedRef.current;
      void tryPlay(!audioOn).then((ok) => {
        if (ok && audioOn) {
          setUnmuted(true);
          setShowControls(true);
        }
      });
    };

    const handleDeactivate = () => {
      const video = videoRef.current;
      if (video) video.pause();
      setIsPlaying(false);
      if (!engine.hasUnlockedAudio(videoId)) {
        setUnmuted(false);
        unmutedRef.current = false;
        setShowControls(false);
        if (video) video.muted = true;
      }
    };

    engine.register(videoId, {
      onActivate: handleActivate,
      onDeactivate: handleDeactivate,
      onNear: (near) => {
        setPreload(near ? "metadata" : "none");
        setSrcReady(near);
      },
    });

    return () => engine.unregister(videoId);
  }, [compact, videoId, tryPlay]);

  useEffect(() => {
    if (compact) return;
    const el = containerRef.current;
    if (!el) return;

    const engine = CommunityFeedVideoEngine.getInstance();

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        engine.updateVisibility(videoId, entry?.intersectionRatio ?? 0);
      },
      { threshold: FEED_VIDEO_VISIBILITY_THRESHOLDS, rootMargin: "0px" }
    );

    const nearObserver = new IntersectionObserver(
      ([entry]) => {
        engine.updateNear(videoId, Boolean(entry?.isIntersecting));
      },
      { rootMargin: FEED_VIDEO_NEAR_MARGIN, threshold: 0 }
    );

    visibilityObserver.observe(el);
    nearObserver.observe(el);

    return () => {
      visibilityObserver.disconnect();
      nearObserver.disconnect();
      engine.updateVisibility(videoId, 0);
      engine.updateNear(videoId, false);
    };
  }, [compact, videoId]);

  const unlockAudio = useCallback(() => {
    const engine = CommunityFeedVideoEngine.getInstance();
    engine.unlockAudio(videoId);
    unmutedRef.current = true;
    setUnmuted(true);
    setShowControls(true);
    setAutoplayBlocked(false);
    void tryPlay(false);
  }, [tryPlay, videoId]);

  const onMouseEnter = useCallback(() => {
    if (compact) return;
    const engine = CommunityFeedVideoEngine.getInstance();
    if (!engine.desktop) return;
    engine.setHovered(videoId, true);
  }, [compact, videoId]);

  const onMouseLeave = useCallback(() => {
    if (compact) return;
    CommunityFeedVideoEngine.getInstance().setHovered(videoId, false);
  }, [compact, videoId]);

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (compact) return;
      const engine = CommunityFeedVideoEngine.getInstance();
      if (engine.desktop) {
        e.preventDefault();
        unlockAudio();
      }
    },
    [compact, unlockAudio]
  );

  const onTouchStart = useCallback(() => {
    if (compact) return;
    CommunityFeedVideoEngine.getInstance().setTouched(videoId, true);
  }, [compact, videoId]);

  const onTouchEnd = useCallback(() => {
    if (compact) return;
    CommunityFeedVideoEngine.getInstance().setTouched(videoId, false);
  }, [compact, videoId]);

  const onTapUnlock = useCallback(
    (e: MouseEvent | PointerEvent) => {
      if (compact) return;
      const engine = CommunityFeedVideoEngine.getInstance();
      if (engine.desktop) return;
      e.preventDefault();
      unlockAudio();
    },
    [compact, unlockAudio]
  );

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

  const showPosterFallback = autoplayBlocked && !isPlaying;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-black",
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <video
        ref={videoRef}
        key={activeSrc}
        src={srcReady ? activeSrc : undefined}
        poster={poster ?? undefined}
        controls={showControls}
        playsInline
        muted={!unmuted}
        loop
        preload={preload}
        controlsList="nodownload"
        className="aspect-video max-h-96 w-full bg-black object-contain"
        onError={onError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        {srcReady ? <source src={activeSrc} type="video/mp4" /> : null}
      </video>

      {showPosterFallback ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            unlockAudio();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/35"
          aria-label="Play video"
          style={
            poster
              ? {
                  backgroundImage: `url(${poster})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[#111827] shadow-lg">
            <Play className="h-6 w-6 fill-current pl-0.5" />
          </span>
        </button>
      ) : null}

      {!showControls && isPlaying && !unmuted ? (
        <button
          type="button"
          onClick={onTapUnlock}
          className="absolute bottom-3 right-3 z-10 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
          aria-label="Unmute video"
        >
          Tap for sound
        </button>
      ) : null}
    </div>
  );
}
