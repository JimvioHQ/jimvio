"use client";

import Link from "next/link";
import {
  Search, TrendingUp, Flame, ShoppingBag, Play, PenLine, ArrowRight,
  ShoppingCart, CheckCircle, ArrowDownCircle, UserPlus, Zap,
  Megaphone, Users, Activity, Sparkles, Clock, ChevronRight, Bell, History,
} from "lucide-react";
import type { ActivityItem } from "@/types/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendingCampaignItem {
  name: string;
  earn: string;
  badge: string;
  badgeCls: string;
  href?: string;
  imageUrl?: string | null;
  brandName?: string | null;
}

export interface RecommendedCreator {
  initials: string;
  name: string;
  badge: string;
  color: string;
  avatarUrl?: string | null;
  username?: string | null;
  href?: string;
}

export interface RecentSearchItem {
  text: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_ACTIONS = [
  { label: "Create Product", icon: ShoppingBag, href: "/dashboard/products/new", color: "#fd5000" },
  { label: "Start Campaign", icon: Zap, href: "/dashboard/campaigns/new", color: "#8b5cf6" },
  { label: "Create Post", icon: PenLine, href: "/dashboard/posts/new", color: "#3b82f6" },
  { label: "Go Live", icon: Play, href: "/dashboard/live", color: "#e5484d" },
];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  sale: <ShoppingCart size={15} />,
  check: <CheckCircle size={15} />,
  payout: <ArrowDownCircle size={15} />,
  member: <UserPlus size={15} />,
};

const ICON_COLORS: Record<string, string> = {
  "#e9f9ef": "#30a46c",
  "#ede9ff": "#8b5cf6",
  "#fff3ee": "#fd5000",
  "#f0f4ff": "#3b82f6",
};

// ─── Reusable section header ──────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  count,
  href,
}: {
  icon: typeof Megaphone;
  title: string;
  count?: number;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-[#fd5000]/10 flex items-center justify-center">
          <Icon className="w-3 h-3 text-[#fd5000]" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-semibold text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="text-[11px] text-[#fd5000] font-medium hover:underline flex items-center gap-0.5 group/link"
        >
          See all
          <ChevronRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  activityItems: ActivityItem[];
  trendingCampaigns?: TrendingCampaignItem[];
  recommendedCreators?: RecommendedCreator[];
  recentSearches?: RecentSearchItem[];
}

export function DashboardSidebar({
  activityItems,
  trendingCampaigns,
  recommendedCreators,
  recentSearches,
}: Props) {
  const campaigns = trendingCampaigns ?? [];
  const creators = recommendedCreators ?? [];
  const searches = recentSearches ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Trending Campaigns ── */}
      <div className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors duration-200">
        <SectionHeader
          icon={Megaphone}
          title="Trending campaigns"
          count={campaigns.length}
          href="/ugc"
        />

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center mb-2">
              <Megaphone className="w-4 h-4 text-text-muted" />
            </div>
            <p className="text-[11px] text-text-muted">No active campaigns</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {campaigns.map((c, i) => (
              <Link
                key={i}
                href={c.href ?? "/ugc"}
                className="flex items-center gap-2.5 group p-1.5 -mx-1.5 rounded-lg hover:bg-surface-secondary transition-all duration-200"
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-border group-hover:ring-[#fd5000]/30 transition-all duration-200">
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, hsl(${c.name.charCodeAt(0) % 360},65%,40%), hsl(${c.name.charCodeAt(0) % 360},65%,55%))`,
                      }}
                    >
                      <span className="text-white text-sm font-bold">
                        {c.name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary truncate group-hover:text-[#fd5000] transition-colors">
                    {c.name}
                  </p>
                  <p className="text-[11px] text-text-muted truncate">{c.earn}</p>
                </div>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${c.badgeCls}`}
                >
                  {c.badge}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Recommended Creators ── */}
      <div className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors duration-200">
        <SectionHeader
          icon={Users}
          title="Recommended creators"
          count={creators.length}
          href="/creators"
        />

        {creators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center mb-2">
              <Users className="w-4 h-4 text-text-muted" />
            </div>
            <p className="text-[11px] text-text-muted">No recommendations yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {creators.map((c, i) => (
              <Link
                key={i}
                href={c.href ?? (c.username ? `/u/${c.username}` : "/creators")}
                className="flex items-center gap-2.5 group p-1.5 -mx-1.5 rounded-lg hover:bg-surface-secondary transition-all duration-200"
              >
                <Avatar className="h-10 w-10 ring-2 rounded-full ring-white dark:ring-[#111] shrink-0">
                  <AvatarImage src={c.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-[#fd5000] to-orange-600 text-white text-[11px] font-bold">
                    {c.name?.[0] + c.name?.[1]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary truncate group-hover:text-[#fd5000] transition-colors">
                    {c.name}
                  </p>
                  {c.username && (
                    <p className="text-[10px] text-text-muted truncate">@{c.username}</p>
                  )}
                </div>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
                  style={{ background: `${c.color}1a`, color: c.color }}
                >
                  {c.badge}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Searches ── */}
      {searches.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors duration-200">
          <SectionHeader icon={History} title="Recent searches" />
          <div className="flex flex-col gap-0.5">
            {searches.map((s, i) => (
              <Link
                key={i}
                href={`/search?q=${encodeURIComponent(s.text)}`}
                className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-surface-secondary transition-colors group"
              >
                <Search
                  size={12}
                  className="text-text-muted group-hover:text-[#fd5000] transition-colors flex-shrink-0"
                />
                <span className="text-[12px] text-text-secondary group-hover:text-text-primary truncate transition-colors">
                  {s.text}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors duration-200">
        <SectionHeader icon={Sparkles} title="Quick actions" />
        <div className="grid grid-cols-2 gap-2">
          {SIDEBAR_ACTIONS.map((a, i) => {
            const Icon = a.icon;
            return (
              <Link
                key={i}
                href={a.href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-[12px] font-medium text-text-secondary hover:bg-surface-secondary hover:border-[#fd5000]/30 hover:text-text-primary transition-all duration-200 group"
              >
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{ background: `${a.color}1a`, color: a.color }}
                >
                  <Icon size={13} />
                </span>
                <span className="truncate">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors duration-200">
        <SectionHeader
          icon={Bell}
          title="Recent Activity"
          count={activityItems.length}
          href="/dashboard/notifications"
        />

        {activityItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center mb-2">
              <Activity className="w-4 h-4 text-text-muted" />
            </div>
            <p className="text-[11px] text-text-muted">No recent activity</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activityItems.map((a, i) => (
              <div
                key={i}
                className="flex gap-2.5 items-start py-1.5 px-1.5 -mx-1.5 rounded-lg hover:bg-surface-secondary transition-colors group cursor-pointer"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    background: a.iconBg,
                    color: ICON_COLORS[a.iconBg] ?? "#fd5000",
                  }}
                >
                  {ACTIVITY_ICONS[a.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary leading-snug truncate">
                    {a.title}
                  </p>
                  <p className="text-[11px] text-text-muted truncate">{a.sub}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[10px] text-text-muted mb-0.5 inline-flex items-center gap-0.5">
                    <Clock size={9} />
                    {a.time}
                  </p>
                  {a.amount && (
                    <p
                      className={`text-[12px] font-bold ${a.positive ? "text-[#30a46c]" : "text-[#e5484d]"
                        }`}
                    >
                      {a.amount}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Streak ── */}
      <Link
        href="/dashboard/streak"
        className="rounded-2xl p-4 flex items-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200 group relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #fff3ee, #ffe8de)",
          border: "1px solid #ffd5c2",
        }}
      >
        {/* Subtle decorative ring */}
        <div
          className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(253,80,0,0.2) 0%, transparent 70%)",
          }}
        />

        <div className="w-11 h-11 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Flame size={22} className="text-[#fd5000]" />
        </div>
        <div className="flex-1 min-w-0 relative">
          <p className="text-[13px] font-bold text-[#fd5000] flex items-center gap-1">
            Keep it up!
            <Sparkles size={11} className="text-[#fd5000]" />
          </p>
          <p className="text-[11px] text-[#c94700] truncate">
            Stay consistent to grow your streak.
          </p>
        </div>
        <ArrowRight
          size={16}
          className="text-[#fd5000] flex-shrink-0 transition-transform group-hover:translate-x-0.5 relative"
        />
      </Link>
    </div>
  );
}