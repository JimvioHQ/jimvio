"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Customer360Profile } from "@/lib/community/commerce/unified";

const FIELDS: Array<{ key: keyof Customer360Profile; label: string }> = [
  { key: "communityActivity", label: "Community activity" },
  { key: "orders", label: "Orders" },
  { key: "courses", label: "Courses" },
  { key: "memberships", label: "Memberships" },
  { key: "affiliateHistory", label: "Affiliate history" },
  { key: "supportHistory", label: "Support history" },
  { key: "wallet", label: "Wallet" },
  { key: "eventsAttended", label: "Events attended" },
  { key: "achievements", label: "Achievements" },
];

export function Customer360Card({
  profile,
  className,
}: {
  profile: Customer360Profile | null;
  className?: string;
}) {
  if (!profile) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Customer 360"
    >
      <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        Customer 360
      </h3>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--color-text-muted)]">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="text-[15px] font-bold text-[var(--color-text-primary)]">
            {profile.name}
          </p>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            {profile.points > 0
              ? `${profile.points.toLocaleString("en-US")} XP · high-value signal`
              : "Unified commerce profile"}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div
            key={f.key}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2"
          >
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {f.label}
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-medium text-[var(--color-text-primary)]">
              {String(profile[f.key])}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
