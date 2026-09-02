"use client";

import { MicOff, Monitor, VideoOff } from "lucide-react";
import { HubAvatar } from "../hub-ui";

export function LiveStageFallback({
  hostName,
  avatarUrl,
  cameraOff = true,
  micOff = false,
  screenSharing = false,
  reconnecting = false,
}: {
  hostName: string;
  avatarUrl?: string | null;
  cameraOff?: boolean;
  micOff?: boolean;
  screenSharing?: boolean;
  reconnecting?: boolean;
}) {
  const statusLabel = reconnecting
    ? "Host reconnecting…"
    : screenSharing
      ? "Sharing screen"
      : cameraOff
        ? "Camera off"
        : "Starting stream…";

  const StatusIcon = screenSharing ? Monitor : cameraOff ? VideoOff : MicOff;

  return (
    <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_40%,#1a1a1a_0%,#050505_72%)] px-6 text-center">
      <div className="relative mb-4">
        <HubAvatar name={hostName} src={avatarUrl} size={96} className="!ring-4 !ring-white/10" />
        {micOff ? (
          <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white ring-2 ring-neutral-900">
            <MicOff className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="text-[15px] font-semibold text-white/90">{hostName}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-white/45">
        <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        {statusLabel}
      </p>
    </div>
  );
}
