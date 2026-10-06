"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import { FOCUS_RING_DARK, LIVE_STAGE_FALLBACK_BG } from "./studio-ui";

/** Compact camera-off / video tile for joined Live participants (never fakes people). */
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

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${name}${isHost ? ", Host" : ""}${!micOn ? ", muted" : ""}${!camOn ? ", camera off" : ""}${speaking ? ", speaking" : ""}`}
      aria-current={selected || speaking ? "true" : undefined}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/10 bg-[#0B1220] text-left shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
        FOCUS_RING_DARK,
        compact ? "aspect-square min-w-[72px] w-[88px] sm:w-[104px]" : "aspect-[4/3] w-full min-w-0",
        (speaking || selected) && "border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30",
        isHost && "border-[#FF5A1F]/70 ring-2 ring-[#FF5A1F]/20"
      )}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 px-2",
            LIVE_STAGE_FALLBACK_BG
          )}
        >
          <HubAvatar
            name={name}
            src={avatarUrl}
            size={compact ? 40 : 56}
            className="!ring-2 !ring-white/80 shadow-sm"
          />
          {!compact ? (
            <p className="text-[10px] font-medium text-white/50">Camera off</p>
          ) : null}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 pb-1.5 pt-6">
        <div className="flex min-w-0 items-end justify-between gap-1">
          <p className="min-w-0 truncate whitespace-nowrap text-[11px] font-semibold text-white sm:text-[12px]">
            {name}
          </p>
          <span
            className={cn(
              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
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
        </div>
      </div>

      {!camOn && compact ? (
        <span
          className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70"
          aria-hidden
        >
          <VideoOff className="h-2.5 w-2.5" />
        </span>
      ) : null}
    </button>
  );
}
