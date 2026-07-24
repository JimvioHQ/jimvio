"use client";

import type { ElementType } from "react";
import {
  Ban,
  Crown,
  Mail,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { OwnerMemberOverview } from "@/lib/community/owner-console/members";

const CARDS: {
  key: keyof OwnerMemberOverview;
  label: string;
  icon: ElementType;
  tone: string;
}[] = [
  { key: "total", label: "Total Members", icon: Users, tone: "text-[var(--color-accent)] bg-[var(--color-accent-light)]" },
  { key: "online", label: "Online Members", icon: UserCheck, tone: "text-emerald-600 bg-emerald-500/10" },
  { key: "pending", label: "Pending Join Requests", icon: UserPlus, tone: "text-amber-600 bg-amber-500/10" },
  { key: "invited", label: "Invited Members", icon: Mail, tone: "text-sky-600 bg-sky-500/10" },
  { key: "banned", label: "Banned Members", icon: Ban, tone: "text-rose-600 bg-rose-500/10" },
  { key: "moderators", label: "Moderators", icon: Shield, tone: "text-violet-600 bg-violet-500/10" },
  { key: "admins", label: "Admins", icon: Crown, tone: "text-orange-600 bg-orange-500/10" },
  { key: "creators", label: "Creators", icon: Sparkles, tone: "text-fuchsia-600 bg-fuchsia-500/10" },
  { key: "growth7d", label: "Growth (7d)", icon: TrendingUp, tone: "text-teal-600 bg-teal-500/10" },
];

export function MembersOverview({
  overview,
}: {
  overview: OwnerMemberOverview;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div
              className={cn(
                "mb-3 flex h-9 w-9 items-center justify-center rounded-xl",
                card.tone
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
              {formatNumber(overview[card.key] ?? 0)}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">
              {card.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
