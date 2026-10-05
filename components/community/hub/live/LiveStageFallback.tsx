"use client";

import { Crown, Mic, MicOff, Monitor, VideoOff } from "lucide-react";
import { HubAvatar } from "../hub-ui";
import { cn } from "@/lib/utils";

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
    <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_40%,#1a1a1a_0%,#050505_72%)] px-6 text-center">
      <div className="relative mb-4">
        <div
          className={cn(
            "rounded-full",
            audioOnly && !micOff && "animate-pulse ring-4 ring-[#FF5A1F]/35"
          )}
        >
          <HubAvatar name={hostName} src={avatarUrl} size={112} className="!ring-4 !ring-white/10" />
        </div>
        {micOff ? (
          <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white ring-2 ring-neutral-900">
            <MicOff className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : audioOnly ? (
          <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5A1F] text-white ring-2 ring-neutral-900">
            <Mic className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      {showHostBadge ? (
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FF5A1F]/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
          <Crown className="h-3 w-3" aria-hidden />
          Host
        </span>
      ) : null}
      <p className="text-[16px] font-semibold text-white/90">{hostName}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-white/45">
        <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        {statusLabel}
      </p>
    </div>
  );
}
