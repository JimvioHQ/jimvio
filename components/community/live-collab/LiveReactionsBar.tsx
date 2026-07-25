"use client";

import { Hand, Heart, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveCollabStore } from "@/lib/community/live-collab";

const EMOJIS = ["👍", "❤️", "🔥", "👏", "😂", "🙌"];

export function LiveReactionsBar({
  sessionId,
  userId,
  userName,
  handRaised,
  onRaiseHand,
}: {
  sessionId: string;
  userId?: string | null;
  userName?: string | null;
  /** Server-authoritative raise-hand state when provided. */
  handRaised?: boolean;
  /** Production path: call session requestSpeak. */
  onRaiseHand?: () => void | Promise<void>;
}) {
  const addReaction = useLiveCollabStore((s) => s.addReaction);
  const localHand = useLiveCollabStore((s) =>
    userId ? s.handRaisedUserIds.includes(userId) : false
  );
  const raised = typeof handRaised === "boolean" ? handRaised : localHand;
  const recent = useLiveCollabStore((s) =>
    s.reactions.filter((r) => r.sessionId === sessionId).slice(-6)
  );

  function react(kind: "emoji" | "applause", emoji?: string) {
    addReaction({
      id: `rx-${Date.now()}`,
      sessionId,
      kind,
      emoji,
      userId: userId ?? null,
      userName: userName ?? null,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-neutral-100 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`React ${e}`}
            onClick={() => react("emoji", e)}
            className="rounded-md px-1.5 py-1 text-sm hover:bg-neutral-100"
          >
            {e}
          </button>
        ))}
        <button
          type="button"
          onClick={() => react("applause", "👏")}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-100"
        >
          <PartyPopper className="h-3.5 w-3.5" />
          Applause
        </button>
        {userId && (
          <button
            type="button"
            disabled={!onRaiseHand || raised}
            onClick={() => {
              if (!onRaiseHand || raised) return;
              void onRaiseHand();
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
              raised
                ? "bg-amber-100 text-amber-800"
                : "text-neutral-600 hover:bg-neutral-100",
              "disabled:opacity-60"
            )}
          >
            <Hand className="h-3.5 w-3.5" />
            {raised ? "Hand raised" : "Raise hand"}
          </button>
        )}
      </div>
      {recent.length > 0 && (
        <p className="flex flex-wrap gap-1 text-[11px] text-neutral-400">
          <Heart className="h-3 w-3 text-[var(--color-accent)]" />
          {recent.map((r) => (
            <span key={r.id}>{r.emoji ?? "👏"}</span>
          ))}
        </p>
      )}
    </div>
  );
}
