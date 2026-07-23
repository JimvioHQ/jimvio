"use client";

import Link from "next/link";
import { Ticket, Download, Tag, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCommercePrice,
  type CommerceEmbed,
} from "@/lib/community/commerce";
import { CommerceProductCard } from "./CommerceProductCard";
import { CommerceCourseCard } from "./CommerceCourseCard";
import { CommerceAffiliateCard } from "./CommerceAffiliateCard";
import { CommerceBookingCard } from "./CommerceBookingCard";
import { CommerceDonationCard } from "./CommerceDonationCard";

/** Renders the right commerce card for a message embed. */
export function MessageCommerceEmbed({
  embed,
  compact,
  onBook,
  onDonate,
}: {
  embed: CommerceEmbed;
  compact?: boolean;
  onBook?: () => void;
  onDonate?: (amount: number) => void;
}) {
  if (embed.kind === "product" || embed.kind === "marketplace_item") {
    return <CommerceProductCard embed={embed} compact={compact} />;
  }
  if (embed.kind === "course") {
    return <CommerceCourseCard embed={embed} compact={compact} />;
  }
  if (embed.kind === "affiliate") {
    return <CommerceAffiliateCard embed={embed} compact={compact} />;
  }
  if (embed.kind === "booking") {
    return (
      <CommerceBookingCard embed={embed} compact={compact} onBook={onBook} />
    );
  }
  if (embed.kind === "donation" || embed.kind === "subscription") {
    return (
      <CommerceDonationCard
        embed={{
          ...embed,
          donationMode:
            embed.kind === "subscription"
              ? "monthly"
              : embed.donationMode ?? "support",
        }}
        compact={compact}
        onDonate={(amount) => onDonate?.(amount)}
      />
    );
  }

  return <GenericCommerceCard embed={embed} compact={compact} />;
}

function GenericCommerceCard({
  embed,
  compact,
}: {
  embed: CommerceEmbed;
  compact?: boolean;
}) {
  const Icon =
    embed.kind === "event_ticket"
      ? Ticket
      : embed.kind === "digital_download"
        ? Download
        : embed.kind === "coupon"
          ? Tag
          : CreditCard;
  const href = embed.href || "#";

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
        compact ? "max-w-[280px]" : "max-w-sm"
      )}
    >
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
        <Icon className="h-3 w-3" />
        {embed.kind.replace(/_/g, " ")}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
        {embed.title}
      </p>
      {embed.couponCode && (
        <p className="mt-1 font-mono text-[12px] text-[var(--color-text-secondary)]">
          Code: {embed.couponCode}
        </p>
      )}
      {embed.price != null && (
        <p className="mt-1 text-sm font-bold">
          {formatCommercePrice(embed.price, embed.currency)}
        </p>
      )}
      {href !== "#" && (
        <Link
          href={href}
          className="mt-2 inline-flex rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          View
        </Link>
      )}
    </article>
  );
}
