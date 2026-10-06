"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import { FOCUS_RING_DARK, LIVE_STAGE_FALLBACK_BG } from "./studio-ui";

/**
 * Compact circular participant tile.
 * Camera on → LiveKit video (circular clip). Camera off → real circular avatar.
 * Never uses square/rectangular avatar frames.
 */
export function LiveParticipantTile({
  name,
  avatarUrl,
  stream,
  camOn,
  micOn,
  speaking,
  isHost,
  selected,
  onSelect,
  compact = false,
}: {
  name: string;
  avatarUrl?: string | null;
  stream?: MediaStream | null;
  camOn: boolean;
  micOn: boolean;
  speaking?: boolean;
  isHost?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = Boolean(camOn && stream);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = showVideo ? stream ?? null : null;
    if (showVideo) void el.play().catch(() => undefined);
  }, [showVideo, stream]);

  const sizeClass = compact
    ? "h-[72px] w-[72px] sm:h-[84px] sm:w-[84px]"
    : "h-[112px] w-[112px] sm:h-[128px] sm:w-[128px]";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${name}${isHost ? ", Host" : ""}${!micOn ? ", muted" : ""}${!camOn ? ", camera off" : ""}${speaking ? ", speaking" : ""}`}
      aria-current={selected || speaking ? "true" : undefined}
      className={cn(
        "group flex w-[88px] flex-col items-center gap-1.5 text-center sm:w-[104px]",
        FOCUS_RING_DARK,
        "rounded-2xl p-1"
      )}
    >
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full aspect-square",
          sizeClass,
          LIVE_STAGE_FALLBACK_BG,
          "ring-2 ring-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
          (speaking || selected) && "ring-[#FF5A1F] ring-offset-2 ring-offset-[#0B1220]",
          isHost && "ring-[#FF5A1F]/80"
        )}
      >
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full rounded-full object-cover"
            aria-hidden
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <HubAvatar
              name={name}
              src={avatarUrl}
              size={compact ? 56 : 80}
              className="!ring-0 [&>img]:!ring-0 [&>div]:!ring-0"
            />
          </span>
        )}

        <span
          className={cn(
            "absolute bottom-0.5 right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 shadow-sm",
            micOn ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          )}
          aria-hidden
        >
          {micOn ? (
            <Mic className="h-2.5 w-2.5" strokeWidth={2.2} />
          ) : (
            <MicOff className="h-2.5 w-2.5" strokeWidth={2.2} />
          )}
        </span>

        {!camOn ? (
          <span
            className="absolute left-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/80"
            aria-hidden
          >
            <VideoOff className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </span>

      <span className="flex min-w-0 flex-col items-center gap-0.5 px-0.5">
        <span className="w-full truncate text-[11px] font-semibold leading-tight text-white/95 sm:text-[12px]">
          {name}
        </span>
        <span className="truncate text-[9px] font-medium uppercase tracking-[0.06em] text-white/45">
          {!micOn ? "Muted" : speaking ? "Speaking" : "Mic on"}
          {" · "}
          {camOn ? "Cam on" : "Cam off"}
        </span>
      </span>
    </button>
  );
}
