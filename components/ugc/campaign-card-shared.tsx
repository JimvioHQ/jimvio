"use client";

import React from "react";
import Link from "next/link";
import {
  Play, Instagram, Youtube, Share2,
  Zap, Users, ArrowUpRight,
} from "lucide-react";
import { cn, timeAgo as formatTimeAgo } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  tiktok: Play,
  instagram: Instagram,
  youtube: Youtube,
  x: Share2,
};

export type SharedCampaignRow = {
  id: string;
  title: string;
  campaign_type: string;
  status: string;
  rate_per_1k_views: number;
  fixed_rate?: number;
  payment_model?: string;
  total_budget: number;
  spent_budget?: number;
  submission_count?: number;
  approved_count?: number;
  created_at?: string;
  allowed_platforms?: string[];
  media?: { url: string; usage: string }[];
  vendors?: { business_name: string; business_slug: string; logo_url: string; business_logo?: string };
  vendor?: { business_name: string; business_slug: string; logo_url: string; business_logo?: string };
};

export function SharedCampaignCard({ c }: { c: SharedCampaignRow }) {
  const { formatMoney } = useCurrency();

  const budgetPct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
  const banner = c.media?.find((m) => m.usage === "banner")?.url;
  const vendor = c.vendor || c.vendors;
  const platforms = (c.allowed_platforms ?? ["tiktok"]).slice(0, 2);
  const isUGC = c.campaign_type === "ugc";
  const isFixed = c.payment_model === "fixed_per_content";
  const payRate = isFixed
    ? formatMoney(c.fixed_rate ?? 0, "USD")
    : formatMoney(c.rate_per_1k_views, "USD");
  const payLabel = isFixed ? "/ post" : "/ 1K views";
  const budgetLeft = c.total_budget - (c.spent_budget ?? 0);
  const isFull = budgetPct >= 95;

  return (
    <Link
      href={`/ugc/${c.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-200",
        "border-[var(--color-border)] bg-[var(--color-surface)]",
        "hover:-translate-y-0.5 hover:border-[var(--color-accent)]/25 hover:shadow-[var(--shadow-md)]"
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface-secondary)]">
        {banner ? (
          <img
            src={banner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-start p-3">
            <span className="text-5xl font-black text-[var(--color-accent)]/10">
              {c.title?.[0] ?? "C"}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />

        <span
          className={cn(
            "absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            isUGC
              ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
              : "bg-violet-500/15 text-violet-600 dark:text-violet-400"
          )}
        >
          {c.campaign_type || "UGC"}
        </span>

        <div className="absolute right-2 top-2 flex gap-1">
          {platforms.map((p) => {
            const Icon = PLATFORM_ICONS[p] ?? Share2;
            return (
              <span
                key={p}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm"
              >
                <Icon className="h-3 w-3 text-[var(--color-text-muted)]" />
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 flex items-center gap-2">
          {vendor?.business_logo || vendor?.logo_url ? (
            <img
              src={vendor.business_logo || vendor.logo_url}
              alt=""
              className="h-5 w-5 rounded-md border border-[var(--color-border)] object-cover"
            />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--color-accent)] text-[9px] font-bold text-white">
              {vendor?.business_name?.[0] ?? "B"}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-[var(--color-text-muted)]">
            {vendor?.business_name ?? "Brand"}
          </span>
          {c.created_at && (
            <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
              {formatTimeAgo(c.created_at)}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 min-h-[2.4rem] text-[13px] font-semibold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
          {c.title}
        </h3>

        <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-[var(--color-border)] pt-2.5">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Payout
            </p>
            <p className="text-[14px] font-bold tabular-nums text-[var(--color-text-primary)]">
              {payRate}
              <span className="ml-0.5 text-[10px] font-normal text-[var(--color-text-muted)]">
                {payLabel}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Left
            </p>
            <p
              className={cn(
                "text-[13px] font-bold tabular-nums",
                isFull ? "text-rose-500" : "text-[var(--color-text-primary)]"
              )}
            >
              {formatMoney(Math.max(0, budgetLeft), "USD")}
            </p>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {c.submission_count ?? 0} joined
            </span>
            <span>{Math.round(budgetPct)}% used</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isFull ? "bg-rose-400" : "bg-[var(--color-accent)]"
              )}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Active
          </span>
          <span className="text-[11px] font-semibold text-[var(--color-accent)]">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
