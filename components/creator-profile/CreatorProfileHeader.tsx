"use client";

import { cn } from "@/lib/utils";
import type { CreatorProfileIdentity, CreatorProfileStats } from "@/lib/creator-profile/types";
import { CREATOR_LEVEL_LABELS } from "@/lib/creator-profile";
import { BadgeCheck, Globe, Languages, Sparkles } from "lucide-react";

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatJoinDate(iso: string | null) {
  if (!iso) return "Member";
  try {
    return `Joined ${new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  } catch {
    return "Member";
  }
}

type CreatorProfileHeaderProps = {
  identity: CreatorProfileIdentity;
  stats: CreatorProfileStats;
};

export function CreatorProfileHeader({ identity, stats }: CreatorProfileHeaderProps) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="relative h-40 sm:h-52 md:h-60">
        {identity.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={identity.coverImage}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="eager"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 70%, #1a1a1a), color-mix(in srgb, var(--color-accent) 30%, #0f0f0f))",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 md:flex-row md:items-end md:gap-6">
          <div
            className="relative size-24 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--color-surface)] bg-[var(--color-surface-secondary)] shadow-lg sm:size-28"
            style={{ willChange: "transform" }}
          >
            {identity.avatarImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={identity.avatarImage}
                alt={identity.displayName}
                className="size-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-3xl font-black text-[var(--color-accent)]">
                {identity.displayName.charAt(0)}
              </div>
            )}
            {identity.isOnline && (
              <span
                className="absolute bottom-1.5 right-1.5 size-3 rounded-full border-2 border-[var(--color-surface)] bg-emerald-500"
                aria-label="Online"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-black tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-3xl">
                {identity.displayName}
              </h1>
              {identity.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  <BadgeCheck className="size-3.5" />
                  Verified
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--color-accent)]">
                <Sparkles className="size-3.5" />
                {CREATOR_LEVEL_LABELS[identity.level]}
              </span>
            </div>

            <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-[var(--color-text-secondary)] sm:text-[15px]">
              {identity.bio}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-muted)]">
              <span className="inline-flex items-center gap-1">
                <Globe className="size-3.5" />
                {identity.country}
              </span>
              <span className="inline-flex items-center gap-1">
                <Languages className="size-3.5" />
                {identity.languages.join(", ")}
              </span>
              <span>{formatJoinDate(identity.joinedAt)}</span>
              <span className="text-emerald-600 dark:text-emerald-400">{identity.lastActiveLabel}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "Followers", value: formatCount(stats.followers) },
            { label: "Following", value: formatCount(stats.following) },
            { label: "Total sales", value: formatCount(stats.totalSales) },
            { label: "Rating", value: stats.rating.toFixed(1) },
            { label: "Response", value: stats.responseTime },
            { label: "Products", value: formatCount(stats.productsCount) },
            { label: "Videos", value: formatCount(stats.videosCount) },
            { label: "Communities", value: formatCount(stats.communitiesCount) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-3 py-2.5"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {stat.label}
              </p>
              <p className="mt-0.5 text-sm font-black text-[var(--color-text-primary)]">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CreatorProfileHeaderSkeleton() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]" aria-hidden>
      <div className="h-40 animate-pulse bg-[var(--color-surface-secondary)] sm:h-52" />
      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <div className="-mt-12 flex gap-4">
          <div className="size-24 animate-pulse rounded-2xl bg-[var(--color-surface-secondary)]" />
          <div className="flex-1 space-y-2 pt-4">
            <div className="h-6 w-48 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-[var(--color-surface-secondary)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
