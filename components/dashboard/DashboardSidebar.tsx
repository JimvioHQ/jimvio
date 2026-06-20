"use client";

import Link from "next/link";
import {
  Search, TrendingUp, ShoppingBag, Play, PenLine,
  ShoppingCart, CheckCircle, ArrowDownCircle, UserPlus, Zap,
  Megaphone, Users, Activity, Sparkles, Clock, Bell, History,
  ChevronRight,
} from "lucide-react";
import type { ActivityItem } from "@/types/dashboard";
import { ProfileImage } from "@/components/ui/profile-image";
import { JimvioAIPanel } from "@/components/ui/jimvio-ai-panel";

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
  badgeCls: string;
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

// ─── Reusable panel + section header (admin-style) ───────────────────────────

const PANEL_CLASS =
  "rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden";

function SidebarPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${PANEL_CLASS} ${className}`}>{children}</div>;
}

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
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
        <span className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate">
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-medium text-[var(--color-text-muted)] tabular-nums">
            ({count})
          </span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] font-medium flex items-center gap-0.5 shrink-0 transition-colors"
        >
          See all
          <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function ListBadge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ring-1 ring-inset flex-shrink-0 whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  activityItems: ActivityItem[];
  unreadNotifications?: number;
  trendingCampaigns?: TrendingCampaignItem[];
  recommendedCreators?: RecommendedCreator[];
  recentSearches?: RecentSearchItem[];
  showAIPanel?: boolean;
}

export function DashboardSidebar({
  activityItems,
  unreadNotifications = 0,
  trendingCampaigns,
  recommendedCreators,
  recentSearches,
  showAIPanel = false,
}: Props) {
  const campaigns = trendingCampaigns ?? [];
  const creators = recommendedCreators ?? [];
  const searches = recentSearches ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* ── Trending Campaigns ── */}
      <SidebarPanel>
        <SectionHeader
          icon={Megaphone}
          title="Trending campaigns"
          count={campaigns.length}
          href="/ugc"
        />

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Megaphone className="w-4 h-4 text-[var(--color-text-muted)] mb-2" />
            <p className="text-[11px] text-[var(--color-text-muted)]">No active campaigns</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {campaigns.map((c, i) => (
              <Link
                key={i}
                href={c.href ?? "/ugc"}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-secondary)]/60 transition-colors"
              >
                <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
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
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                        {c.name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">
                    {c.name}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">{c.earn}</p>
                </div>
                <ListBadge className={c.badgeCls}>{c.badge}</ListBadge>
              </Link>
            ))}
          </div>
        )}
      </SidebarPanel>

      {/* ── Recommended Creators ── */}
      <SidebarPanel>
        <SectionHeader
          icon={Users}
          title="Recommended creators"
          count={creators.length}
          href="/creators"
        />

        {creators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Users className="w-4 h-4 text-[var(--color-text-muted)] mb-2" />
            <p className="text-[11px] text-[var(--color-text-muted)]">No recommendations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {creators.map((c, i) => (
              <Link
                key={i}
                href={c.href ?? (c.username ? `/u/${c.username}` : "/creators")}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-secondary)]/60 transition-colors"
              >
                <ProfileImage
                  src={c.avatarUrl}
                  alt={c.name}
                  className="h-9 w-9 rounded-full shrink-0 border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">
                    {c.name}
                  </p>
                  {c.username && (
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">@{c.username}</p>
                  )}
                </div>
                <ListBadge className={c.badgeCls}>{c.badge}</ListBadge>
              </Link>
            ))}
          </div>
        )}
      </SidebarPanel>

      {/* ── Recent Searches ── */}
      {searches.length > 0 && (
        <SidebarPanel>
          <SectionHeader icon={History} title="Recent searches" />
          <div className="divide-y divide-[var(--color-border)]">
            {searches.map((s, i) => (
              <Link
                key={i}
                href={`/search?q=${encodeURIComponent(s.text)}`}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--color-surface-secondary)]/60 transition-colors"
              >
                <Search size={12} className="text-[var(--color-text-muted)] flex-shrink-0" />
                <span className="text-[12px] text-[var(--color-text-secondary)] truncate">
                  {s.text}
                </span>
              </Link>
            ))}
          </div>
        </SidebarPanel>
      )}

      {/* ── Quick Actions ── */}
      <SidebarPanel>
        <SectionHeader icon={Sparkles} title="Quick actions" />
        <div className="grid grid-cols-2 gap-px bg-[var(--color-border)]">
          {SIDEBAR_ACTIONS.map((a, i) => {
            const Icon = a.icon;
            return (
              <Link
                key={i}
                href={a.href}
                className="flex items-center gap-2 px-3 py-2.5 bg-[var(--color-surface)] text-[12px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]/60 hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Icon size={14} className="text-[var(--color-text-muted)] shrink-0" />
                <span className="truncate">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </SidebarPanel>

      {/* ── Recent Activity ── */}
      <SidebarPanel>
        <SectionHeader
          icon={Bell}
          title="Recent activity"
          count={unreadNotifications}
          href="/dashboard/notifications"
        />

        {activityItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Activity className="w-4 h-4 text-[var(--color-text-muted)] mb-2" />
            <p className="text-[11px] text-[var(--color-text-muted)]">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {activityItems.map((a, i) => (
              <div
                key={i}
                className="flex gap-3 items-start px-4 py-2.5 hover:bg-[var(--color-surface-secondary)]/60 transition-colors cursor-pointer"
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border border-[var(--color-border)]"
                  style={{
                    background: a.iconBg,
                    color: ICON_COLORS[a.iconBg] ?? "#fd5000",
                  }}
                >
                  {ACTIVITY_ICONS[a.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--color-text-primary)] leading-snug truncate">
                    {a.title}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">{a.sub}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5 inline-flex items-center gap-0.5">
                    <Clock size={9} />
                    {a.time}
                  </p>
                  {a.amount && (
                    <p
                      className={`text-[12px] font-semibold tabular-nums ${a.positive ? "text-[#30a46c]" : "text-[#e5484d]"
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
      </SidebarPanel>

      {showAIPanel && <JimvioAIPanel compact className="hidden xl:block" />}
    </div>
  );
}