"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp, Play, Instagram, Youtube, Share2, CheckCircle,
  Zap, Users,
} from "lucide-react";
import { cn, timeAgo as formatTimeAgo } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

const PLATFORM_ICONS: Record<string, any> = {
  tiktok: Play,
  instagram: Instagram,
  youtube: Youtube,
  x: Share2,
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "#010101",
  instagram: "#E1306C",
  youtube: "#FF0000",
  x: "#000000",
};

export type SharedCampaignRow = {
  id: string;
  title: string;
  campaign_type: string;
  status: string;
  rate_per_1k_views: number;
  total_budget: number;
  spent_budget?: number;
  submission_count?: number;
  created_at?: string;
  allowed_platforms?: string[];
  media?: { url: string; usage: string }[];
  vendors?: {
    business_name: string;
    business_slug: string;
    logo_url: string;
    business_logo?: string;
  };
  vendor?: {
    business_name: string;
    business_slug: string;
    logo_url: string;
    business_logo?: string;
  };
};

interface CampaignCardProps {
  c: SharedCampaignRow;
}

export function SharedCampaignCard({ c }: CampaignCardProps) {
  const { formatMoney } = useCurrency();
  const budgetPct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
  const banner = c.media?.find((m) => m.usage === "banner")?.url;
  const vendor = c.vendor || c.vendors;
  const platforms = (c.allowed_platforms ?? ["tiktok"]).slice(0, 3);
  const isUGC = c.campaign_type === "ugc";

  return (
    <Link
      href={`/ugc/${c.id}`}
      className="group flex flex-col rounded-2xl overflow-hidden border border-border dark:border-border bg-white dark:bg-bg hover:border-orange-200 dark:hover:border-orange-900 hover:bg-black/10 dark:hover:bg-surface-secondary/50 transition-all duration-300"
      style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}
    >
      {/* ── Compact banner image ── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/7" }}>
        {/* fallback gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)",
            opacity: 0.2,
          }}
        />
        {banner && (
          <img
            src={banner}
            alt={c.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 opacity-90 group-hover:opacity-100"
          />
        )}
        {/* Vignette - adapts to theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-bg via-white/20 dark:via-bg/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/40 dark:from-bg/40 via-transparent to-transparent" />

        {/* Campaign type pill — top-left */}
        <div className="absolute top-3 left-3">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
            style={{
              background: isUGC
                ? "rgba(249,115,22,0.1)"
                : "rgba(99,102,241,0.1)",
              border: isUGC
                ? "1px solid rgba(249,115,22,0.2)"
                : "1px solid rgba(99,102,241,0.2)",
              color: isUGC ? "#ea580c" : "#4f46e5",
            }}
          >
            <Zap className="h-2.5 w-2.5" />
            {c.campaign_type || "UGC"}
          </span>
        </div>

        {/* Platform icons — top-right */}
        <div className="absolute top-3 right-3 flex gap-1">
          {platforms.map((p) => {
            const Icon = PLATFORM_ICONS[p] || Share2;
            return (
              <div
                key={p}
                className="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <Icon className="h-3 w-3 text-stone-600" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col gap-3 p-4">
        {/* Brand row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            {vendor?.business_logo || vendor?.logo_url ? (
              <img
                src={vendor.business_logo || vendor.logo_url}
                className="w-7 h-7 rounded-lg object-cover"
                style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                alt=""
              />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
              >
                {vendor?.business_name?.[0] ?? "B"}
              </div>
            )}
            <CheckCircle
              className="h-3 w-3 absolute -bottom-0.5 -right-0.5"
              style={{ color: "#3b82f6", fill: "#3b82f6" }}
            />
          </div>
          <span className="text-[11px] font-semibold text-stone-500 dark:text-text-secondary truncate">
            {vendor?.business_name ?? "Brand"}
          </span>
          <span className="ml-auto text-[10px] text-stone-400 dark:text-text-muted font-medium flex-shrink-0">
            {c.created_at ? formatTimeAgo(c.created_at) : ""}
          </span>
        </div>

        {/* Title */}
        <h3
          className="text-[13px] font-bold text-stone-900 dark:text-white leading-snug line-clamp-2 tracking-tight"
          style={{ letterSpacing: "-0.01em" }}
        >
          {c.title}
        </h3>

        {/* Stats row */}
        <div
          className="grid grid-cols-2 gap-2 rounded-xl p-3 bg-[var(--color-bg)] dark:bg-surface border border-border dark:border-border-strong"
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mb-0.5">
              Payout
            </p>
            <p className="text-[13px] font-black text-stone-900 dark:text-white">
              {formatMoney(c.rate_per_1k_views, "USD")}
              <span className="text-[9px] text-stone-400 dark:text-text-muted ml-1">/1k</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mb-0.5">
              Budget
            </p>
            <p className="text-[13px] font-black text-stone-900 dark:text-white">
              {formatMoney(c.total_budget, "USD")}
            </p>
          </div>
        </div>

        {/* Budget bar + submissions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-stone-400 dark:text-text-muted" />
              <span className="text-[10px] text-stone-400 dark:text-text-muted font-medium">
                {c.submission_count ?? 0} submissions
              </span>
            </div>
            <span className="text-[10px] font-bold text-stone-500 dark:text-text-secondary">
              {Math.round(budgetPct)}% used
            </span>
          </div>
          {/* Track */}
          <div
            className="h-1 w-full rounded-full overflow-hidden bg-border dark:bg-surface-secondary"
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${budgetPct}%`,
                background: "linear-gradient(90deg,#f97316,#fb923c)",
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <div
          className="flex items-center justify-between pt-1"
        >
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold"
            style={{ color: "#ea580c" }}
          >
            <TrendingUp className="h-3 w-3" /> Earning now
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all group-hover:bg-orange-500 group-hover:text-white"
            style={{
              background: "rgba(249,115,22,0.08)",
              color: "#ea580c",
              border: "1px solid rgba(249,115,22,0.15)",
            }}
          >
            Join →
          </span>
        </div>
      </div>
    </Link>
  );
}