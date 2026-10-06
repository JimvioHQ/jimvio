"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  PhoneOff,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, FOCUS_RING_DARK, MOTION_COLORS } from "./studio-ui";

export function LiveExperienceHeader({
  title,
  immersive = false,
  follow,
  onFollow,
  onShare,
  onMore,
  onOpenChat,
  onSettings,
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
  brandMobile = false,
  onEndLive,
  canEnd = false,
  profileAvatarUrl,
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
  onSettings?: () => void;
  backHref?: string;
  /** When set, back uses this handler instead of navigation link (e.g. confirm before leaving live). */
  onBack?: () => void;
  liveActive?: boolean;
  /** Authoritative watching / viewer count — not participant count. */
  watchingCount?: number;
  elapsedLabel?: string;
  /** Mobile reference: show Jimvio brand row above title. */
  brandMobile?: boolean;
  /** Mobile reference: End Live in the second header row. */
  onEndLive?: () => void;
  canEnd?: boolean;
  profileAvatarUrl?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  void onShare;
  void onOpenChat;
  void copied;
  void watchingCount;
  void elapsedLabel;
  void showFollow;
  void onFollow;
  void follow;

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

  const dark = immersive || liveActive;
  const focus = dark ? FOCUS_RING_DARK : FOCUS_RING;

  const backBtn = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        MOTION_COLORS,
        dark
          ? "text-white/70 hover:bg-white/10 hover:text-white"
          : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
        focus
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
        dark
          ? "text-white/70 hover:bg-white/10 hover:text-white"
          : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
        focus
      )}
      aria-label="Back"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </Link>
  );

  return (
    <header
      className={cn(
        "shrink-0 px-3 py-2.5 sm:px-4",
        dark
          ? "border-b border-white/5 bg-[#070B14] text-white"
          : "border-b border-neutral-200/80 bg-white"
      )}
    >
      {brandMobile && liveActive ? (
        <div className="mb-2 flex items-center justify-between lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            {backBtn}
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FF5A1F] text-[13px] font-black text-white">
              J
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">
              Jimvio
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onMore}
              title="More"
              aria-label="More options"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white",
                MOTION_COLORS,
                FOCUS_RING_DARK
              )}
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            </button>
            {profileAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileAvatarUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
              />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/70 ring-1 ring-white/15">
                You
              </span>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {!brandMobile || !liveActive ? backBtn : null}

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
                dark
                  ? "border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  : "border-neutral-200 bg-white text-[#111827]",
                focus
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
                focus
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
                dark ? "text-white/70 hover:bg-white/10" : "text-neutral-500 hover:bg-neutral-50",
                focus
              )}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1
              className={cn(
                "min-w-0 truncate text-[15px] font-bold tracking-[-0.02em] sm:text-[17px]",
                dark ? "text-white" : "text-[#111827]"
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
                  focus,
                  dark
                    ? "text-white/50 hover:bg-white/10 hover:text-white"
                    : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                )}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            {liveActive ? (
              <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold tracking-[0.04em] text-white sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
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
                focus
              )}
            >
              Go Live
            </button>
          ) : null}

          {liveActive && onEndLive && canEnd ? (
            <button
              type="button"
              onClick={onEndLive}
              aria-label="End Live"
              title="End Live"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FF5A1F] text-white hover:bg-[#e04e1a] lg:hidden",
                FOCUS_RING_DARK,
                MOTION_COLORS
              )}
            >
              <PhoneOff className="h-4 w-4" aria-hidden />
            </button>
          ) : null}

          {onSettings ? (
            <button
              type="button"
              onClick={onSettings}
              title="Settings"
              aria-label="Open settings"
              className={cn(
                "hidden h-9 w-9 items-center justify-center rounded-full lg:inline-flex",
                MOTION_COLORS,
                focus,
                dark
                  ? "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
              )}
            >
              <Settings className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onMore}
            title="More"
            aria-label="More options"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full",
              brandMobile && liveActive && "hidden lg:inline-flex",
              MOTION_COLORS,
              focus,
              dark
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
