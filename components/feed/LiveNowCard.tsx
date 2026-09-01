"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { FeedSidebarCard, FeedSidebarSkeleton } from "@/components/feed/FeedSidebarCard";
import { useFeedHubDiscover } from "@/components/feed/use-feed-hub-discover";
import { cn, formatNumber, getInitials } from "@/lib/utils";

function LiveCreatorCard({
  title,
  hostName,
  hostAvatarUrl,
  thumbnailUrl,
  href,
  viewerCount,
}: {
  title: string;
  hostName: string;
  hostAvatarUrl: string | null;
  thumbnailUrl: string | null;
  href: string;
  viewerCount: number | null;
}) {
  const visual = thumbnailUrl || hostAvatarUrl;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex w-[88px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-[var(--color-border,#e5e7eb)] bg-[var(--color-surface,#fff)]",
        "transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transition-none",
        "hover:-translate-y-0.5 hover:border-[#FF5A1F]/30 hover:shadow-md active:scale-[0.98] motion-reduce:active:scale-100"
      )}
    >
      <div className="relative aspect-square w-full bg-[var(--color-surface-secondary,#f3f4f6)]">
        {visual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visual} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-sm font-bold text-white">
            {getInitials(hostName)}
          </div>
        )}
        <span className="absolute left-1 top-1 rounded bg-red-600 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white motion-safe:animate-pulse motion-reduce:animate-none">
          Live
        </span>
      </div>
      <div className="space-y-0.5 px-2 py-2">
        <p className="truncate text-[11px] font-semibold text-[var(--color-text-primary,#111827)]">
          {hostName}
        </p>
        <p className="truncate text-[10px] text-[var(--color-text-muted,#6b7280)]">{title}</p>
        {viewerCount != null && viewerCount > 0 ? (
          <p className="text-[9px] font-medium tabular-nums text-[var(--color-text-muted,#6b7280)]">
            {formatNumber(viewerCount)} watching
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/** Horizontal live creator rail — real live_sessions only. */
export function LiveNowCard() {
  const { live, loading } = useFeedHubDiscover();
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <FeedSidebarCard title="Live now" titleAccent="live" viewAllHref="/communities/live">
        <FeedSidebarSkeleton rows={1} />
      </FeedSidebarCard>
    );
  }

  if (live.length === 0) return null;

  const scrollBy = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 180, behavior: "smooth" });
  };

  return (
    <FeedSidebarCard title="Live now" titleAccent="live" viewAllHref="/communities/live">
      <div className="relative -mx-0.5">
        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-0.5 pb-0.5 scrollbar-hide snap-x snap-mandatory"
        >
          {live.map((session) => (
            <LiveCreatorCard
              key={session.id}
              title={session.title}
              hostName={session.hostName}
              hostAvatarUrl={session.hostAvatarUrl}
              thumbnailUrl={session.thumbnailUrl}
              href={session.href}
              viewerCount={session.viewerCount}
            />
          ))}
        </div>
        {live.length > 3 ? (
          <>
            <button
              type="button"
              aria-label="Scroll live creators left"
              onClick={() => scrollBy(-1)}
              className="absolute -left-1 top-[28%] hidden h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] shadow-sm transition-colors hover:text-[var(--color-text-primary)] lg:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll live creators right"
              onClick={() => scrollBy(1)}
              className="absolute -right-1 top-[28%] hidden h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] shadow-sm transition-colors hover:text-[var(--color-text-primary)] lg:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>
    </FeedSidebarCard>
  );
}
