"use client";

import { Mic, MicOff, Monitor, VideoOff } from "lucide-react";
import { HubAvatar } from "../hub-ui";
import { cn } from "@/lib/utils";
import { LIVE_STAGE_FALLBACK_BG } from "./studio-ui";

export function LiveStageFallback({
  hostName,
  avatarUrl,
  cameraOff = true,
  micOff = false,
  screenSharing = false,
  reconnecting = false,
  /** @deprecated Host badge removed — identity is the centered name only. */
  showHostBadge: _showHostBadge = false,
}: {
  hostName: string;
  avatarUrl?: string | null;
  cameraOff?: boolean;
  micOff?: boolean;
  screenSharing?: boolean;
  reconnecting?: boolean;
  showHostBadge?: boolean;
}) {
  const audioOnly = cameraOff && !screenSharing && !reconnecting;
  const statusLabel = reconnecting
    ? "Host reconnecting…"
    : screenSharing
      ? "Sharing screen"
      : audioOnly
        ? "Camera off"
        : "Starting stream…";

  const StatusIcon = screenSharing
    ? Monitor
    : audioOnly
      ? micOff
        ? MicOff
        : VideoOff
      : VideoOff;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex flex-col items-center justify-center px-6 text-center",
        LIVE_STAGE_FALLBACK_BG
      )}
    >
      <div className="relative mb-5">
        <div
          className={cn(
            "rounded-full",
            audioOnly && !micOff && "animate-pulse ring-4 ring-[#FF5A1F]/25"
          )}
        >
          <HubAvatar
            name={hostName}
            src={avatarUrl}
            size={140}
            className="!ring-0 shadow-[0_12px_40px_rgba(15,23,42,0.22)]"
          />
        </div>
        {micOff && audioOnly ? (
          <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#111827] shadow-sm ring-2 ring-white">
            <MicOff className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : audioOnly && !micOff ? (
          <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5A1F] text-white shadow-sm ring-2 ring-white/20">
            <Mic className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="max-w-[280px] truncate text-[17px] font-semibold tracking-[-0.02em] text-[#111827]">
        {hostName}
      </p>
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-[#64748B]">
        <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        {statusLabel}
      </p>
    </div>
  );
}
