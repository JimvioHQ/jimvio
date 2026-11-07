"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { FeedSidebarCard, FeedSidebarSkeleton } from "@/components/feed/FeedSidebarCard";
import { useFeedHubDiscover } from "@/components/feed/use-feed-hub-discover";
import { useFollowUser } from "@/hooks/live/useFollowUser";
import { POPULAR_USER_COUNT, type FeedSidebarPopularUser } from "@/lib/feed/load-feed-sidebar";
import { cn, formatNumber, getInitials } from "@/lib/utils";
import { PresenceAvatarFrame } from "@/components/presence/PresenceAvatarFrame";
import { BlueVerifiedBadge } from "@/components/verification/BlueVerifiedBadge";

function UserAvatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url: string | null;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="shrink-0 rounded-full object-cover ring-1 ring-black/5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#ff7a30] font-bold text-white ring-1 ring-black/5"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}

function FollowButton({ userId }: { userId: string }) {
  const { following, busy, toggle, ready } = useFollowUser(userId);

  if (!ready) {
    return (
      <span className="inline-flex h-8 w-[4.5rem] shrink-0 items-center justify-center">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-text-muted)] motion-reduce:animate-none" />
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={following ? "Unfollow user" : "Follow user"}
      onClick={() => void toggle().catch(() => undefined)}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-full px-3 text-[11px] font-semibold transition-colors duration-200 motion-reduce:transition-none",
        following
          ? "border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
          : "border border-[#FF5A1F]/35 bg-[#FF5A1F]/10 text-[#FF5A1F] hover:bg-[#FF5A1F]/15"
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : following ? "Following" : "Follow"}
    </button>
  );
}

function PopularUserRow({ user }: { user: FeedSidebarPopularUser }) {
  return (
    <li className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
      <Link href={user.href} className="shrink-0 transition-opacity hover:opacity-90">
        <PresenceAvatarFrame userId={user.userId}>
          <UserAvatar name={user.name} url={user.avatarUrl} />
        </PresenceAvatarFrame>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={user.href} className="group block min-w-0">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary,#111827)] group-hover:text-[#FF5A1F]">
              {user.name}
            </p>
            <BlueVerifiedBadge verified={Boolean(user.verified)} size="sm" />
          </div>
          <p className="truncate text-[10.5px] text-[var(--color-text-muted,#6b7280)]">
            {user.username ? `@${user.username}` : "Creator"}
            {user.followerCount > 0 ? ` · ${formatNumber(user.followerCount)} followers` : ""}
          </p>
        </Link>
      </div>
      <FollowButton userId={user.userId} />
    </li>
  );
}

/** Up to five curated creators from real profiles — show fewer when fewer qualify. */
export function PopularUsersCard() {
  const { popularUsers, loading, popularReady } = useFeedHubDiscover();

  if (loading) {
    return (
      <FeedSidebarCard title="Popular Users" viewAllHref="/users/browse">
        <FeedSidebarSkeleton rows={5} />
      </FeedSidebarCard>
    );
  }

  if (!popularReady || popularUsers.length === 0) {
    return (
      <FeedSidebarCard title="Popular Users" viewAllHref="/users/browse">
        <p className="py-2 text-center text-[11px] text-[var(--color-text-muted,#6b7280)]">
          No users to show yet
        </p>
      </FeedSidebarCard>
    );
  }

  return (
    <FeedSidebarCard title="Popular Users" viewAllHref="/users/browse">
      <ul className="divide-y divide-[var(--color-border,#e5e7eb)]/60">
        {popularUsers.slice(0, POPULAR_USER_COUNT).map((user) => (
          <PopularUserRow key={user.userId} user={user} />
        ))}
      </ul>
    </FeedSidebarCard>
  );
}
