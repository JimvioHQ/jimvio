"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Radio, Mic, Users, Image as ImageIcon, Video, Scissors, BarChart3,
  Layers, Target, Bot, DollarSign, Play, ChevronRight, Loader2, Flame,
  Sparkles, Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FeedSection } from "@/components/community/workspace/sections/Feed";
import {
  HubAvatar, HubBadge, HubCard, HubLinkButton, HubSectionTitle, HubStatCard,
} from "./hub-ui";

const FEED_TABS = [
  { label: "For You", filter: "for-you" },
  { label: "Following", filter: "following" },
  { label: "Trending", filter: "trending" },
  { label: "Spaces", filter: "spaces" },
  { label: "Missions", filter: "missions" },
  { label: "AI Picks", filter: "ai-picks" },
] as const;

const QUICK_ACTIONS = [
  { icon: ImageIcon, label: "Photo" },
  { icon: Video, label: "Video" },
  { icon: Scissors, label: "Clip" },
  { icon: BarChart3, label: "Poll" },
  { icon: Target, label: "Mission", href: "/c/missions" },
  { icon: Sparkles, label: "AI Assist" },
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
  return value.toLocaleString();
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function HubFeedPage() {
  const [activeTab, setActiveTab] = useState<(typeof FEED_TABS)[number]["label"]>("For You");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HubDashboard | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeFilter = FEED_TABS.find((tab) => tab.label === activeTab)?.filter ?? "for-you";

  useEffect(() => {
    let cancelled = false;
    async function loadHub() {
      setLoading(true);
      try {
        const res = await fetch("/api/c/hub");
        if (!res.ok) return;
        const json = (await res.json()) as HubDashboard;
        if (!cancelled) setData(json);
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
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto flex max-w-[1280px] gap-5 px-4 py-5 lg:px-6">
        {/* ── Main column ── */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <HubStatCard
              label="Online now"
              value={loading ? "—" : formatStat(stats?.membersOnline ?? 0)}
              delta={stats?.membersOnlineDelta ?? undefined}
              icon={<Users className="h-4 w-4" />}
              accent="#22c55e"
            />
            <HubStatCard
              label="Live sessions"
              value={loading ? "—" : formatStat(stats?.liveSessions ?? 0)}
              delta={stats?.liveSessionsDelta ?? undefined}
              icon={<Radio className="h-4 w-4" />}
              accent="#ef4444"
            />
            <HubStatCard
              label="Voice rooms"
              value={loading ? "—" : formatStat(stats?.voiceRooms ?? 0)}
              delta={stats?.voiceRoomsDelta ?? undefined}
              icon={<Mic className="h-4 w-4" />}
              accent="#8b5cf6"
            />
            <HubStatCard
              label="Active communities"
              value={loading ? "—" : formatStat(stats?.activeCommunities ?? 0)}
              delta={stats?.activeCommunitiesDelta ?? undefined}
              icon={<Layers className="h-4 w-4" />}
            />
          </div>

          {/* Creator challenge */}
          {challenge && (
            <HubCard>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fd5000]/10 text-[#fd5000]">
                  <Flame className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-bold text-[var(--color-text-primary)]">Creator Challenge</p>
                    <span className="text-[11px] font-bold text-[#fd5000]">
                      {challenge.completed}/{challenge.target}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{challenge.title}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                    <div className="h-full rounded-full bg-[#fd5000] transition-all" style={{ width: `${challengePct}%` }} />
                  </div>
                </div>
              </div>
            </HubCard>
          )}

          {/* Stories */}
          <HubCard>
            <HubSectionTitle
              title="Stories"
              action={<Link href="/c/events" className="text-[11px] font-semibold text-[#fd5000] hover:underline">View all</Link>}
            />
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                className="flex shrink-0 flex-col items-center gap-1.5"
                aria-label="Add your story"
              >
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-dashed border-[#fd5000]/40 bg-[#fd5000]/5">
                  <Plus className="h-5 w-5 text-[#fd5000]" />
                </div>
                <span className="max-w-[56px] truncate text-[10px] font-semibold text-[var(--color-text-secondary)]">Your story</span>
              </button>
              {(data?.stories ?? []).map((s) => (
                <Link key={s.id} href={s.href} className="flex shrink-0 flex-col items-center gap-1.5">
                  <HubAvatar
                    name={s.name}
                    src={s.avatar_url}
                    size={52}
                    live={s.live}
                    className={s.live ? "ring-2 ring-red-500 ring-offset-2" : "ring-2 ring-[#fd5000]/40 ring-offset-2"}
                  />
                  <span className="max-w-[56px] truncate text-[10px] font-semibold text-[var(--color-text-secondary)]">
                    {s.name.split(" ")[0]}
                  </span>
                </Link>
              ))}
            </div>
          </HubCard>

          {/* Quick post composer — matches mockup top card */}
          <HubCard>
            <div className="flex gap-3">
              <HubAvatar
                name={data?.user?.fullName ?? "You"}
                src={data?.user?.avatarUrl}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <div className="rounded-xl border-2 border-[#fd5000]/20 bg-[var(--color-surface-secondary,#fafafa)] px-3 py-2.5 transition focus-within:border-[#fd5000]/45">
                  <input
                    type="text"
                    readOnly
                    placeholder="What's on your mind?"
                    className="w-full bg-transparent text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                    onFocus={(e) => {
                      const composer = document.getElementById("hub-community-composer");
                      composer?.scrollIntoView({ behavior: "smooth", block: "center" });
                      composer?.focus();
                      e.currentTarget.blur();
                    }}
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-0.5">
                  {QUICK_ACTIONS.map(({ icon: Icon, label, ...rest }) => {
                    const href = "href" in rest ? rest.href : undefined;
                    const cls = "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]";
                    if (href) {
                      return (
                        <Link key={label} href={href} className={cls}>
                          <Icon className="h-3.5 w-3.5" />{label}
                        </Link>
                      );
                    }
                    return (
                      <button key={label} type="button" className={cls}>
                        <Icon className="h-3.5 w-3.5" />{label}
                      </button>
                    );
                  })}
                  <HubLinkButton href="/c/live" className="ml-auto !rounded-xl !px-3.5 !py-1.5 !text-[11px]">
                    <Radio className="mr-1 inline h-3.5 w-3.5" />Go Live
                  </HubLinkButton>
                </div>
              </div>
            </div>
          </HubCard>

          {/* Feed tabs — matches mockup underline style */}
          <div className="relative border-b border-[var(--color-border,#e4e4e7)] bg-[var(--color-bg,#f4f4f5)]">
            <div
              className="absolute bottom-0 h-[2px] rounded-full bg-[#fd5000] transition-all duration-200"
              style={{ left: indicator.left, width: indicator.width }}
            />
            <div className="flex gap-0 overflow-x-auto scrollbar-hide">
              {FEED_TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  type="button"
                  onClick={() => setActiveTab(tab.label)}
                  className={`shrink-0 px-4 py-3 text-[12px] font-semibold transition-colors ${
                    activeTab === tab.label
                      ? "text-[#fd5000]"
                      : "text-[var(--color-text-muted,#71717a)] hover:text-[var(--color-text-primary)]"
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

        {/* ── Right sidebar — matches mockup widgets ── */}
        <aside className="hidden w-[300px] shrink-0 space-y-4 xl:block">
          <HubCard>
            <HubSectionTitle title="Create" badge="Quick" />
            <div className="space-y-0.5">
              {[
                { icon: Radio, label: "Go Live", desc: "Start a live session", href: "/c/live", color: "#ef4444" },
                { icon: Mic, label: "Voice Room", desc: "Host audio chat", href: "/c/live", color: "#8b5cf6" },
                { icon: Scissors, label: "Upload Clip", desc: "Share a short video", href: "/c", color: "#fd5000" },
                { icon: Target, label: "Create Mission", desc: "Challenge your community", href: "/c/missions", color: "#3b82f6" },
              ].map(({ icon: Icon, label, desc, href, color }) => (
                <Link key={label} href={href} className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-[var(--color-surface-secondary)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${color}14`, color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{label}</p>
                    <p className="truncate text-[10px] text-[var(--color-text-muted)]">{desc}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                </Link>
              ))}
            </div>
          </HubCard>

          {/* Live Now — featured from API */}
          {data?.featuredLive && (
            <HubCard className="overflow-hidden !p-0">
              <div className="relative h-36 bg-zinc-900">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-10 w-10 text-white/70" fill="white" />
                </div>
                <HubBadge variant="live" className="absolute left-3 top-3">LIVE</HubBadge>
                {data.featuredLive.watchingLabel && (
                  <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                    {data.featuredLive.watchingLabel}
                  </span>
                )}
              </div>
              <div className="p-3">
                <HubSectionTitle title="Live Now" />
                <p className="text-[12px] font-bold leading-snug">{data.featuredLive.title}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{data.featuredLive.hostName}</p>
                <HubLinkButton href={data.featuredLive.href} className="mt-3 w-full">Join Live</HubLinkButton>
              </div>
            </HubCard>
          )}

          {data?.insights && (
            <HubCard>
              <HubSectionTitle title="Creator Insights" badge="This month" />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Posts", value: data.insights.postCount30d, sub: "Last 30 days" },
                  { label: "Engagement", value: data.insights.engagement30d, sub: "Likes + comments" },
                  { label: "Communities", value: data.insights.communitiesJoined, sub: "Joined" },
                  { label: "Live rooms", value: stats?.liveSessions ?? 0, sub: "Active now" },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-xl bg-[var(--color-surface-secondary)] p-2.5">
                    <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                    <p className="text-[16px] font-black">{value.toLocaleString()}</p>
                    <p className="text-[10px] font-semibold text-emerald-600">{sub}</p>
                  </div>
                ))}
              </div>
            </HubCard>
          )}

          <HubCard>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-bold">AI Assistant</p>
                <p className="text-[10px] text-emerald-600">Beta</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
              <li>• Your audience is most active during evenings.</li>
              <li>• Post clips today to boost reach.</li>
            </ul>
            <Input placeholder="Ask AI anything…" inputSize="sm" className="mt-3 rounded-xl" />
          </HubCard>

          {(data?.stories?.length ?? 0) > 0 && (
            <HubCard>
              <HubSectionTitle title="Activity" badge="Recent" />
              <div className="space-y-2">
                {data!.stories.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 py-1">
                    <HubAvatar name={s.name} src={s.avatar_url} size={28} live={s.live} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold">{s.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {s.live ? "Live now" : "Posted recently"}
                      </p>
                    </div>
                    {s.live && <HubBadge variant="live">LIVE</HubBadge>}
                  </div>
                ))}
              </div>
            </HubCard>
          )}

          {data?.earnings && (
            <HubCard className="overflow-hidden !p-0">
              <div className="bg-gradient-to-br from-[#fd5000] to-[#ff7a30] p-4 text-white">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <p className="text-[12px] font-bold">Earnings Overview</p>
                </div>
                <p className="mt-3 text-[24px] font-black tracking-tight">
                  {formatMoney(data.earnings.total, data.earnings.currency)}
                </p>
                {data.earnings.monthChangePct != null && (
                  <p className="text-[11px] text-white/90">
                    {data.earnings.monthChangePct >= 0 ? "+" : ""}
                    {data.earnings.monthChangePct.toFixed(1)}% this month
                  </p>
                )}
                <HubLinkButton
                  href="/dashboard/earnings"
                  variant="secondary"
                  className="mt-3 w-full !rounded-xl !border-white/25 !bg-white/15 !text-white hover:!bg-white/25"
                >
                  View Payouts
                </HubLinkButton>
              </div>
            </HubCard>
          )}

          {challenge && (
            <HubCard>
              <HubSectionTitle title="Top Missions" />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold">{challenge.title}</p>
                  <span className="text-[10px] font-bold text-emerald-600">{challengePct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${challengePct}%` }} />
                </div>
              </div>
            </HubCard>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
