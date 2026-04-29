// "use client";

// import React from "react";
// import Link from "next/link";
// import {
//   TrendingUp, Play, Instagram, Youtube, Share2, CheckCircle,
//   Zap, Users,
// } from "lucide-react";
// import { cn, timeAgo as formatTimeAgo } from "@/lib/utils";
// import { useCurrency } from "@/context/CurrencyContext";

// const PLATFORM_ICONS: Record<string, any> = {
//   tiktok: Play,
//   instagram: Instagram,
//   youtube: Youtube,
//   x: Share2,
// };

// const PLATFORM_COLORS: Record<string, string> = {
//   tiktok: "#010101",
//   instagram: "#E1306C",
//   youtube: "#FF0000",
//   x: "#000000",
// };

// export type SharedCampaignRow = {
//   id: string;
//   title: string;
//   campaign_type: string;
//   status: string;
//   rate_per_1k_views: number;
//   total_budget: number;
//   spent_budget?: number;
//   submission_count?: number;
//   created_at?: string;
//   allowed_platforms?: string[];
//   media?: { url: string; usage: string }[];
//   vendors?: {
//     business_name: string;
//     business_slug: string;
//     logo_url: string;
//     business_logo?: string;
//   };
//   vendor?: {
//     business_name: string;
//     business_slug: string;
//     logo_url: string;
//     business_logo?: string;
//   };
// };

// interface CampaignCardProps {
//   c: SharedCampaignRow;
// }

// export function SharedCampaignCard({ c }: CampaignCardProps) {
//   const { formatMoney } = useCurrency();
//   const budgetPct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
//   const banner = c.media?.find((m) => m.usage === "banner")?.url;
//   const vendor = c.vendor || c.vendors;
//   const platforms = (c.allowed_platforms ?? ["tiktok"]).slice(0, 3);
//   const isUGC = c.campaign_type === "ugc";

//   return (
//     <Link
//       href={`/ugc/${c.id}`}
//       className="group flex flex-col rounded-sm overflow-hidden border border-border dark:border-border bg-white dark:bg-bg hover:border-orange-200 dark:hover:border-orange-900 hover:bg-black/10 dark:hover:bg-surface-secondary/50 transition-all duration-300"
//       style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}
//     >
//       {/* ── Compact banner image ── */}
//       <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/7" }}>
//         {/* fallback gradient */}
//         <div
//           className="absolute inset-0"
//           style={{
//             background: "linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)",
//             opacity: 0.2,
//           }}
//         />
//         {banner && (
//           <img
//             src={banner}
//             alt={c.title}
//             className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 opacity-90 group-hover:opacity-100"
//           />
//         )}
//         {/* Vignette - adapts to theme */}
//         <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-bg via-white/20 dark:via-bg/20 to-transparent" />
//         <div className="absolute inset-0 bg-gradient-to-r from-white/40 dark:from-bg/40 via-transparent to-transparent" />

//         {/* Campaign type pill — top-left */}
//         <div className="absolute top-3 left-3">
//           <span
//             className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-none"
//             style={{
//               background: isUGC
//                 ? "rgba(249,115,22,0.1)"
//                 : "rgba(99,102,241,0.1)",
//               border: isUGC
//                 ? "1px solid rgba(249,115,22,0.2)"
//                 : "1px solid rgba(99,102,241,0.2)",
//               color: isUGC ? "#ea580c" : "#4f46e5",
//             }}
//           >
//             <Zap className="h-2.5 w-2.5" />
//             {c.campaign_type || "UGC"}
//           </span>
//         </div>

//         {/* Platform icons — top-right */}
//         <div className="absolute top-3 right-3 flex gap-1">
//           {platforms.map((p) => {
//             const Icon = PLATFORM_ICONS[p] || Share2;
//             return (
//               <div
//                 key={p}
//                 className="w-6 h-6 rounded-sm flex items-center justify-center shadow-none bg-white border border-stone-200"
//               >
//                 <Icon className="h-3 w-3 text-stone-600" />
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* ── Card body ── */}
//       <div className="flex flex-col gap-3 p-4">
//         {/* Brand row */}
//         <div className="flex items-center gap-2">
//           <div className="relative flex-shrink-0">
//             {vendor?.business_logo || vendor?.logo_url ? (
//               <img
//                 src={vendor.business_logo || vendor.logo_url}
//                 className="w-7 h-7 rounded-sm object-cover"
//                 style={{ border: "1px solid rgba(0,0,0,0.08)" }}
//                 alt=""
//               />
//             ) : (
//               <div
//                 className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-black text-white"
//                 style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
//               >
//                 {vendor?.business_name?.[0] ?? "B"}
//               </div>
//             )}
//             <CheckCircle
//               className="h-3 w-3 absolute -bottom-0.5 -right-0.5"
//               style={{ color: "#3b82f6", fill: "#3b82f6" }}
//             />
//           </div>
//           <span className="text-[11px] font-semibold text-stone-500 dark:text-text-secondary truncate">
//             {vendor?.business_name ?? "Brand"}
//           </span>
//           <span className="ml-auto text-[10px] text-stone-400 dark:text-text-muted font-medium flex-shrink-0">
//             {c.created_at ? formatTimeAgo(c.created_at) : ""}
//           </span>
//         </div>

//         {/* Title */}
//         <h3
//           className="text-[13px] font-bold text-stone-900 dark:text-white leading-snug line-clamp-2 tracking-tight"
//           style={{ letterSpacing: "-0.01em" }}
//         >
//           {c.title}
//         </h3>

//         {/* Stats row */}
//         <div
//           className="grid grid-cols-2 gap-2 rounded-sm p-3 bg-[var(--color-bg)] dark:bg-surface border border-border dark:border-border-strong"
//         >
//           <div>
//             <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mb-0.5">
//               Payout
//             </p>
//             <p className="text-[13px] font-black text-stone-900 dark:text-white">
//               {formatMoney(c.rate_per_1k_views, "USD")}
//               <span className="text-[9px] text-stone-400 dark:text-text-muted ml-1">/1k</span>
//             </p>
//           </div>
//           <div>
//             <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mb-0.5">
//               Budget
//             </p>
//             <p className="text-[13px] font-black text-stone-900 dark:text-white">
//               {formatMoney(c.total_budget, "USD")}
//             </p>
//           </div>
//         </div>

//         {/* Budget bar + submissions */}
//         <div className="space-y-1.5">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-1.5">
//               <Users className="h-3 w-3 text-stone-400 dark:text-text-muted" />
//               <span className="text-[10px] text-stone-400 dark:text-text-muted font-medium">
//                 {c.submission_count ?? 0} submissions
//               </span>
//             </div>
//             <span className="text-[10px] font-bold text-stone-500 dark:text-text-secondary">
//               {Math.round(budgetPct)}% used
//             </span>
//           </div>
//           {/* Track */}
//           <div
//             className="h-1 w-full rounded-sm overflow-hidden bg-border dark:bg-surface-secondary"
//           >
//             <div
//               className="h-full rounded-sm transition-all duration-1000"
//               style={{
//                 width: `${budgetPct}%`,
//                 background: "linear-gradient(90deg,#f97316,#fb923c)",
//               }}
//             />
//           </div>
//         </div>

//         {/* CTA */}
//         <div
//           className="flex items-center justify-between pt-1"
//         >
//           <span
//             className="inline-flex items-center gap-1 text-[11px] font-bold"
//             style={{ color: "#ea580c" }}
//           >
//             <TrendingUp className="h-3 w-3" /> Earning now
//           </span>
//           <span
//             className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-sm transition-all group-hover:bg-orange-500 group-hover:text-white"
//             style={{
//               background: "rgba(249,115,22,0.08)",
//               color: "#ea580c",
//               border: "1px solid rgba(249,115,22,0.15)",
//             }}
//           >
//             Join →
//           </span>
//         </div>
//       </div>
//     </Link>
//   );
// }

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
  tiktok:    Play,
  instagram: Instagram,
  youtube:   Youtube,
  x:         Share2,
};

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  tiktok:    { bg: "bg-black/5",         text: "text-stone-800 dark:text-stone-200", border: "border-black/10"         },
  instagram: { bg: "bg-pink-500/8",      text: "text-pink-600",                      border: "border-pink-500/20"     },
  youtube:   { bg: "bg-rose-500/8",      text: "text-rose-600",                      border: "border-rose-500/20"     },
  x:         { bg: "bg-sky-500/8",       text: "text-sky-600",                       border: "border-sky-500/20"      },
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
  vendor?:  { business_name: string; business_slug: string; logo_url: string; business_logo?: string };
};

export function SharedCampaignCard({ c }: { c: SharedCampaignRow }) {
  const { formatMoney } = useCurrency();

  const budgetPct  = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
  const banner     = c.media?.find(m => m.usage === "banner")?.url;
  const vendor     = c.vendor || c.vendors;
  const platforms  = (c.allowed_platforms ?? ["tiktok"]).slice(0, 3);
  const isUGC      = c.campaign_type === "ugc";
  const isFixed    = c.payment_model === "fixed_per_content";
  const payRate    = isFixed
    ? formatMoney(c.fixed_rate ?? 0, "USD")
    : formatMoney(c.rate_per_1k_views, "USD");
  const payLabel   = isFixed ? "/ post" : "/ 1K";
  const budgetLeft = c.total_budget - (c.spent_budget ?? 0);
  const isFull     = budgetPct >= 95;

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
            const Icon   = PLATFORM_ICONS[p] ?? Share2;
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