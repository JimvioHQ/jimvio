"use client";

import Link from "next/link";
import { Loader2, Mail, MessageCircle, Share2 } from "lucide-react";
import { useFollowUser } from "@/hooks/live/useFollowUser";
import { IdentityButton } from "@/components/identity/identity-ui";
import { cn } from "@/lib/utils";

/**
 * Follow + Message + Contact + Share CTAs for public Identity profiles.
 * Message deep-links into the existing hub inbox with the intended peer.
 */
export function IdentityProfileActions({
  userId,
  username,
  canBook,
  onBook,
  bookLabel,
  onShare,
  allowInAppContact = true,
}: {
  userId: string;
  username?: string | null;
  canBook?: boolean;
  onBook?: () => void;
  bookLabel?: string;
  onShare?: () => void;
  /** When false, Contact still links to services; Message is hidden. */
  allowInAppContact?: boolean;
}) {
  const { following, busy, toggle, ready } = useFollowUser(userId);

  const messageHref = `/communities/messages?peer=${encodeURIComponent(userId)}`;
  const contactHref = `/communities/messages?peer=${encodeURIComponent(userId)}&intent=contact`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void toggle().catch(() => undefined)}
        className={cn(
          "inline-flex h-10 min-w-[6.5rem] items-center justify-center rounded-lg px-4 text-[13px] font-semibold transition-colors",
          following
            ? "border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB]"
            : "bg-[#FF5A1F] text-white hover:bg-[#e84e18]",
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

      {allowInAppContact ? (
        <>
          <Link
            href={messageHref}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#111827] transition-colors hover:bg-[#F9FAFB]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Message
          </Link>
          <Link
            href={contactHref}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#111827] transition-colors hover:bg-[#F9FAFB]"
          >
            <Mail className="h-3.5 w-3.5" />
            Contact
          </Link>
        </>
      ) : (
        <Link
          href="#services"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#111827] transition-colors hover:bg-[#F9FAFB]"
        >
          <Mail className="h-3.5 w-3.5" />
          Contact
        </Link>
      )}

      {onShare ? (
        <button
          type="button"
          onClick={onShare}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#e84e18]"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      ) : null}

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
