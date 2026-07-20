"use client";

import { memo } from "react";
import { Hand, MicOff, Plus, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import type { Speaker } from "@/lib/community/hub-live-types";
import type { SpeakerUi } from "./studio-types";
import { FOCUS_RING_DARK, MOTION } from "./studio-ui";

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
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl px-2.5 py-2",
          "bg-black/30 backdrop-blur-xl",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[180ms]"
        )}
      >
        <p className="px-1.5 text-[11px] tracking-[-0.01em] text-white/45">No speakers yet</p>
        <button
          type="button"
          title="Invite speaker"
          aria-label="Invite speaker"
          onClick={onInvite}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-white/35 hover:bg-white/10 hover:text-white/70",
            MOTION,
            FOCUS_RING_DARK
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={1.6} aria-hidden />
        </button>
      </div>
    );
  }

  const visible = speakers.slice(0, 6);
  const overflow = Math.max(speakers.length - 6, 0);

  return (
    <div
      role="list"
      aria-label="Speakers on stage"
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl px-2.5 py-2",
        "bg-black/30 backdrop-blur-xl",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[180ms]"
      )}
    >
      {visible.map((s, i) => {
        const state = ui[s.id];
        const speaking = state?.speaking || activeId === s.id;
        const micOn = state?.micOn ?? true;
        const camOn = state?.camOn ?? true;
        const role = state?.role ?? (i === 0 ? "host" : "speaker");
        const name = i === 0 ? "You" : s.name.split(" ")[0];
        return (
          <button
            key={s.id}
            type="button"
            role="listitem"
            onClick={() => onSelect(s.id)}
            aria-current={speaking ? "true" : undefined}
            aria-label={`${s.name}${role === "host" ? ", host" : role === "cohost" ? ", co-host" : ""}${!micOn ? ", muted" : ""}${!camOn ? ", camera off" : ""}${speaking ? ", speaking" : ""}`}
            className={cn(
              "group relative flex flex-col items-center gap-1",
              MOTION,
              FOCUS_RING_DARK,
              "hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100"
            )}
          >
            <span className="relative">
              <span
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full motion-safe:transition-[box-shadow] motion-safe:duration-[180ms]",
                  speaking && "shadow-[0_0_0_2px_rgba(52,211,153,0.85)]"
                )}
              >
                <HubAvatar name={s.name} src={s.avatar_url} size={40} />
              </span>

              {!micOn && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-black/40" aria-hidden>
                  <MicOff className="h-2 w-2 text-white" />
                </span>
              )}

              {!camOn && (
                <span className="absolute -left-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-neutral-800/90 ring-2 ring-black/40" aria-hidden>
                  <VideoOff className="h-2 w-2 text-white" />
                </span>
              )}

              {state?.handRaised && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-neutral-900 ring-2 ring-black/40" aria-hidden>
                  <Hand className="h-2 w-2" />
                </span>
              )}

              {(role === "host" || role === "cohost") && (
                <span
                  className={cn(
                    "absolute -bottom-0.5 -left-0.5 h-2 w-2 rounded-full ring-2 ring-black/40",
                    role === "host" ? "bg-white" : "bg-white/60"
                  )}
                  aria-hidden
                />
              )}
            </span>

            <span className="max-w-[52px] truncate text-[10px] font-normal tracking-[-0.01em] text-white/70">
              {name}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        title="Invite speaker"
        aria-label="Invite speaker"
        onClick={onInvite}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-white/35 hover:bg-white/10 hover:text-white/70",
          MOTION,
          FOCUS_RING_DARK
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={1.6} aria-hidden />
      </button>

      {overflow > 0 && (
        <span className="px-1.5 text-[11px] font-normal tabular-nums text-white/50" aria-label={`${overflow} more speakers`}>
          +{overflow}
        </span>
      )}
    </div>
  );
}

export const SpeakerStrip = memo(SpeakerStripImpl);
