"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  Film,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoProgressBar({
  current,
  duration,
  buffered,
  onSeek,
}: {
  current: number;
  duration: number;
  buffered: number;
  onSeek: (ratio: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || duration <= 0) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(ratio);
    },
    [duration, onSeek],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      seekFromClientX(clientX);
    };
    const onUp = () => setDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, seekFromClientX]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const bufferPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Video progress"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={current}
      tabIndex={0}
      className="group/progress relative h-5 flex-1 cursor-pointer touch-none py-1.5"
      onMouseDown={(e) => {
        e.stopPropagation();
        setDragging(true);
        seekFromClientX(e.clientX);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        setDragging(true);
        seekFromClientX(e.touches[0].clientX);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (duration <= 0) return;
        const step = e.shiftKey ? 10 : 5;
        if (e.key === "ArrowRight") onSeek(Math.min(1, (current + step) / duration));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, (current - step) / duration));
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/15">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/25"
          style={{ width: `${bufferPct}%` }}
        />
        <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-transform",
          dragging || "group-hover/progress:scale-110",
        )}
        style={{ left: `${progress}%` }}
      />
    </div>
  );
}

function CustomVideoControls({
  playing,
  muted,
  volume,
  current,
  duration,
  buffered,
  isFullscreen,
  productName,
  visible,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onSeek,
  onToggleFullscreen,
}: {
  playing: boolean;
  muted: boolean;
  volume: number;
  current: number;
  duration: number;
  buffered: number;
  isFullscreen: boolean;
  productName: string;
  visible: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  onSeek: (ratio: number) => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-[5] px-3 pb-3 pt-10 transition-opacity duration-300 sm:px-4 sm:pb-4",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      <div className="relative space-y-2">
        <VideoProgressBar
          current={current}
          duration={duration}
          buffered={buffered}
          onSeek={onSeek}
        />

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-[#fd5000] hover:ring-[#fd5000]/40"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-white" />
            )}
          </button>

          <div className="group/vol relative flex items-center">
            <button
              type="button"
              onClick={onToggleMute}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/20"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <div className="ml-0 hidden w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/vol:ml-2 group-hover/vol:w-20 group-hover/vol:opacity-100 sm:block">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[#fd5000] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                aria-label="Volume"
              />
            </div>
          </div>

          <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/75 sm:text-[11px]">
            {formatTime(current)}
            <span className="text-white/35"> / </span>
            {formatTime(duration)}
          </span>

          <p className="hidden min-w-0 flex-1 truncate text-[11px] font-medium text-white/55 lg:block">
            {productName}
          </p>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/20"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export type ProductVideoPlayerProps = {
  src: string | null;
  embedSrc: string | null;
  poster?: string;
  productName: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  needsTap: boolean;
  onLoaded: () => void;
  onError: () => void;
  onPlayRequest: () => void;
};

export function ProductVideoPlayer({
  src,
  embedSrc,
  poster,
  productName,
  videoRef,
  needsTap,
  onLoaded,
  onError,
  onPlayRequest,
}: ProductVideoPlayerProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.85);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChrome, setShowChrome] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revealChrome = useCallback(() => {
    setShowChrome(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowChrome(false);
      }
    }, 3200);
  }, [videoRef]);

  useEffect(() => {
    revealChrome();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [revealChrome]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const syncFromVideo = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    setCurrent(el.currentTime);
    setDuration(el.duration || 0);
    setPlaying(!el.paused);
    setMuted(el.muted);
    if (el.buffered.length > 0) {
      setBuffered(el.buffered.end(el.buffered.length - 1));
    }
  }, [videoRef]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = volume;

    const onTimeUpdate = () => {
      setCurrent(el.currentTime);
      if (el.buffered.length > 0) {
        setBuffered(el.buffered.end(el.buffered.length - 1));
      }
    };
    const onDurationChange = () => setDuration(el.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      revealChrome();
    };
    const onPause = () => {
      setPlaying(false);
      setShowChrome(true);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("loadedmetadata", onDurationChange);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("loadedmetadata", onDurationChange);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [videoRef, src, volume, revealChrome]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true)).catch(() => onPlayRequest());
    } else {
      el.pause();
      setPlaying(false);
    }
    revealChrome();
  }, [videoRef, onPlayRequest, revealChrome]);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    if (!el.muted && el.volume === 0) {
      el.volume = volume || 0.85;
    }
    setMuted(el.muted);
    revealChrome();
  }, [videoRef, volume, revealChrome]);

  const changeVolume = useCallback(
    (v: number) => {
      const el = videoRef.current;
      if (!el) return;
      const next = Math.min(1, Math.max(0, v));
      el.volume = next;
      el.muted = next === 0;
      setVolume(next);
      setMuted(el.muted);
      revealChrome();
    },
    [videoRef, revealChrome],
  );

  const seekToRatio = useCallback(
    (ratio: number) => {
      const el = videoRef.current;
      if (!el || !Number.isFinite(el.duration)) return;
      el.currentTime = ratio * el.duration;
      setCurrent(el.currentTime);
      revealChrome();
    },
    [videoRef, revealChrome],
  );

  const toggleFullscreen = useCallback(async () => {
    const node = shellRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      /* unsupported */
    }
    revealChrome();
  }, [revealChrome]);

  const frameBadge = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md ring-1 ring-white/15">
      <Film className="h-3 w-3 text-[#fd5000]" strokeWidth={2.25} />
      Product video
    </span>
  );

  if (embedSrc) {
    return (
      <div
        className="absolute inset-0 z-[1] overflow-hidden bg-[var(--color-bg-darker,#0a1410)]"
        onMouseMove={revealChrome}
        onTouchStart={revealChrome}
      >
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
            aria-hidden
          />
        )}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(253,80,0,0.08) 0%, transparent 55%)" }} />
        <div className="absolute inset-3 flex flex-col sm:inset-4">
          <div
            className={cn(
              "mb-2 transition-opacity duration-300",
              showChrome ? "opacity-100" : "opacity-0",
            )}
          >
            {frameBadge}
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl ring-1 ring-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.65)]">
            <iframe
              key={embedSrc}
              src={`${embedSrc}?autoplay=1&mute=1&loop=1&controls=1&playsinline=1&modestbranding=1`}
              title={`${productName} video`}
              className="absolute inset-0 h-full w-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={onLoaded}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!src) return null;

  const showCenterPlay = needsTap || !playing;

  return (
    <div
      className="absolute inset-0 z-[1] overflow-hidden bg-[var(--color-bg-darker,#0a1410)]"
      onMouseMove={revealChrome}
      onTouchStart={revealChrome}
    >
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
          aria-hidden
        />
      )}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(253,80,0,0.10) 0%, transparent 60%)" }} />

      <div className="absolute inset-[10px] flex items-center justify-center sm:inset-4">
        <div
          ref={shellRef}
          className="relative flex h-full w-full max-w-full items-center justify-center bg-[var(--color-bg-darker,#0a1410)]"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#fd5000]/20 via-transparent to-white/5 p-px">
            <div className="h-full w-full rounded-2xl bg-[var(--color-bg-darker,#0a1410)]/80" />
          </div>

          <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-[0_20px_56px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
            <video
              ref={videoRef}
              key={src}
              src={src}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              controls={false}
              className="h-full w-full cursor-pointer bg-black object-contain"
              onLoadedData={() => {
                syncFromVideo();
                onLoaded();
              }}
              onError={onError}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent" />

            <div
              className={cn(
                "absolute left-3 top-3 z-[2] transition-opacity duration-300 sm:left-4 sm:top-4",
                showChrome || showCenterPlay ? "opacity-100" : "opacity-0",
              )}
            >
              {frameBadge}
            </div>

            {showCenterPlay && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (needsTap) onPlayRequest();
                  else togglePlay();
                }}
                className="absolute inset-0 z-[3] flex items-center justify-center bg-black/20"
                aria-label="Play product video"
              >
                <span className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-gradient-to-br from-[#fd5000] to-[#ff7a33] shadow-[0_12px_40px_rgba(253,80,0,0.45)] ring-4 ring-white/20 transition-transform hover:scale-105 active:scale-95">
                  {!needsTap && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#fd5000]/20" />
                  )}
                  <Play className="relative ml-1 h-7 w-7 fill-white text-white" />
                </span>
              </button>
            )}

            <CustomVideoControls
              playing={playing}
              muted={muted}
              volume={volume}
              current={current}
              duration={duration}
              buffered={buffered}
              isFullscreen={isFullscreen}
              productName={productName}
              visible={showChrome || showCenterPlay}
              onTogglePlay={togglePlay}
              onToggleMute={toggleMute}
              onVolumeChange={changeVolume}
              onSeek={seekToRatio}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
