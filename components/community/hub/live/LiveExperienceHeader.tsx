"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Share2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCount } from "./studio-utils";
import { FOCUS_RING, MOTION_COLORS } from "./studio-ui";

export function LiveExperienceHeader({
  title,
  immersive = false,
  follow,
  onFollow,
  onShare,
  onMore,
  onOpenChat,
  copied,
  showFollow = true,
  showGoLive,
  onGoLive,
  canEditTitle = false,
  onSaveTitle,
  backHref = "/communities/live",
  onBack,
  liveActive = false,
  watchingCount,
  elapsedLabel,
}: {
  title: string;
  immersive?: boolean;
  follow: { following: boolean; busy: boolean };
  onFollow: () => void;
  onShare: () => void;
  onMore: () => void;
  copied?: boolean;
  showFollow?: boolean;
  showGoLive?: boolean;
  onGoLive?: () => void;
  canEditTitle?: boolean;
  onSaveTitle?: (next: string) => Promise<void> | void;
  onOpenChat?: () => void;
  backHref?: string;
  /** When set, back uses this handler instead of navigation link (e.g. confirm before leaving live). */
  onBack?: () => void;
  liveActive?: boolean;
  /** Authoritative watching / viewer count — not participant count. */
  watchingCount?: number;
  elapsedLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  const save = async () => {
    const next = draft.trim();
    if (!onSaveTitle) return;
    if (next.length < 2) {
      setSaveError("Title must be at least 2 characters");
      return;
    }
    if (next === title.trim()) {
      setEditing(false);
      setSaveError(null);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSaveTitle(next);
      setEditing(false);
    } catch (e) {
      setDraft(title);
      setSaveError(e instanceof Error ? e.message : "Could not save title");
    } finally {
      setSaving(false);
    }
  };

  return (
    <header
      className={cn(
        "shrink-0 border-b border-transparent px-3 py-2 sm:px-4 sm:py-2.5",
        immersive ? "bg-black/40 text-white backdrop-blur-md" : "border-neutral-200/80 bg-white"
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              MOTION_COLORS,
              immersive
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
              FOCUS_RING
            )}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        ) : (
          <Link
            href={backHref}
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              MOTION_COLORS,
              immersive
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
              FOCUS_RING
            )}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </Link>
        )}

        {editing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              maxLength={120}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
                if (e.key === "Escape") {
                  setDraft(title);
                  setEditing(false);
                  setSaveError(null);
                }
              }}
              aria-label="Live title"
              className={cn(
                "min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-[14px] font-semibold tracking-[-0.02em] outline-none",
                immersive
                  ? "border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  : "border-neutral-200 bg-white text-[#111827]",
                FOCUS_RING
              )}
              placeholder="Live title"
            />
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              aria-label="Save title"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF5A1F] text-white disabled:opacity-60",
                FOCUS_RING
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(title);
                setEditing(false);
                setSaveError(null);
              }}
              aria-label="Cancel title edit"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full",
                immersive ? "text-white/70 hover:bg-white/10" : "text-neutral-500 hover:bg-neutral-50",
                FOCUS_RING
              )}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <h1
              className={cn(
                "min-w-0 truncate text-[15px] font-bold tracking-[-0.02em] sm:text-[17px]",
                immersive ? "text-white" : "text-[#111827]"
              )}
            >
              {title}
            </h1>
            {canEditTitle && onSaveTitle ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit live title"
                title="Edit title"
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  MOTION_COLORS,
                  FOCUS_RING,
                  immersive
                    ? "text-white/50 hover:bg-white/10 hover:text-white"
                    : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                )}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            {liveActive ? (
              <span className="ml-1 hidden items-center gap-2 sm:inline-flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold tracking-[0.04em] text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  LIVE
                </span>
                {typeof watchingCount === "number" ? (
                  <span
                    className={cn(
                      "text-[12px] font-medium tabular-nums",
                      immersive ? "text-white/70" : "text-neutral-500"
                    )}
                  >
                    {watchingCount === 1
                      ? "1 watching"
                      : `${formatCount(watchingCount)} watching`}
                  </span>
                ) : null}
                {elapsedLabel ? (
                  <span
                    className={cn(
                      "text-[12px] font-medium tabular-nums",
                      immersive ? "text-white/55" : "text-neutral-400"
                    )}
                  >
                    {elapsedLabel}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          {showGoLive && onGoLive ? (
            <button
              type="button"
              onClick={onGoLive}
              className={cn(
                "inline-flex h-9 items-center rounded-full bg-[#FF5A1F] px-3.5 text-[12px] font-semibold text-white hover:bg-[#e54e1a]",
                FOCUS_RING
              )}
            >
              Go Live
            </button>
          ) : null}

          {showFollow ? (
            <button
              type="button"
              onClick={onFollow}
              disabled={follow.busy}
              className={cn(
                "inline-flex h-9 min-w-[88px] items-center justify-center gap-1 rounded-full border px-3.5 text-[12px] font-semibold",
                MOTION_COLORS,
                FOCUS_RING,
                follow.following
                  ? immersive
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-neutral-200 bg-neutral-50 text-neutral-700"
                  : immersive
                    ? "border-white/25 bg-white/5 text-white hover:bg-white/10"
                    : "border-neutral-200 bg-white text-[#111827] hover:bg-neutral-50"
              )}
            >
              {follow.busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : follow.following ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Following
                </>
              ) : (
                "Follow"
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onShare}
            title="Share"
            aria-label="Share live"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full",
              MOTION_COLORS,
              FOCUS_RING,
              immersive
                ? "text-white/60 hover:bg-white/10 hover:text-white"
                : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
            )}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" aria-hidden />
            ) : (
              <Share2 className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            )}
          </button>

          {onOpenChat ? (
            <button
              type="button"
              onClick={onOpenChat}
              aria-label="Open live chat"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full lg:hidden",
                MOTION_COLORS,
                FOCUS_RING,
                immersive
                  ? "text-white/60 hover:bg-white/10 hover:text-white"
                  : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
              )}
            >
              <MessageSquare className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onMore}
            title="More"
            aria-label="More options"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full",
              MOTION_COLORS,
              FOCUS_RING,
              immersive
                ? "text-white/60 hover:bg-white/10 hover:text-white"
                : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
            )}
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          </button>
        </div>
      </div>
      {saveError ? (
        <p className="mt-1.5 px-11 text-[11px] font-medium text-red-500" role="alert">
          {saveError}
        </p>
      ) : null}
    </header>
  );
}
