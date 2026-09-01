"use client";

import Link from "next/link";
import { ArrowLeft, Check, Loader2, MessageSquare, MoreHorizontal, Share2 } from "lucide-react";
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
  copied,
  showFollow = true,
  showGoLive,
  onGoLive,
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
  onOpenChat?: () => void;
}) {
  return (
    <header
      className={cn(
        "shrink-0 border-b border-transparent px-3 py-2 sm:px-4 sm:py-2.5",
        immersive ? "bg-black/40 text-white backdrop-blur-md" : "border-neutral-200/80 bg-white"
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link
          href="/communities/live"
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            MOTION_COLORS,
            immersive
              ? "text-white/70 hover:bg-white/10 hover:text-white"
              : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
            FOCUS_RING
          )}
          aria-label="Back to Live"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </Link>

        <h1
          className={cn(
            "min-w-0 flex-1 truncate text-[15px] font-bold tracking-[-0.02em] sm:text-[17px]",
            immersive ? "text-white" : "text-[#111827]"
          )}
        >
          {title}
        </h1>

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
    </header>
  );
}
