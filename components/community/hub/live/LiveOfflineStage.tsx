"use client";

import Link from "next/link";
import { HubAvatar } from "../hub-ui";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "./studio-ui";

export function LiveOfflineStage({
  hostName,
  hostAvatar,
  isHost,
  onGoLive,
  onFollow,
  following,
  followBusy,
}: {
  hostName: string;
  hostAvatar?: string | null;
  title?: string;
  isHost?: boolean;
  onGoLive?: () => void;
  onFollow?: () => void;
  following?: boolean;
  followBusy?: boolean;
}) {
  return (
    <div className="relative flex h-full min-h-[min(72vh,640px)] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#0f1115] via-[#141820] to-[#0a0c10] px-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,90,31,0.08),transparent_55%)]" />

      <div className="relative z-[1] flex max-w-md flex-col items-center">
        <div className="mb-5 ring-4 ring-white/10 rounded-full">
          <HubAvatar name={hostName} src={hostAvatar} size={72} />
        </div>

        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
          Offline
        </span>

        <h2 className="text-[18px] font-bold tracking-[-0.02em] text-white sm:text-[20px]">
          Live is offline
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/45">
          This Live will appear here when {hostName} goes live.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {isHost && onGoLive ? (
            <button
              type="button"
              onClick={onGoLive}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full bg-[#FF5A1F] px-5 text-[13px] font-semibold text-white hover:bg-[#e54e1a]",
                FOCUS_RING
              )}
            >
              Go Live
            </button>
          ) : onFollow ? (
            <button
              type="button"
              onClick={onFollow}
              disabled={followBusy}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white/10 px-5 text-[13px] font-semibold text-white hover:bg-white/15 disabled:opacity-60",
                FOCUS_RING
              )}
            >
              {following ? "Following" : "Follow"}
            </button>
          ) : null}
          <Link
            href="/communities/explore"
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border border-white/10 px-5 text-[13px] font-medium text-white/75 hover:bg-white/5",
              FOCUS_RING
            )}
          >
            Explore communities
          </Link>
        </div>
      </div>
    </div>
  );
}
