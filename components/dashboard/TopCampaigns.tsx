import Link from "next/link";
import { Megaphone, ChevronRight, Sparkles, Flame, Users, Zap, Clock } from "lucide-react";
import type { Campaign } from "@/types/dashboard";

const BADGE_STYLES: Record<string, string> = {
  ugc: "bg-[#ede9ff] text-[#6e42ca] dark:bg-[#2d1f5e] dark:text-[#b89dff]",
  beginner: "bg-[#e9f9ef] text-[#1a7d4a] dark:bg-[#0d2e1c] dark:text-[#6ee7a0]",
  easy: "bg-[#e9f9ef] text-[#1a7d4a] dark:bg-[#0d2e1c] dark:text-[#6ee7a0]",
  unboxing: "bg-[#fff3ee] text-[#fd5000] dark:bg-[#200d00] dark:text-[#ff7a3d]",
  lifestyle: "bg-[#fef3c7] text-[#92400e] dark:bg-[#3d2a0a] dark:text-[#fcd34d]",
  tutorial: "bg-[#e0f2fe] text-[#0369a1] dark:bg-[#0c2540] dark:text-[#7dd3fc]",
  "product review": "bg-[#e8f4ff] text-[#0066cc] dark:bg-[#0a1f3d] dark:text-[#5fa8ff]",
  review: "bg-[#e8f4ff] text-[#0066cc] dark:bg-[#0a1f3d] dark:text-[#5fa8ff]",
};

function formatBadge(b: string): string {
  return b
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function getBadgeStyle(b: string): string {
  return BADGE_STYLES[b.toLowerCase()] ?? "bg-surface-secondary text-text-muted";
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

export function TopCampaigns({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col hover:border-border-hover transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#fd5000]/10 flex items-center justify-center">
            <Megaphone className="w-3.5 h-3.5 text-[#fd5000]" />
          </div>
          <span className="text-[13px] font-bold text-text-primary">Top Campaigns</span>
          {campaigns.length > 0 && (
            <span className="text-[10px] font-semibold text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded-full">
              {campaigns.length}
            </span>
          )}
        </div>
        <Link
          href="/ugc"
          className="text-[12px] text-[#fd5000] font-medium hover:underline flex items-center gap-0.5 group/link"
        >
          View all
          <ChevronRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>

      {/* List */}
      <div className="flex flex-col gap-1">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
              <Megaphone className="w-5 h-5 text-text-muted" />
            </div>
            <p className="text-[12px] font-semibold text-text-primary mb-1">No active campaigns</p>
            <p className="text-[11px] text-text-muted text-center mb-3">
              Brands launch new ones daily — check back soon
            </p>
            <Link
              href="/ugc"
              className="text-[11px] font-semibold text-[#fd5000] hover:underline"
            >
              Browse all campaigns →
            </Link>
          </div>
        ) : (
          campaigns.map((c) => {
            const isAlmostFull = c.progress >= 80;
            const isHot = c.joined >= 50;
            const isFresh = c.progress === 0;
            const days = daysUntil(c.endsAt);
            const isEndingSoon = days !== null && days <= 3;
            const campaignHref = `/ugc/${c.slug ?? c.id}`;

            return (
              <Link
                href={campaignHref}
                key={c.id}
                className="group p-2 -mx-2 rounded-xl hover:bg-surface-secondary transition-all duration-200"
              >
                <div className="flex gap-3 items-start">
                  {/* Image / fallback */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-11 h-11 rounded-lg ring-2 ring-border group-hover:ring-[#fd5000]/30 transition-all duration-200 overflow-hidden flex items-center justify-center text-white text-base font-bold"
                      style={{ background: c.imageColor }}
                    >
                      {c.imageUrl ? (
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fall back to the colored initial
                            const img = e.currentTarget;
                            img.style.display = "none";
                          }}
                        />
                      ) : (
                        c.imageInitial
                      )}
                    </div>
                    {isHot && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#fd5000] flex items-center justify-center shadow-sm shadow-[#fd5000]/40 ring-2 ring-surface">
                        <Flame size={9} className="text-white" />
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top: name + earn */}
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <p className="text-[12px] font-semibold text-text-primary truncate group-hover:text-[#fd5000] transition-colors duration-200">
                        {c.name}
                      </p>
                      <span className="text-[11px] font-bold text-[#fd5000] whitespace-nowrap flex-shrink-0">
                        {c.earn}
                      </span>
                    </div>

                    {/* Badges + status */}
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {c.badges.slice(0, 2).map((b) => (
                        <span
                          key={b}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getBadgeStyle(b)}`}
                        >
                          {formatBadge(b)}
                        </span>
                      ))}
                      {isAlmostFull && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fff3ee] text-[#fd5000] dark:bg-[#200d00] inline-flex items-center gap-0.5">
                          <Zap size={9} className="fill-current" />
                          Almost full
                        </span>
                      )}
                      {isEndingSoon && !isAlmostFull && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fff0f0] text-[#e5484d] dark:bg-[#2a1010] dark:text-[#f87171] inline-flex items-center gap-0.5">
                          <Clock size={9} />
                          {days === 0 ? "Ends today" : `${days}d left`}
                        </span>
                      )}
                    </div>

                    {/* Progress + meta — different display for fresh campaigns */}
                    {isFresh ? (
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-[#fd5000]" />
                        <span className="text-[10px] font-medium text-[#fd5000]">
                          Just launched · be the first to join
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="h-1 rounded-full bg-surface-secondary overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isAlmostFull
                              ? "bg-gradient-to-r from-[#fd5000] to-[#ff7a3d]"
                              : "bg-[#fd5000]"
                              }`}
                            style={{ width: `${c.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-text-muted inline-flex items-center gap-1">
                            <Users size={10} />
                            {c.joined} joined
                          </span>
                          <span className="text-[10px] font-medium text-text-muted">
                            {c.progress}% filled
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}