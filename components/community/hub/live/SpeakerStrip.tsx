"use client";

import { memo } from "react";
import { Hand, Mic, MicOff, Users, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import type { Speaker } from "@/lib/community/hub-live-types";
import type { SpeakerUi } from "./studio-types";
import { FOCUS_RING, MOTION, MOTION_COLORS } from "./studio-ui";

function SpeakerStripImpl({
  speakers,
  ui,
  activeId,
  onSelect,
  onInvite,
}: {
  speakers: Speaker[];
  ui: Record<string, SpeakerUi>;
  activeId: string | null;
  onSelect: (id: string) => void;
  onInvite: () => void;
}) {
  if (speakers.length === 0) {
    return (
      <div
        role="status"
        aria-label="No speakers on stage"
        className="flex gap-2.5 overflow-x-auto scrollbar-hide"
      >
        <button
          type="button"
          onClick={onInvite}
          className={cn(
            "flex aspect-[4/3] w-[160px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-neutral-100 text-neutral-400",
            MOTION,
            FOCUS_RING,
            "hover:bg-neutral-50 hover:text-accent"
          )}
        >
          <Users className="h-5 w-5" strokeWidth={1.6} aria-hidden />
          <span className="text-[11px] font-medium">Invite speakers</span>
        </button>
      </div>
    );
  }

  const visible = speakers.slice(0, 4);
  const overflow = Math.max(speakers.length - 4, 0);

  return (
    <div
      role="list"
      aria-label="Speakers on stage"
      className="flex gap-2.5 overflow-x-auto scrollbar-hide"
    >
      {visible.map((s, i) => {
        const state = ui[s.id];
        const speaking = state?.speaking || activeId === s.id;
        const micOn = state?.micOn ?? true;
        const camOn = state?.camOn ?? true;
        const role = state?.role ?? (i === 0 ? "host" : "cohost");
        const roleLabel =
          role === "host" ? "Host" : role === "cohost" ? "Co-host" : "Speaker";

        return (
          <button
            key={s.id}
            type="button"
            role="listitem"
            onClick={() => onSelect(s.id)}
            aria-current={speaking ? "true" : undefined}
            aria-label={`${s.name}, ${roleLabel}${!micOn ? ", muted" : ""}${!camOn ? ", camera off" : ""}${speaking ? ", speaking" : ""}`}
            className={cn(
              "group relative aspect-[4/3] w-[min(22%,180px)] min-w-[132px] shrink-0 overflow-hidden rounded-2xl bg-neutral-900 text-left shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
              MOTION,
              FOCUS_RING,
              speaking && "ring-2 ring-emerald-400/70",
              "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 via-neutral-900 to-black" />
            <div className="absolute inset-0 flex items-center justify-center">
              <HubAvatar name={s.name} src={s.avatar_url} size={64} className="!ring-0 scale-110" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 p-2.5">
              <div className="min-w-0">
                <span
                  className={cn(
                    "inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide",
                    role === "host" ? "bg-accent text-white" : "bg-white/90 text-neutral-700"
                  )}
                >
                  {roleLabel}
                </span>
                <p className="mt-1 truncate text-[12px] font-semibold tracking-[-0.01em] text-white">
                  {s.name}
                </p>
              </div>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full shadow-sm",
                  micOn ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                )}
                aria-hidden
              >
                {micOn ? (
                  <Mic className="h-2.5 w-2.5" strokeWidth={2.2} />
                ) : (
                  <MicOff className="h-2.5 w-2.5" strokeWidth={2.2} />
                )}
              </span>
            </div>

            {!camOn && (
              <span
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white"
                aria-hidden
              >
                <VideoOff className="h-2.5 w-2.5" />
              </span>
            )}

            {state?.handRaised && (
              <span
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-neutral-900"
                aria-hidden
              >
                <Hand className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        );
      })}

      <button
        type="button"
        onClick={onInvite}
        className={cn(
          "flex aspect-[4/3] w-[min(18%,140px)] min-w-[110px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]",
          MOTION_COLORS,
          FOCUS_RING,
          "hover:bg-neutral-50"
        )}
        aria-label={overflow > 0 ? `${overflow} more speakers` : "Invite more speakers"}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm">
          <Users className="h-4 w-4" strokeWidth={1.6} aria-hidden />
        </span>
        <span className="px-2 text-center text-[12px] font-semibold leading-tight text-neutral-700">
          {overflow > 0 ? (
            <>
              +{overflow} More
              <span className="mt-0.5 block text-[10px] font-medium text-neutral-400">speakers</span>
            </>
          ) : (
            <>
              Invite
              <span className="mt-0.5 block text-[10px] font-medium text-neutral-400">speakers</span>
            </>
          )}
        </span>
      </button>
    </div>
  );
}

export const SpeakerStrip = memo(SpeakerStripImpl);
