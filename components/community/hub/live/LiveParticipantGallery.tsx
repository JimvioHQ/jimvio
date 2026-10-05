"use client";

import { memo, useMemo } from "react";
import { ChevronRight } from "lucide-react";
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
    <section
      aria-label="Live participants"
      className="shrink-0"
    >
      {/* Mobile: horizontal strip */}
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
        {onOpenPeople ? (
          <button
            type="button"
            onClick={onOpenPeople}
            aria-label="Open participants"
            className={cn(
              "flex aspect-square w-[72px] shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/70 ring-1 ring-white/10",
              FOCUS_RING_DARK
            )}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
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
              "flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl bg-white/5 text-white/80 ring-1 ring-white/10",
              FOCUS_RING_DARK,
              "hover:bg-white/10"
            )}
          >
            <span className="text-[15px] font-semibold tabular-nums">+{overflow}</span>
            <span className="text-[10px] font-medium text-white/45">More</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

export const LiveParticipantGallery = memo(LiveParticipantGalleryImpl);
