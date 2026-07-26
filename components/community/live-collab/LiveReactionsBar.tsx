"use client";

import { useEffect, useMemo } from "react";
import { Hand, Heart, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChanges,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import { useLiveCollabStore } from "@/lib/community/live-collab";

const EMOJIS = ["👍", "❤️", "🔥", "👏", "😂", "🙌"];

export function LiveReactionsBar({
  sessionId,
  userId,
  userName,
  handRaised,
  onRaiseHand,
  onReact,
}: {
  sessionId: string;
  userId?: string | null;
  userName?: string | null;
  /** Server-authoritative raise-hand state when provided. */
  handRaised?: boolean;
  /** Production path: call session requestSpeak. */
  onRaiseHand?: () => void | Promise<void>;
  /** Persist reaction via live session API. */
  onReact?: (emoji: string) => void | Promise<void>;
}) {
  const addReaction = useLiveCollabStore((s) => s.addReaction);
  const localHand = useLiveCollabStore((s) =>
    userId ? s.handRaisedUserIds.includes(userId) : false
  );
  const raised = typeof handRaised === "boolean" ? handRaised : localHand;
  const recent = useLiveCollabStore((s) =>
    s.reactions.filter((r) => r.sessionId === sessionId).slice(-6)
  );
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;
    void (async () => {
      channel = await subscribePostgresChanges(
        supabase,
        `live_reactions:${sessionId}`,
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_signals",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload?.new as {
            id?: string;
            signal_type?: string;
            from_user_id?: string;
            payload?: { emoji?: string };
            created_at?: string;
          } | null;
          if (!row || row.signal_type !== "reaction") return;
          const emoji = row.payload?.emoji ?? "👍";
          addReaction({
            id: row.id ?? `rx-${Date.now()}`,
            sessionId,
            kind: "emoji",
            emoji,
            userId: row.from_user_id ?? null,
            userName: null,
            createdAt: row.created_at ?? new Date().toISOString(),
          });
        },
        () => cancelled
      );
    })();
    return () => {
      cancelled = true;
      unsubscribeRealtime(supabase, channel, `live_reactions:${sessionId}`);
    };
  }, [sessionId, supabase, addReaction]);

  function react(kind: "emoji" | "applause", emoji?: string) {
    const e = emoji ?? "👏";
    addReaction({
      id: `rx-${Date.now()}`,
      sessionId,
      kind,
      emoji: e,
      userId: userId ?? null,
      userName: userName ?? null,
      createdAt: new Date().toISOString(),
    });
    if (onReact) void onReact(e);
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
        <div className="flex items-center gap-1 text-[12px] text-neutral-500">
          <Heart className="h-3 w-3" />
          {recent.map((r) => r.emoji ?? "👍").join(" ")}
        </div>
      )}
    </div>
  );
}
