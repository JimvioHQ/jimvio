"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { CommunityLetterAvatar } from "@/components/community/community-letter-avatar";
import { CommunityAvatarImage } from "@/components/community/community-media";
import { useFeedHubDiscover } from "@/components/feed/use-feed-hub-discover";
import type { TrendingCommunity } from "@/components/feed/FeedDiscoverRail";

function CommunityChip({ c }: { c: TrendingCommunity }) {
  return (
    <Link
      href={c.href}
      className="flex w-[148px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#FF5A1F]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
    >
      <div className="flex items-center gap-2.5 p-2.5">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6]">
          {c.avatar_url || c.cover_image ? (
            <CommunityAvatarImage
              name={c.name}
              src={c.avatar_url || c.cover_image}
              className="h-full w-full object-cover"
              size={40}
            />
          ) : (
            <CommunityLetterAvatar name={c.name} className="h-full w-full text-sm" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-[#111827]">{c.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6B7280]">
            <Users className="h-3 w-3 shrink-0" aria-hidden />
            {formatNumber(c.member_count)}
            {c.category ? ` · ${c.category}` : ""}
          </p>
        </div>
      </div>
      <div className="border-t border-[#F3F4F6] px-2.5 py-1.5">
        <span className="text-[11px] font-semibold text-[#FF5A1F]">
          {c.is_free === false ? "View" : "Join"}
        </span>
      </div>
    </Link>
  );
}

function LiveChip({
  id,
  title,
  hostName,
  hostAvatarUrl,
  href,
}: {
  id: string;
  title: string;
  hostName: string;
  hostAvatarUrl: string | null;
  href: string;
}) {
  return (
    <Link
      key={id}
      href={href}
      className="flex w-[160px] shrink-0 items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white p-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#FF5A1F]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#F3F4F6]">
        {hostAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hostAvatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[#FF5A1F]">
            {hostName[0]?.toUpperCase() ?? "L"}
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 rounded bg-[#EF4444] px-1 text-[8px] font-bold uppercase text-white">
          Live
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-[#111827]">{hostName}</p>
        <p className="truncate text-[10px] text-[#6B7280]">{title}</p>
      </div>
    </Link>
  );
}

/**
 * In-feed discovery strip — reuses shared discover cache (no extra DB path).
 */
export function FeedInlineModule({
  kind,
}: {
  kind: "communities" | "live" | "people";
}) {
  const { live, popularUsers, communities, loading } = useFeedHubDiscover();

  if (loading) return null;

  if (kind === "live") {
    if (!live.length) return null;
    return (
      <section
        className="border-y border-[#F3F4F6] bg-[#F8FAFC]/80 px-3 py-3 sm:px-4"
        aria-label="Live now"
      >
        <p className="mb-2 text-[12px] font-semibold text-[#111827]">Live now</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
          {live.slice(0, 6).map((s) => (
            <LiveChip
              key={s.id}
              id={s.id}
              title={s.title}
              hostName={s.hostName}
              hostAvatarUrl={s.hostAvatarUrl}
              href={s.href}
            />
          ))}
        </div>
      </section>
    );
  }

  if (kind === "people") {
    if (popularUsers.length < 2) return null;
    return (
      <section
        className="border-y border-[#F3F4F6] bg-white px-3 py-3 sm:px-4"
        aria-label="Recommended people"
      >
        <p className="mb-2 text-[12px] font-semibold text-[#111827]">
          Recommended people
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
          {popularUsers.slice(0, 5).map((u) => (
            <Link
              key={u.userId}
              href={u.href}
              className="flex w-[132px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white p-2.5 text-center transition hover:border-[#FF5A1F]/30"
            >
              <div className="h-11 w-11 overflow-hidden rounded-full bg-[#F3F4F6]">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-bold text-[#FF5A1F]">
                    {u.name[0]}
                  </span>
                )}
              </div>
              <p className="w-full truncate text-[11px] font-semibold text-[#111827]">
                {u.name}
              </p>
              {u.username ? (
                <p className="w-full truncate text-[10px] text-[#9CA3AF]">@{u.username}</p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  const list = (communities ?? []).slice(0, 6);
  if (!list.length) return null;

  return (
    <section
      className={cn(
        "border-y border-[#F3F4F6] bg-[#F8FAFC]/80 px-3 py-3 sm:px-4"
      )}
      aria-label="Recommended communities"
    >
      <p className="mb-2 text-[12px] font-semibold text-[#111827]">
        Recommended for you
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
        {list.map((c) => (
          <CommunityChip key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}

/** Placement helpers — sparse, adaptive interleaving. */
export function feedModuleAtIndex(index: number): "communities" | "live" | "people" | null {
  if (index === 3) return "communities";
  if (index === 8) return "live";
  if (index === 13) return "people";
  if (index === 18) return "communities";
  return null;
}
