"use client";

import { Calendar, Clock, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCommercePrice,
  type CommerceEmbed,
} from "@/lib/community/commerce";
import { toast } from "sonner";

const TYPE_LABEL: Record<string, string> = {
  call: "Schedule Call",
  mentorship: "Mentorship",
  consulting: "Consulting",
  coaching: "Live Coaching",
};

export function CommerceBookingCard({
  embed,
  compact,
  onBook,
}: {
  embed: CommerceEmbed;
  compact?: boolean;
  onBook?: () => void;
}) {
  const label = TYPE_LABEL[embed.bookingType ?? "call"] ?? "Book session";

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
        compact ? "max-w-[280px]" : "max-w-sm"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
        Booking
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
        {embed.title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Video className="h-3 w-3" />
          {label}
        </span>
        {embed.durationMinutes != null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {embed.durationMinutes} min
          </span>
        )}
        {embed.sellerName && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {embed.sellerName}
          </span>
        )}
      </div>
      {embed.price != null && (
        <p className="mt-1.5 text-sm font-bold text-[var(--color-text-primary)]">
          {formatCommercePrice(embed.price, embed.currency)}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          onBook?.();
          toast.success("Booking request saved — schedule from your calendar");
        }}
        className="mt-2.5 w-full rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[11px] font-semibold text-white"
      >
        {label}
      </button>
    </article>
  );
}
