"use client";

import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { isUserVisibleLiveDestination } from "@/lib/live/destinations/capabilities";
import type { useLiveDestinations } from "@/hooks/live/useLiveDestinations";

type DestHook = ReturnType<typeof useLiveDestinations>;

/**
 * Compact destination summary for the Live stage.
 * Full management lives in Live Settings → Live Destinations.
 * Counts only user-visible destinations (Jimvio + YouTube + Twitch + TikTok + custom RTMP).
 */
export function LiveDestinationsStudioLink({
  dest,
  className,
  onOpenSettings,
}: {
  dest: DestHook;
  className?: string;
  onOpenSettings?: () => void;
}) {
  const visibleDestinations = dest.destinations.filter(
    (d) =>
      isUserVisibleLiveDestination(d.platform) || d.platform === "custom_rtmp"
  );
  const visibleIds = new Set(visibleDestinations.map((d) => d.id));
  const enabled = dest.selectedIds.filter((id) => visibleIds.has(id)).length;
  const connected = visibleDestinations.filter((d) => d.platform !== "jimvio")
    .length;
  const liveCount = dest.sessionStatuses.filter(
    (s) => s.status === "live" && visibleIds.has(s.destinationId)
  ).length;

  const summary = dest.loading
    ? "Loading destinations…"
    : liveCount > 0
      ? `Jimvio · ${liveCount} destination streaming`
      : enabled > 0
        ? `Jimvio · ${enabled} destination${enabled === 1 ? "" : "s"} selected`
        : connected > 0
          ? `Jimvio · ${connected} destination${connected === 1 ? "" : "s"} connected`
          : "Jimvio · manage destinations in Live Settings";

  if (onOpenSettings) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] text-white/50 transition-colors hover:text-white/75",
          className
        )}
      >
        <Radio className="h-3 w-3" aria-hidden />
        {summary}
      </button>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] text-white/50", className)}>
      <Radio className="h-3 w-3" aria-hidden />
      {summary}
    </span>
  );
}
