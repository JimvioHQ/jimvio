"use client";

import React from "react";
import Link from "next/link";
import {
  Play, Instagram, Youtube, Share2, CheckCircle,
  Zap, Users, ArrowUpRight, TrendingUp,
} from "lucide-react";
import { cn, timeAgo as formatTimeAgo } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

const PLATFORM_ICONS: Record<string, any> = {
  tiktok: Play,
  instagram: Instagram,
  youtube: Youtube,
  x: Share2,
};

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  tiktok: { bg: "bg-black/5", text: "text-stone-800 dark:text-stone-200", border: "border-black/10" },
  instagram: { bg: "bg-pink-500/8", text: "text-pink-600", border: "border-pink-500/20" },
  youtube: { bg: "bg-rose-500/8", text: "text-rose-600", border: "border-rose-500/20" },
  x: { bg: "bg-sky-500/8", text: "text-sky-600", border: "border-sky-500/20" },
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
  const banner = c.media?.find(m => m.usage === "banner")?.url;
  const vendor = c.vendor || c.vendors;
  const platforms = (c.allowed_platforms ?? ["tiktok"]).slice(0, 3);
  const isUGC = c.campaign_type === "ugc";
  const isFixed = c.payment_model === "fixed_per_content";
  const payRate = isFixed
    ? formatMoney(c.fixed_rate ?? 0, "USD")
    : formatMoney(c.rate_per_1k_views, "USD");
  const payLabel = isFixed ? "/ post" : "/ 1K";
  const budgetLeft = c.total_budget - (c.spent_budget ?? 0);
  const isFull = budgetPct >= 95;

  return (
    <Link
      href={`/ugc/${c.id}`}
      className={cn(
        "group flex flex-col rounded-xl overflow-hidden border transition-all duration-200",
        "border-[var(--color-border)] bg-[var(--color-surface)]",
        "hover:border-[var(--color-border-strong)] hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {/* ── Banner ── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/7" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-stone-100 dark:from-zinc-800 dark:to-zinc-900" />

        {banner && (
          <img
            src={banner}
            alt={c.title}
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-500"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)]/20 to-transparent" />

        {/* Type pill — top left */}
        <div className="absolute top-3 left-3">
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-wide border",
            isUGC
              ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
              : "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
          )}>
            <Zap className="h-2.5 w-2.5" />
            {c.campaign_type || "UGC"}
          </span>
        </div>

        {/* Platform icons — top right */}
        <div className="absolute top-3 right-3 flex gap-1">
          {platforms.map(p => {
            const Icon = PLATFORM_ICONS[p] ?? Share2;
            const colors = PLATFORM_COLORS[p] ?? { bg: "bg-[var(--color-surface)]", text: "text-[var(--color-text-muted)]", border: "border-[var(--color-border)]" };
            return (
              <div
                key={p}
                className={cn(
                  "h-6 w-6 rounded-lg border flex items-center justify-center",
                  colors.bg, colors.border
                )}
              >
                <Icon className={cn("h-3 w-3", colors.text)} />
              </div>
            );
          })}
        </div>

        {/* Budget nearly full warning */}
        {isFull && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold bg-rose-500/90 text-white">
              Almost Full
            </span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col gap-3.5 p-4 flex-1">

        {/* Vendor row */}
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            {vendor?.business_logo || vendor?.logo_url ? (
              <img
                src={vendor.business_logo || vendor.logo_url}
                className="h-6 w-6 rounded-lg object-cover border border-[var(--color-border)]"
                alt=""
              />
            ) : (
              <div className="h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white bg-orange-500 shrink-0">
                {vendor?.business_name?.[0] ?? "B"}
              </div>
            )}
            <CheckCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 text-blue-500 fill-blue-500/20" />
          </div>
          <span className="text-[11px] font-medium text-[var(--color-text-muted)] truncate flex-1">
            {vendor?.business_name ?? "Brand"}
          </span>
          {c.created_at && (
            <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 opacity-60">
              {formatTimeAgo(c.created_at)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2 tracking-tight">
          {c.title}
        </h3>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Payout
            </p>
            <p className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums">
              {payRate}
              <span className="text-[10px] font-normal text-[var(--color-text-muted)] ml-1">{payLabel}</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Remaining
            </p>
            <p className={cn(
              "text-sm font-bold tabular-nums",
              isFull ? "text-rose-500" : "text-[var(--color-text-primary)]"
            )}>
              {formatMoney(Math.max(0, budgetLeft), "USD")}
            </p>
          </div>
        </div>

        {/* Budget bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
              <Users className="h-3 w-3" />
              <span>{c.submission_count ?? 0} joined</span>
              {(c.approved_count ?? 0) > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="text-emerald-500 font-medium">{c.approved_count} approved</span>
                </>
              )}
            </div>
            <span className={cn(
              "text-[10px] font-semibold tabular-nums",
              isFull ? "text-rose-500" : "text-[var(--color-text-muted)]"
            )}>
              {Math.round(budgetPct)}%
            </span>
          </div>

          <div className="h-1 w-full rounded-full overflow-hidden bg-[var(--color-border)]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                isFull ? "bg-rose-400" : "bg-orange-500"
              )}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-between pt-0.5 mt-auto">
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>

          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150",
            "border-orange-500/20 bg-orange-500/8 text-orange-600 dark:text-orange-400",
            "group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500"
          )}>
            Join
            <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </span>
        </div>
      </div>
    </Link>
  );
}