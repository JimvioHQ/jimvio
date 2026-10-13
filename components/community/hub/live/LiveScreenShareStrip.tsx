"use client";

import { useEffect, useRef } from "react";
import { Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export type LiveScreenShareTile = {
  identity: string;
  name: string;
  stream: MediaStream;
  onStage: boolean;
  isYou?: boolean;
};

function SharePreview({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => undefined);
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 h-full w-full bg-neutral-950 object-contain"
    />
  );
}

/** Scrollable previews of every live screen share. Selecting one does not restart capture. */
export function LiveScreenShareStrip({
  shares,
  canPromote,
  onPromote,
}: {
  shares: LiveScreenShareTile[];
  canPromote: boolean;
  onPromote: (identity: string) => void;
}) {
  if (!shares.length) return null;
  return (
    <div className="w-full" aria-label="Screen shares">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7280]">
        <Monitor className="h-3.5 w-3.5" aria-hidden />
        Screens
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {shares.map((share) => (
          <div
            key={share.identity}
            className={cn(
              "w-[148px] shrink-0 rounded-xl border bg-white p-1.5 shadow-sm",
              share.onStage ? "border-[#FF5A1F]" : "border-[#E5E7EB]",
            )}
          >
            <div className="relative aspect-video overflow-hidden rounded-lg bg-neutral-950">
              <SharePreview stream={share.stream} />
              <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                <Monitor className="h-2.5 w-2.5" aria-hidden />
                Sharing
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] font-semibold text-[#111827]">
              {share.name}
              {share.isYou ? " (You)" : ""}
            </p>
            {share.onStage ? (
              <p className="text-[10px] font-semibold text-[#FF5A1F]" aria-current="true">
                On main stage
              </p>
            ) : canPromote ? (
              <button
                type="button"
                onClick={() => onPromote(share.identity)}
                className="mt-1 h-7 w-full rounded-lg bg-[#FF5A1F] text-[10px] font-bold text-white hover:bg-[#E04E18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
                aria-label={`Show ${share.name}'s screen on the main stage`}
              >
                Show on main stage
              </button>
            ) : (
              <p className="text-[10px] font-medium text-[#6B7280]">Waiting for the host</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
