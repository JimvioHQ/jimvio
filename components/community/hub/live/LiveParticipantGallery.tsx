"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Speaker } from "@/lib/community/hub-live-types";
import type { SpeakerUi } from "./studio-types";
import { LiveParticipantTile } from "./LiveParticipantTile";
import { FOCUS_RING_DARK } from "./studio-ui";

/**
 * Real joined participants only — never pads with fake people or empty human tiles.
 * Host stays on the main stage; this gallery shows everyone else who joined.
 */
function LiveParticipantGalleryImpl({
  participants,
  ui,
  streams,
  activeId,
  hostId,
  onSelect,
  onOpenPeople,
}: {
  participants: Speaker[];
  ui: Record<string, SpeakerUi>;
  /** LiveKit camera streams keyed by user id / identity */
  streams: Record<string, MediaStream | null | undefined>;
  activeId: string | null;
  hostId?: string | null;
  onSelect: (id: string) => void;
  onOpenPeople?: () => void;
}) {
  const list = useMemo(
    () => participants.filter((p) => p.id && p.id !== hostId),
    [participants, hostId]
  );

  if (list.length === 0) {
    return null;
  }

  const desktopVisible = list.slice(0, 12);
  const overflow = Math.max(0, list.length - desktopVisible.length);

  return (
    <section aria-label="Live participants" className="shrink-0">
      {/* Mobile: horizontal strip — real participants only, no fake arrow tiles */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:hidden">
        {list.map((p) => {
          const state = ui[p.id];
          return (
            <LiveParticipantTile
              key={p.id}
              name={p.name}
              avatarUrl={p.avatar_url}
              stream={streams[p.id] ?? null}
              camOn={Boolean(state?.camOn)}
              micOn={Boolean(state?.micOn)}
              speaking={Boolean(state?.speaking) || activeId === p.id}
              selected={activeId === p.id}
              onSelect={() => onSelect(p.id)}
              compact
            />
          );
        })}
      </div>

      {/* Desktop/tablet: grid under host */}
      <div className="hidden gap-2 sm:grid sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {desktopVisible.map((p) => {
          const state = ui[p.id];
          return (
            <LiveParticipantTile
              key={p.id}
              name={p.name}
              avatarUrl={p.avatar_url}
              stream={streams[p.id] ?? null}
              camOn={Boolean(state?.camOn)}
              micOn={Boolean(state?.micOn)}
              speaking={Boolean(state?.speaking) || activeId === p.id}
              selected={activeId === p.id}
              onSelect={() => onSelect(p.id)}
            />
          );
        })}
        {overflow > 0 && onOpenPeople ? (
          <button
            type="button"
            onClick={onOpenPeople}
            aria-label={`View ${overflow} more participants`}
            className={cn(
              "flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-[#0B1220] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
              FOCUS_RING_DARK,
              "hover:bg-[#121a2c]"
            )}
          >
            <span className="text-[15px] font-semibold tabular-nums">+{overflow}</span>
            <span className="text-[10px] font-medium text-white/55">More</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

export const LiveParticipantGallery = memo(LiveParticipantGalleryImpl);
