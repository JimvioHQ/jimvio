"use client";

import Link from "next/link";
import { Radio, Sparkles, Users } from "lucide-react";
import { FeedSidebarCard, FeedSidebarSkeleton } from "@/components/feed/FeedSidebarCard";
import { useFeedHubDiscover } from "@/components/feed/use-feed-hub-discover";
import { cn, formatNumber, getInitials } from "@/lib/utils";

/**
 * Compact discovery card under Popular Users — real live + Spaces CTA.
 */
export function LiveDiscoverCard() {
  const { live, loading } = useFeedHubDiscover();
  const featured = live[0] ?? null;

  if (loading) {
    return (
      <FeedSidebarCard title="Live & Discover" viewAllHref="/communities/live">
        <FeedSidebarSkeleton rows={2} />
      </FeedSidebarCard>
    );
  }

  return (
    <FeedSidebarCard title="Live & Discover" viewAllHref="/communities/live">
      <div className="space-y-2.5">
        {featured ? (
          <Link
            href={featured.href}
            className={cn(
              "group flex items-center gap-2.5 rounded-xl border border-[var(--color-border,#e5e7eb)] bg-[var(--color-surface-secondary,#f8fafc)] p-2",
              "transition-colors hover:border-[#FF5A1F]/35 hover:bg-[#FF5A1F]/5"
            )}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
              {featured.thumbnailUrl || featured.hostAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.thumbnailUrl || featured.hostAvatarUrl || ""}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white">
                  {getInitials(featured.hostName)}
                </span>
              )}
              <span className="absolute left-0.5 top-0.5 rounded bg-red-600 px-1 py-px text-[7px] font-bold uppercase text-white">
                Live
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary,#111827)] group-hover:text-[#FF5A1F]">
                {featured.title}
              </p>
              <p className="truncate text-[10px] text-[var(--color-text-muted,#6b7280)]">
                {featured.hostName}
                {featured.viewerCount != null && featured.viewerCount > 0
                  ? ` · ${formatNumber(featured.viewerCount)} watching`
                  : ""}
              </p>
            </div>
            <Radio className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden />
          </Link>
        ) : (
          <Link
            href="/communities/live"
            className="flex items-center gap-2.5 rounded-xl border border-dashed border-[var(--color-border,#e5e7eb)] px-3 py-2.5 transition-colors hover:border-[#FF5A1F]/40 hover:bg-[#FF5A1F]/5"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F]">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--color-text-primary,#111827)]">
                Go Live
              </p>
              <p className="text-[10px] text-[var(--color-text-muted,#6b7280)]">
                Start streaming in one tap
              </p>
            </span>
          </Link>
        )}

        <Link
          href="/communities/spaces"
          className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-[var(--color-surface-secondary,#f8fafc)]"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
            <Users className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="min-w-0">
            <p className="text-[12px] font-semibold text-[var(--color-text-primary,#111827)]">
              Explore Spaces
            </p>
            <p className="text-[10px] text-[var(--color-text-muted,#6b7280)]">
              One discussion Space per community
            </p>
          </span>
        </Link>
      </div>
    </FeedSidebarCard>
  );
}
