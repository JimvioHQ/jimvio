"use client";

import { useEffect, useRef } from "react";
import { Crown, Mic, MicOff, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import { FOCUS_RING, LIVE_STAGE_FALLBACK_BG } from "./studio-ui";

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
        "group relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-left shadow-[0_4px_16px_rgba(15,23,42,0.05)]",
        FOCUS_RING,
        compact ? "aspect-square min-w-[72px] w-[88px] sm:w-[104px]" : "aspect-[4/3] w-full min-w-0",
        (speaking || selected) && "border-[#FF5A1F] ring-2 ring-[#FF5A1F]/25",
        isHost && "border-[#FF5A1F] ring-2 ring-[#FF5A1F]/20"
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
            className="!ring-2 !ring-white shadow-sm"
          />
          {!compact ? (
            <p className="text-[10px] font-medium text-[#64748B]">Camera off</p>
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-6",
          showVideo
            ? "bg-gradient-to-t from-black/70 via-black/25 to-transparent"
            : "bg-gradient-to-t from-white/95 via-white/70 to-transparent"
        )}
      >
        <div className="flex items-end justify-between gap-1">
          <div className="min-w-0">
            {isHost ? (
              <span className="mb-0.5 inline-flex items-center gap-0.5 rounded-md bg-[#FF5A1F]/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                <Crown className="h-2.5 w-2.5" aria-hidden />
                Host
              </span>
            ) : null}
            <p
              className={cn(
                "truncate text-[11px] font-semibold sm:text-[12px]",
                showVideo ? "text-white" : "text-[#111827]"
              )}
            >
              {name}
            </p>
          </div>
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
          className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#64748B] shadow-sm"
          aria-hidden
        >
          <VideoOff className="h-2.5 w-2.5" />
        </span>
      ) : null}
    </button>
  );
}
