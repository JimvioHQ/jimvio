"use client";

import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreatorProfilePro } from "@/lib/community/economy";

export function CreatorProfileProCard({
  profile,
  className,
}: {
  profile: CreatorProfilePro;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Creator profile pro"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Creator Profile Pro
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] font-bold text-[var(--color-text-primary)]">
            Professional portfolio
            {profile.verified && (
              <BadgeCheck className="h-4 w-4 text-sky-500" aria-label="Verified" />
            )}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-accent-subtle)] px-2.5 py-1 text-[11px] font-black text-[var(--color-accent)]">
          AI Score {profile.aiCreatorScore}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {profile.skills.map((s) => (
          <span
            key={s}
            className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]"
          >
            {s}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {[
          ["Categories", profile.categories.join(" · ")],
          ["Languages", profile.languages.join(", ")],
          ["Countries", profile.countries.join(", ")],
          ["Audience", profile.audienceInsight],
          ["Revenue", profile.revenueMilestone],
          ["Campaigns", profile.campaignHistory],
          ["Success rate", profile.successRate],
          ["Community rep", profile.communityReputation],
          ["Commerce rep", profile.commerceReputation],
          ["Social", profile.socialAccounts.join(" · ")],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2"
          >
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {label}
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-medium text-[var(--color-text-primary)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {profile.portfolio.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Portfolio
          </p>
          <ul className="mt-1 space-y-1">
            {profile.portfolio.map((p) => (
              <li
                key={p}
                className="truncate text-[12.5px] text-[var(--color-text-secondary)]"
              >
                · {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Testimonials
        </p>
        <ul className="mt-1 space-y-1.5">
          {profile.testimonials.map((t) => (
            <li
              key={t}
              className="rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] text-[var(--color-text-secondary)]"
            >
              “{t}”
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
