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
    <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center bg-transparent px-6 text-center">
      <div
        className="relative mb-5 overflow-hidden rounded-full bg-transparent"
        style={{ width: 140, height: 140, borderRadius: 9999 }}
      >
        <HubAvatar
          name={hostName}
          src={avatarUrl}
          size={140}
          className="!bg-transparent !shadow-none !ring-0"
        />
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
