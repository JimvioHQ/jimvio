"use client";

import Link from "next/link";
import { Loader2, MessageCircle } from "lucide-react";
import { useFollowUser } from "@/hooks/live/useFollowUser";
import { IdentityButton } from "@/components/identity/identity-ui";
import { cn } from "@/lib/utils";

/**
 * Follow + Message CTAs for public Identity profiles.
 */
export function IdentityProfileActions({
  userId,
  username,
  canBook,
  onBook,
  bookLabel,
}: {
  userId: string;
  username?: string | null;
  canBook?: boolean;
  onBook?: () => void;
  bookLabel?: string;
}) {
  const { following, busy, toggle, ready } = useFollowUser(userId);

  return (
    <div className="flex flex-wrap items-center gap-2 pb-1">
      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void toggle().catch(() => undefined)}
        className={cn(
          "inline-flex h-10 min-w-[6.5rem] items-center justify-center rounded-full px-4 text-[13px] font-semibold transition-colors",
          following
            ? "border border-black/10 bg-white text-[#1C1B19] hover:bg-black/[0.03]"
            : "bg-[#FF5A1F] text-white hover:bg-[#e84e18]"
        )}
      >
        {!ready || busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : following ? (
          "Following"
        ) : (
          "Follow"
        )}
      </button>

      <Link
        href="/communities/messages"
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-4 text-[13px] font-semibold text-[#1C1B19] transition-colors hover:bg-black/[0.03]"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Message
      </Link>

      {canBook && onBook ? (
        <IdentityButton onClick={onBook}>{bookLabel ?? "Book"}</IdentityButton>
      ) : null}

      {username ? (
        <Link
          href={`/communities/explore?q=${encodeURIComponent(username)}`}
          className="sr-only"
        >
          Communities
        </Link>
      ) : null}
    </div>
  );
}
