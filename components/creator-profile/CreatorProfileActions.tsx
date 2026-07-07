"use client";

import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Headphones,
  Users,
  Store,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { FollowButton } from "@/components/marketplace/follow-button";
import type { CreatorProfileIdentity } from "@/lib/creator-profile/types";

type CreatorProfileActionsProps = {
  identity: CreatorProfileIdentity;
  isFollowing: boolean;
  primaryCommunityHref?: string;
};

export function CreatorProfileActions({
  identity,
  isFollowing,
  primaryCommunityHref,
}: CreatorProfileActionsProps) {
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: identity.displayName, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied");
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {identity.vendorId && (
        <FollowButton
          vendorId={identity.vendorId}
          initialFollowing={isFollowing}
          followLabel="Follow"
          className="h-10 rounded-xl px-4 font-bold"
        />
      )}
      <Link
        href="/dashboard/messages"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] font-semibold transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]"
      >
        <MessageCircle className="size-4" />
        Message
      </Link>
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] font-semibold transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]"
      >
        <Share2 className="size-4" />
        Share
      </button>
      {identity.storeHref && (
        <Link
          href={identity.storeHref}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] font-semibold transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]"
        >
          <Store className="size-4" />
          View Store
        </Link>
      )}
      {primaryCommunityHref && (
        <Link
          href={primaryCommunityHref}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-[13px] font-bold text-white transition-[transform,opacity] duration-200 hover:scale-[1.02] hover:opacity-90"
        >
          <Users className="size-4" />
          Join Community
        </Link>
      )}
      <Link
        href="/help"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] font-semibold transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]"
      >
        <Headphones className="size-4" />
        Support
      </Link>
      <button
        type="button"
        onClick={() => toast.message("Contact flow connects here")}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] font-semibold transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]"
      >
        <Mail className="size-4" />
        Contact
      </button>
      <button
        type="button"
        aria-label="Save creator"
        onClick={() => toast.message("Saved to favorites soon")}
        className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]"
      >
        <Heart className="size-4" />
      </button>
    </div>
  );
}
