"use client";

import Link from "next/link";
import {
  ArrowLeft,
  MoreHorizontal,
  PhoneOff,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, MOTION_COLORS } from "./studio-ui";

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
  onLeaveLive,
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
  /** @deprecated Title editing lives in Settings → Live details only. */
  canEditTitle?: boolean;
  /** @deprecated Title editing lives in Settings → Live details only. */
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
  /** Mobile: End Live for hosts. */
  onEndLive?: () => void;
  canEnd?: boolean;
  /** Mobile: Leave Live for participants (not hosts). */
  onLeaveLive?: () => void;
  profileAvatarUrl?: string | null;
}) {
  void onShare;
  void onOpenChat;
  void copied;
  void watchingCount;
  void elapsedLabel;
  void showFollow;
  void onFollow;
  void follow;
  void canEditTitle;
  void onSaveTitle;
  void immersive;

  const dark = false;
  const focus = FOCUS_RING;

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
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#111827]">
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
                "inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
                MOTION_COLORS,
                FOCUS_RING
              )}
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            </button>
            {profileAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileAvatarUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-1 ring-neutral-200"
              />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-500 ring-1 ring-neutral-200">
                You
              </span>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {!brandMobile || !liveActive ? backBtn : null}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1
            className={cn(
              "min-w-0 truncate text-[15px] font-bold tracking-[-0.02em] sm:text-[17px]",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            {title}
          </h1>
          {liveActive ? (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold tracking-[0.04em] text-white sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              LIVE
            </span>
          ) : null}
        </div>

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
                "inline-flex h-10 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3.5 text-[12px] font-semibold text-white hover:bg-[#e04e1a] lg:hidden",
                FOCUS_RING,
                MOTION_COLORS
              )}
            >
              <PhoneOff className="h-4 w-4" aria-hidden />
              <span>End</span>
            </button>
          ) : null}

          {liveActive && !canEnd && onLeaveLive ? (
            <button
              type="button"
              onClick={onLeaveLive}
              aria-label="Leave Live"
              title="Leave Live"
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3.5 text-[12px] font-semibold text-[#111827] ring-1 ring-[#E5E7EB] hover:bg-[#E5E7EB] lg:hidden",
                FOCUS_RING,
                MOTION_COLORS
              )}
            >
              <PhoneOff className="h-4 w-4" aria-hidden />
              <span>Leave</span>
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
    </header>
  );
}
