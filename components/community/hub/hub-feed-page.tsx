"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Radio, Mic, Users, Image as ImageIcon, Video, Scissors, BarChart3,
  Layers, Target, Bot, DollarSign, Play, ChevronRight, Loader2, Flame,
  Sparkles, Plus, GraduationCap, Calendar, Wallet, Heart, MessageSquare,
  Share2, Bookmark, Zap, TrendingUp, Eye,
} from "lucide-react";
import { FeedSection } from "@/components/community/workspace/sections/Feed";
import {
  HubAvatar, HubBadge, HubCard, HubLinkButton, HubSectionTitle, HubStatCard,
} from "./hub-ui";
import { HubAuthPrompt } from "./hub-auth-prompt";
import { cn } from "@/lib/utils";

const FEED_TABS = [
  { label: "For You", filter: "for-you" },
  { label: "Following", filter: "following" },
  { label: "Trending", filter: "trending" },
  { label: "Spaces", filter: "spaces" },
  { label: "Missions", filter: "missions" },
  { label: "AI Picks", filter: "ai-picks" },
] as const;

const CREATE_LINKS = [
  { icon: Radio, label: "Go Live", desc: "Start a live session", href: "/c/live", color: "live" },
  { icon: Mic, label: "Voice Room", desc: "Host audio chat", href: "/c/live", color: "social" },
  { icon: Scissors, label: "Upload Clip", desc: "Share a short video", href: "/c", color: "accent" },
  { icon: Target, label: "Create Mission", desc: "Challenge your community", href: "/c/missions", color: "live" },
] as const;

const HUB_QUICK_LINKS = [
  { icon: Radio, label: "Go Live", href: "/c/live", color: "live" },
  { icon: Target, label: "Missions", href: "/c/missions", color: "live" },
  { icon: GraduationCap, label: "Courses", href: "/c/courses", color: "events" },
  { icon: Calendar, label: "Events", href: "/c/events", color: "events" },
  { icon: Wallet, label: "Wallet", href: "/c/wallet", color: "growth" },
  { icon: Layers, label: "Spaces", href: "/c/spaces", color: "social" },
] as const;

type HubDashboard = {
  stats: {
    membersOnline: number;
    membersOnlineDelta: string | null;
    liveSessions: number;
    liveSessionsDelta: string | null;
    voiceRooms: number;
    voiceRoomsDelta: string | null;
    activeCommunities: number;
    activeCommunitiesDelta: string | null;
  };
  stories: Array<{
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    href: string;
    live: boolean;
  }>;
  user: {
    fullName: string;
    avatarUrl: string | null;
    username: string | null;
  } | null;
  insights: {
    postCount30d: number;
    engagement30d: number;
    communitiesJoined: number;
  };
  earnings: {
    total: number;
    monthChangePct: number | null;
    currency: string;
  };
  challenge: {
    title: string;
    description: string;
    completed: number;
    target: number;
  } | null;
  featuredLive: {
    id: string;
    title: string;
    hostName: string;
    href: string;
    watchingLabel: string | null;
  } | null;
};

function formatStat(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return value.toLocaleString();
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function FeatureStatCard({ label, value, delta, icon: Icon, color }: { label: string; value: string | number; delta?: string | null; icon: typeof Users; color: string }) {
  const colorVar = `var(--color-${color})`;
  return (
    <div className="relative group hover-lift animate-in animate-fade-in-up rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)] p-4 transition-all duration-300"
         style={{ background: `linear-gradient(135deg, var(--color-surface), var(--color-surface-secondary))` }}>
      <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
           style={{ background: `radial-gradient(circle at top right, ${colorVar}15, transparent 60%)` }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{label}</p>
          <p className="mt-1 text-[20px] font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>{value}</p>
          {delta && (
            <p className="mt-1 text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> {delta}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
             style={{ background: `${colorVar}15`, color: colorVar }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function HubFeedPage() {
  const [activeTab, setActiveTab] = useState<(typeof FEED_TABS)[number]["label"]>("For You");
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [data, setData] = useState<HubDashboard | null>(null);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const composerRef = useRef<HTMLDivElement>(null);

  const activeFilter = FEED_TABS.find((tab) => tab.label === activeTab)?.filter ?? "for-you";

  useEffect(() => {
    let cancelled = false;
    async function loadHub() {
      setLoading(true);
      try {
        const res = await fetch("/api/c/hub");
        if (res.status === 401) {
          if (!cancelled) setNeedsAuth(true);
          return;
        }
        if (!res.ok) return;
        const json = (await res.json()) as HubDashboard;
        if (!cancelled) {
          setNeedsAuth(false);
          setData(json);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadHub();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const idx = FEED_TABS.findIndex((tab) => tab.label === activeTab);
    const el = tabRefs.current[idx];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  const stats = data?.stats;
  const challenge = data?.challenge;
  const challengePct = challenge && challenge.target > 0
    ? Math.round((challenge.completed / challenge.target) * 100)
    : 0;

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-social)/3, transparent 40%)`,
         }}>
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-30"
           style={{
             backgroundImage: `radial-gradient(circle, var(--color-border) 1px, transparent 1px)`,
             backgroundSize: "24px 24px",
             maskImage: "radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, transparent 70%)",
           }} />

      <div className="relative mx-auto flex max-w-[1400px] gap-6 px-4 py-6 lg:px-8 xl:gap-8">
        {/* Left context rail (desktop) */}
        <aside className="hidden lg:block w-[80px] shrink-0 space-y-4 pt-2">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-3">
            <HubAvatar name="Jimvio" size={36} className="ring-2 ring-[var(--color-accent)]" />
            <span className="text-[10px] font-bold text-center" style={{ color: "var(--color-text-muted)" }}>All</span>
          </div>
          {stats && [
            { label: "Online", value: stats.membersOnline, icon: Users, color: "growth" },
            { label: "Live", value: stats.liveSessions, icon: Radio, color: "live" },
            { label: "Rooms", value: stats.voiceRooms, icon: MessageSquare, color: "social" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1 rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-2 hover-lift group"
                 style={{ borderColor: `var(--color-${s.color})/30` }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                   style={{ background: `var(--color-${s.color})/15`, color: `var(--color-${s.color})` }}>
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-[16px] font-black" style={{ color: "var(--color-text-primary)" }}>{formatStat(s.value)}</span>
              <span className="text-[9px] font-medium uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{s.label}</span>
            </div>
          ))}
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-6">
          {needsAuth && (
            <HubAuthPrompt
              compact
              nextPath="/c"
              description="Sign in to see your personalized stats, post to the feed, and join community conversations."
            />
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-in stagger-children">
            <FeatureStatCard label="Online now" value={loading ? "—" : formatStat(stats?.membersOnline ?? 0)} delta={stats?.membersOnlineDelta ?? undefined} icon={Users} color="growth" />
            <FeatureStatCard label="Live sessions" value={loading ? "—" : formatStat(stats?.liveSessions ?? 0)} delta={stats?.liveSessionsDelta ?? undefined} icon={Radio} color="live" />
            <FeatureStatCard label="Voice rooms" value={loading ? "—" : formatStat(stats?.voiceRooms ?? 0)} delta={stats?.voiceRoomsDelta ?? undefined} icon={Mic} color="social" />
            <FeatureStatCard label="Active communities" value={loading ? "—" : formatStat(stats?.activeCommunities ?? 0)} delta={stats?.activeCommunitiesDelta ?? undefined} icon={Layers} color="events" />
          </div>

          {/* Mobile / tablet quick links */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:hidden animate-in animate-slide-in-right">
            {HUB_QUICK_LINKS.map(({ icon: Icon, label, href, color }) => (
              <Link
                key={label}
                href={href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur px-3 py-2 text-[11px] font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-accent)]/30 hover-lift"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full"
                      style={{ background: `var(--color-${color})/15`, color: `var(--color-${color})` }}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </Link>
            ))}
          </div>

          {/* Creator challenge card */}
          {challenge && (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-secondary)] p-4 animate-in animate-fade-in-up hover-lift">
              <div className="absolute inset-0 -z-10 opacity-20" style={{ background: "radial-gradient(circle at 80% 20%, var(--color-accent)/30, transparent 60%)" }} />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--color-accent)/15", color: "var(--color-accent)" }}>
                  <Flame className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-bold" style={{ color: "var(--color-text-primary)" }}>Creator Challenge</p>
                    <span className="text-[11px] font-bold" style={{ color: "var(--color-accent)" }}>
                      {challenge.completed}/{challenge.target}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{challenge.title}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--color-surface-secondary)" }}>
                    <div className="h-full rounded-full transition-all duration-500 ease-out animate-in animate-fade-in-right"
                         style={{ width: `${challengePct}%`, background: "var(--color-accent)" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stories carousel */}
          <div className="animate-in animate-fade-in-up">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-primary)" }}>Stories</h3>
              <Link href="/c/events" className="text-[11px] font-semibold" style={{ color: "var(--color-accent)" }}>View all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              <button
                type="button"
                className="flex shrink-0 flex-col items-center gap-1.5 w-[64px]"
                aria-label="Add your story"
              >
                <div className="relative flex h-[64px] w-[64px] items-center justify-center rounded-full">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5" />
                  <Plus className="h-6 w-6" style={{ color: "var(--color-accent)" }} />
                </div>
                <span className="max-w-[60px] truncate text-[10px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>Your story</span>
              </button>
              {(data?.stories ?? []).map((s) => (
                <Link key={s.id} href={s.href} className="flex shrink-0 flex-col items-center gap-1.5 w-[64px] group">
                  <div className="relative flex h-[64px] w-[64px] items-center justify-center rounded-full">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--color-social)]/40 to-[var(--color-live)]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <HubAvatar name={s.name} src={s.avatar_url} size={64} live={s.live} />
                    {s.live && (
                      <span className="absolute -bottom-1 -right-1 animate-pulse flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-black text-white">LIVE</span>
                    )}
                  </div>
                  <span className="max-w-[60px] truncate text-[10px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    {s.name.split(" ")[0]}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick post composer */}
          <div ref={composerRef} className="animate-in animate-fade-in-up">
            <div className="transition-all duration-300 rounded-2xl">
              <div className={cn("rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4", composerExpanded && "shadow-xl")}>
                <div className="flex gap-3">
                  <HubAvatar
                    name={data?.user?.fullName ?? "You"}
                    src={data?.user?.avatarUrl}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className="rounded-xl border-2 bg-[var(--color-surface-secondary)]/50 px-3 py-3 transition-all duration-200"
                      style={{
                        borderColor: composerExpanded ? "var(--color-accent)/40" : "var(--color-accent)/20",
                        background: composerExpanded ? "var(--color-surface)" : "var(--color-surface-secondary)/50",
                      }}
                      onClick={() => { setComposerExpanded(true); composerRef.current?.focus(); }}
                    >
                      <input
                        type="text"
                        readOnly
                        placeholder={composerExpanded ? "" : "What's on your mind?"}
                        className="w-full bg-transparent text-[13px] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                        onFocus={(e) => {
                          setComposerExpanded(true);
                          e.currentTarget.blur();
                        }}
                      />
                    </div>
                    {composerExpanded && (
                      <div className="mt-3 animate-in animate-slide-in-down">
                        <div className="flex flex-wrap items-center gap-1">
                          {[
                            { icon: ImageIcon, label: "Photo" },
                            { icon: Video, label: "Video" },
                            { icon: Scissors, label: "Clip" },
                            { icon: BarChart3, label: "Poll" },
                            { icon: Sparkles, label: "AI Assist" },
                            { icon: Zap, label: "Boost" },
                          ].map(({ icon: Icon, label }) => (
                            <button key={label} type="button" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]" style={{ color: "var(--color-text-muted)" }}>
                              <Icon className="h-3.5 w-3.5" />{label}
                            </button>
                          ))}
                          <HubLinkButton href="/c/live" className="ml-auto rounded-lg px-3 py-1.5 text-[11px]">
                            <Radio className="mr-1 inline h-3.5 w-3.5" /> Go Live
                          </HubLinkButton>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feed tabs */}
          <div className="relative border-b border-[var(--color-border)]/30 bg-[var(--color-bg)]/50 backdrop-blur animate-in animate-fade-in">
            <div
              className="absolute bottom-0 h-[2.5px] rounded-full bg-[var(--color-accent)] transition-all duration-300 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
            <div className="flex gap-0 overflow-x-auto scrollbar-hide">
              {FEED_TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  type="button"
                  onClick={() => { setActiveTab(tab.label); setComposerExpanded(false); }}
                  className={`shrink-0 px-4 py-3 text-[12px] font-semibold transition-colors ${
                    activeTab === tab.label
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Community composer + feed posts */}
          <FeedSection key={activeFilter} filter={activeFilter} variant="hub" />
        </div>

        {/* Right sidebar */}
        <aside className="hidden w-[320px] shrink-0 space-y-4 lg:block xl:w-[340px] pt-2">
          {/* Create widget */}
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-black" style={{ color: "var(--color-text-primary)" }}>Create</h3>
              <HubBadge variant="orange">Quick</HubBadge>
            </div>
            <div className="space-y-1">
              {CREATE_LINKS.map(({ icon: Icon, label, desc, href, color }) => (
                <Link key={label} href={href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover-lift"
                      style={{ background: "transparent" }}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                       style={{ background: `var(--color-${color})/15`, color: `var(--color-${color})` }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold" style={{ color: "var(--color-text-primary)" }}>{label}</p>
                    <p className="truncate text-[10px]" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Live Now */}
          {data?.featuredLive && (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 hover-lift">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-800/50 to-zinc-950/50" />
              <div className="relative h-36 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-12 w-12 text-white/60" fill="white" />
                </div>
                <HubBadge variant="live" className="absolute left-3 top-3">LIVE</HubBadge>
                {data.featuredLive.watchingLabel && (
                  <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                    {data.featuredLive.watchingLabel}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Radio className="h-4 w-4 animate-pulse" style={{ color: "var(--color-accent)" }} />
                  <span className="text-[12px] font-black" style={{ color: "var(--color-text-primary)" }}>Live Now</span>
                </div>
                <p className="text-[13px] font-bold leading-snug" style={{ color: "var(--color-text-primary)" }}>{data.featuredLive.title}</p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>{data.featuredLive.hostName}</p>
                <HubLinkButton href={data.featuredLive.href} className="mt-3 w-full">Join Live</HubLinkButton>
              </div>
            </div>
          )}

          {/* Creator Insights */}
          {data?.insights && (
            <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-black" style={{ color: "var(--color-text-primary)" }}>Creator Insights</h3>
                <HubBadge variant="default">This month</HubBadge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Posts", value: data.insights.postCount30d, sub: "Last 30 days", icon: ImageIcon, color: "growth" },
                  { label: "Engagement", value: data.insights.engagement30d, sub: "Likes + comments", icon: Heart, color: "live" },
                  { label: "Communities", value: data.insights.communitiesJoined, sub: "Joined", icon: Users, color: "events" },
                  { label: "Live rooms", value: stats?.liveSessions ?? 0, sub: "Active now", icon: Radio, color: "social" },
                ].map(({ label, value, sub, icon: Icon, color }) => (
                  <div key={label} className="relative rounded-xl p-3 hover-lift"
                       style={{ background: `var(--color-${color})/5`, border: "1px solid var(--color-border)/20" }}>
                    <div className="flex items-center justify-between mb-1">
                      <Icon className="h-3.5 w-3.5" style={{ color: `var(--color-${color})` }} />
                    </div>
                    <p className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</p>
                    <p className="text-[18px] font-black" style={{ color: "var(--color-text-primary)" }}>{value.toLocaleString()}</p>
                    <p className="text-[10px] font-semibold text-emerald-500">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Assistant */}
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--color-social)/15", color: "var(--color-social)" }}>
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-bold" style={{ color: "var(--color-text-primary)" }}>AI Assistant</p>
                <p className="text-[10px] font-semibold text-emerald-500">Beta</p>
              </div>
            </div>
            <ul className="space-y-1.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
              <li>Your audience is most active during evenings.</li>
              <li>Post clips today to boost reach.</li>
            </ul>
            <input
              placeholder="Ask AI anything…"
              className="mt-3 w-full rounded-lg border border-[var(--color-border)]/30 bg-[var(--color-surface-secondary)]/50 px-3 py-2 text-[12px] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]/40 focus:bg-[var(--color-surface)]"
              style={{ color: "var(--color-text-primary)" }}
            />
          </div>

          {/* Activity feed */}
          {(data?.stories?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-black" style={{ color: "var(--color-text-primary)" }}>Activity</h3>
                <HubBadge variant="default">Recent</HubBadge>
              </div>
              <div className="space-y-2">
                {data!.stories.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 py-1 hover-lift rounded-lg px-2 transition-colors"
                       style={{ background: "transparent" }}>
                    <HubAvatar name={s.name} src={s.avatar_url} size={28} live={s.live} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold" style={{ color: "var(--color-text-primary)" }}>{s.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                        {s.live ? "Live now" : "Posted recently"}
                      </p>
                    </div>
                    {s.live && <HubBadge variant="live">LIVE</HubBadge>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Earnings Overview */}
          {data?.earnings && (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 hover-lift"
                 style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))" }}>
              <div className="absolute inset-0 -z-10 opacity-10" style={{ background: "radial-gradient(circle at 20% 80%, var(--color-social), transparent 50%)" }} />
              <div className="p-4 text-white">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <p className="text-[12px] font-bold">Earnings Overview</p>
                </div>
                <p className="mb-2 text-[28px] font-black tracking-tight">{formatMoney(data.earnings.total, data.earnings.currency)}</p>
                {data.earnings.monthChangePct != null && (
                  <p className="mb-3 text-[11px] text-white/80">
                    {data.earnings.monthChangePct >= 0 ? "+" : ""}
                    {data.earnings.monthChangePct.toFixed(1)}% this month
                  </p>
                )}
                <HubLinkButton
                  href="/dashboard/payments"
                  variant="secondary"
                  className="w-full !rounded-lg !border-white/25 !bg-white/15 !text-white hover:!bg-white/25"
                >
                  View Payouts
                </HubLinkButton>
              </div>
            </div>
          )}

          {/* Top Missions */}
          {challenge && (
            <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
              <h3 className="mb-3 text-[13px] font-black" style={{ color: "var(--color-text-primary)" }}>Top Missions</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold" style={{ color: "var(--color-text-primary)" }}>{challenge.title}</p>
                  <span className="text-[10px] font-bold text-emerald-500">{challengePct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--color-surface-secondary)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${challengePct}%`, background: "linear-gradient(90deg, var(--color-growth), var(--color-accent))" }} />
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--color-text-muted)" }} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}