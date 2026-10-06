"use client";

import { Crown, Mic, MicOff, Monitor, VideoOff } from "lucide-react";
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
  showHostBadge = true,
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
        ? micOff
          ? "Camera off · Muted"
          : "Audio active"
        : "Starting stream…";

  const StatusIcon = screenSharing
    ? Monitor
    : audioOnly
      ? micOff
        ? MicOff
        : Mic
      : VideoOff;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex flex-col items-center justify-center px-6 text-center",
        LIVE_STAGE_FALLBACK_BG
      )}
    >
      <div className="relative mb-4">
        <div
          className={cn(
            "rounded-full",
            audioOnly && !micOff && "animate-pulse ring-4 ring-[#FF5A1F]/30"
          )}
        >
          <HubAvatar
            name={hostName}
            src={avatarUrl}
            size={112}
            className="!ring-4 !ring-white shadow-sm"
          />
        </div>
        {micOff ? (
          <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#111827] shadow-sm ring-2 ring-[#E5E7EB]">
            <MicOff className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : audioOnly ? (
          <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5A1F] text-white shadow-sm ring-2 ring-white">
            <Mic className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      {showHostBadge ? (
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FF5A1F]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
          <Crown className="h-3 w-3" aria-hidden />
          Host
        </span>
      ) : null}
      <p className="text-[16px] font-semibold text-[#111827]">{hostName}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-[#64748B]">
        <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        {statusLabel}
      </p>
    </div>
  );
}
