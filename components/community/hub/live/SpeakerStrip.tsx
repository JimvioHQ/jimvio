"use client";

import { memo } from "react";
import { Hand, Mic, MicOff, Users, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import type { Speaker } from "@/lib/community/hub-live-types";
import type { SpeakerUi } from "./studio-types";
import { FOCUS_RING, LIVE_SHADOW, MOTION, MOTION_COLORS } from "./studio-ui";

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
        className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide"
      >
        <button
          type="button"
          onClick={onInvite}
          className={cn(
            "flex h-[88px] w-[140px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 bg-white text-neutral-400",
            MOTION,
            FOCUS_RING,
            "hover:border-accent/40 hover:text-accent"
          )}
        >
          <Users className="h-5 w-5" strokeWidth={1.6} aria-hidden />
          <span className="text-[11px] font-medium">Invite speakers</span>
        </button>
      </div>
    );
  }

  const visible = speakers.slice(0, 5);
  const overflow = Math.max(speakers.length - 5, 0);

  return (
    <div
      role="list"
      aria-label="Speakers on stage"
      className="flex items-stretch gap-3 overflow-x-auto pb-1 scrollbar-hide"
    >
      {visible.map((s, i) => {
        const state = ui[s.id];
        const speaking = state?.speaking || activeId === s.id;
        const micOn = state?.micOn ?? true;
        const camOn = state?.camOn ?? true;
        const role = state?.role ?? (i === 0 ? "host" : "speaker");
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
              "group relative h-[104px] w-[148px] shrink-0 overflow-hidden rounded-2xl border bg-neutral-900 text-left",
              LIVE_SHADOW,
              MOTION,
              FOCUS_RING,
              speaking
                ? "border-emerald-400/80 ring-2 ring-emerald-400/40"
                : "border-neutral-200/60 hover:border-neutral-300",
              "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] motion-reduce:hover:translate-y-0"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />
            <div className="absolute inset-0 flex items-center justify-center opacity-90">
              <HubAvatar name={s.name} src={s.avatar_url} size={56} className="!ring-0" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

            <span
              className={cn(
                "absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide",
                role === "host"
                  ? "bg-accent text-white"
                  : "bg-white/90 text-neutral-700"
              )}
            >
              {roleLabel}
            </span>

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 p-2">
              <span className="min-w-0 truncate text-[11px] font-semibold tracking-[-0.01em] text-white">
                {s.name}
              </span>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  micOn ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                )}
                aria-hidden
              >
                {micOn ? (
                  <Mic className="h-2.5 w-2.5" strokeWidth={2} />
                ) : (
                  <MicOff className="h-2.5 w-2.5" strokeWidth={2} />
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

      {overflow > 0 ? (
        <button
          type="button"
          onClick={onInvite}
          className={cn(
            "flex h-[104px] w-[120px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200/80 bg-white",
            LIVE_SHADOW,
            MOTION_COLORS,
            FOCUS_RING,
            "hover:border-accent/30 hover:bg-accent/5"
          )}
          aria-label={`${overflow} more speakers`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <Users className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          </span>
          <span className="text-[11px] font-semibold text-neutral-700">
            +{overflow} More
          </span>
          <span className="text-[10px] text-neutral-400">speakers</span>
        </button>
      ) : (
        <button
          type="button"
          title="Invite speaker"
          aria-label="Invite speaker"
          onClick={onInvite}
          className={cn(
            "flex h-[104px] w-[88px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 bg-white/80 text-neutral-400",
            MOTION,
            FOCUS_RING,
            "hover:border-accent/40 hover:text-accent"
          )}
        >
          <Users className="h-5 w-5" strokeWidth={1.6} aria-hidden />
          <span className="text-[10px] font-medium">Invite</span>
        </button>
      )}
    </div>
  );
}

export const SpeakerStrip = memo(SpeakerStripImpl);
