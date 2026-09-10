"use client";

import Link from "next/link";
import { ChevronRight, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING_DARK } from "./studio-ui";
import type { useLiveDestinations } from "@/hooks/live/useLiveDestinations";

type DestHook = ReturnType<typeof useLiveDestinations>;

/**
 * Lightweight Live Studio entry — does not render the full destinations panel.
 * Full management lives at Settings → Live Destinations.
 */
export function LiveDestinationsStudioLink({
  dest,
  className,
}: {
  dest: DestHook;
  className?: string;
}) {
  const enabled = dest.selectedIds.length;
  const connected = dest.destinations.filter((d) => d.platform !== "jimvio").length;
  const liveCount = dest.sessionStatuses.filter((s) => s.status === "live").length;

  return (
    <Link
      href="/identity/live-destinations"
      className={cn(
        "group flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-black/45 px-3.5 py-3 text-left backdrop-blur-md hover:border-white/20 hover:bg-black/55",
        FOCUS_RING_DARK,
        className
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white/70">
        <Radio className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-white">
          Live Destinations
        </span>
        <span className="mt-0.5 block text-[11px] text-white/45">
          {dest.loading
            ? "Loading…"
            : liveCount > 0
              ? `${liveCount} streaming · manage in Settings`
              : enabled > 0
                ? `${enabled} enabled for Go Live · ${connected} connected`
                : connected > 0
                  ? `${connected} connected · enable in Settings`
                  : "Connect YouTube, Twitch & more in Settings"}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/35 group-hover:text-white/60" />
    </Link>
  );
}
