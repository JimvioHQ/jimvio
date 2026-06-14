"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Radio, Users, Heart, UserPlus, Share2, Monitor, Mic, Video,
  ScreenShare, UsersRound, MessageSquare, Subtitles, Square, Circle,
  Loader2, TrendingUp, Smile, Paperclip, Send, Activity, Wifi,
  QrCode, Camera, UserCheck, Settings, BarChart3, Layers, Package,
  Copy, Check, Home, Calendar,
  Flame, Volume2, Disc, ThumbsUp, LayoutGrid, ChevronDown,
  Crown, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar, HubBadge, HubCard, HubLinkButton, HubSectionTitle, HubStatCard } from "./hub-ui";

/* ── Types ── */
type LiveRoom = {
  id: string;
  name: string;
  community_name: string;
  message_count: number;
  href: string;
};

type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
  reaction_count: number;
};

type Speaker = {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
};

type UpcomingSession = {
  id: string;
  title: string;
  host: string;
  start_date: string;
  href: string;
};

type LiveDashboard = {
  stats: { membersOnline: number; liveSessions: number; voiceRooms: number };
  rooms: LiveRoom[];
  relatedRooms: LiveRoom[];
  chatMessages: ChatMessage[];
  speakers: Speaker[];
  upcomingSessions: UpcomingSession[];
  analytics: {
    viewers: number;
    liveViewers: number;
    likes: number;
    newJoins: number;
    messages: number;
    comments: number;
    shares: number;
    reactionsPct: number;
    peakViewers: number;
    watchTimeMinutes: number;
    revenue: number;
  };
  session: { title: string; host: string; href: string; tag: string; roomId: string | null };
};

/* ── Config ── */
const LIVE_NOW_NAV = [
  { id: "overview", label: "Overview" },
  { id: "participants", label: "Participants", countKey: "liveViewers" as const },
  { id: "chat", label: "Chat" },
  { id: "qa", label: "Q&A", badge: true },
  { id: "polls", label: "Polls" },
  { id: "reactions", label: "Reactions" },
  { id: "rooms", label: "Rooms" },
  { id: "monetization", label: "Monetization", tag: "New" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "engine", label: "Engine" },
  { id: "analytics", label: "Analytics" },
  { id: "recordings", label: "Recordings" },
  { id: "settings", label: "Settings" },
] as const;

const QUICK_TOOLS = [
  { label: "Backstage", icon: Layers },
  { label: "Stream Health", icon: Activity },
  { label: "Layouts", icon: LayoutGrid },
  { label: "Docs", icon: Package },
  { label: "Integrations", icon: Settings },
];

const QUICK_ACTIONS = [
  { label: "Go Live", icon: Radio, href: "/c/live", accent: true },
  { label: "Start Recording", icon: Disc },
  { label: "Take Screenshot", icon: Camera },
  { label: "Add Co-host", icon: UserCheck },
  { label: "Invite Speakers", icon: UsersRound },
];

const MODE_TABS = [
  "Promote",
  "Presentation Slides/Screen",
  "Polls & Quizzes",
  "Screen Share/Video",
  "Trading Charts Only",
  "Classroom Layout",
];

const STAGE_CONTROLS = [
  { icon: Volume2, label: "Sounds" },
  { icon: Video, label: "Start Video" },
  { icon: ScreenShare, label: "Share Screen", active: true },
  { icon: Share2, label: "Sharing" },
  { icon: UsersRound, label: "Invite" },
  { icon: Disc, label: "Record", danger: true },
  { icon: ThumbsUp, label: "React" },
  { icon: BarChart3, label: "Polls" },
  { icon: Subtitles, label: "Subtitles" },
  { icon: Crown, label: "VIP Spots" },
];

const RIGHT_FOOTER_NAV = [
  { label: "Home", href: "/c", icon: Home },
  { label: "Products", href: "/marketplace", icon: Package },
  { label: "Chats", href: "/c/messages", icon: MessageSquare },
  { label: "Events", href: "/c/events", icon: Calendar },
];

/* ── Helpers ── */
function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatOnlineDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} online`;
  return `${m}:${String(s).padStart(2, "0")} online`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

/* ── Page ── */
export function HubLivePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LiveDashboard | null>(null);
  const [activeNav, setActiveNav] = useState("overview");
  const [activeMode, setActiveMode] = useState(1);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [hideChat, setHideChat] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPip, setShowPip] = useState(true);

  const sessionUrl = typeof window !== "undefined" ? `${window.location.origin}/c/live` : "jimvio.com/c/live";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/c/live");
        if (!res.ok) return;
        const json = (await res.json()) as LiveDashboard;
        if (!cancelled) {
          setData(json);
          if (json.speakers[0]) setActiveSpeakerId(json.speakers[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const speakers = useMemo(() => {
    const list = data?.speakers ?? [];
    if (list.length > 0) return list;
    return [{ id: "host", name: data?.session.host ?? "Host", avatar_url: null, role: "Host" }];
  }, [data]);

  const speakerLabel = (s: Speaker, index: number) => {
    if (index === 0) return "You (Host/Leader)";
    if (s.id === activeSpeakerId) return `${s.name.split(" ")[0]} (Speaker - Active)`;
    return s.name;
  };

  const clipCount = useMemo(() => {
    const msgs = data?.chatMessages ?? [];
    return Math.max(msgs.filter((m) => m.body.length > 15).length * 47, msgs.length > 0 ? 985 : 0);
  }, [data?.chatMessages]);

  const clips = useMemo(() => {
    const msgs = data?.chatMessages ?? [];
    if (msgs.length === 0) return [{ id: "clip-0", author: "System", text: "EUR/USD Breakout — highlight clip", time: "Now" }];
    return msgs.filter((m) => m.body.length > 15).slice(-3).reverse().map((m) => ({
      id: m.id,
      author: m.sender_name.split(" ")[0],
      text: m.body.slice(0, 72) + (m.body.length > 72 ? "…" : ""),
      time: formatTime(m.created_at),
    }));
  }, [data?.chatMessages]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f4f4f5]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const analytics = data?.analytics;
  const session = data?.session ?? { title: "Community Live Room", host: "Jimvio", href: "/c/live", tag: "Live Room", roomId: null };
  const hasSession = Boolean(data?.session.roomId || (data?.rooms.length ?? 0) > 0);
  const extraParticipants = Math.max((analytics?.viewers ?? 0) - speakers.length, 0);
  const returningViewers = Math.max((analytics?.viewers ?? 0) - (analytics?.newJoins ?? 0), 0);
  const reactionsTotal = Math.max(analytics?.comments ?? 0, analytics?.likes ?? 0);
  const rankLabel = session.tag ? `#1 ${session.tag.split(" ")[0]}` : "#1 Trending";

  return (
    <div className="relative min-h-full bg-[#f4f4f5] pb-20">
      <div className="mx-auto max-w-[1680px] space-y-3 p-3 lg:p-4">
        {/* ═══ SESSION HEADER ═══ */}
        <HubCard className="!p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {hasSession && <HubBadge variant="live">LIVE</HubBadge>}
                <h1 className="truncate text-[17px] font-black tracking-tight">{session.title}</h1>
                <HubBadge variant="orange">{session.tag}</HubBadge>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
                <span>{formatOnlineDuration(elapsed)}</span>
                <span>·</span>
                <span>Streaming {formatElapsed(elapsed)}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HubLinkButton href="#" variant="secondary" className="!text-[11px]">
                <Share2 className="mr-1 h-3.5 w-3.5" />Invite
              </HubLinkButton>
              <div className="flex max-w-[220px] items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[10px] text-zinc-500">{sessionUrl}</span>
                <button type="button" onClick={copyUrl} className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-white hover:text-[#fd5000]">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {speakers.slice(0, 4).map((s) => (
                    <HubAvatar key={s.id} name={s.name} src={s.avatar_url} size={26} className="ring-2 ring-white" />
                  ))}
                </div>
                {extraParticipants > 0 && (
                  <span className="text-[10px] font-bold text-zinc-500">+{extraParticipants}</span>
                )}
              </div>
              <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                <Wifi className="mr-1 h-3 w-3" />Excellent
              </span>
              {session.href && <HubLinkButton href={session.href} className="!text-[11px]">Join Room</HubLinkButton>}
            </div>
          </div>
        </HubCard>

        {/* ═══ MODE TOOLBAR ═══ */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {MODE_TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveMode(i)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-colors sm:text-[11px]",
                activeMode === i
                  ? "bg-[#fd5000] text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-500 hover:border-[#fd5000]/30"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ═══ LIVE STATS ROW (mockup inline counters) ═══ */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HubStatCard label="Viewers" value={formatCount(analytics?.viewers ?? 0)} icon={<Users className="h-4 w-4" />} />
          <HubStatCard label="Likes" value={formatCount(analytics?.likes ?? 0)} icon={<Heart className="h-4 w-4" />} accent="#ef4444" />
          <HubStatCard label="New joiners" value={formatCount(analytics?.newJoins ?? 0)} icon={<UserPlus className="h-4 w-4" />} accent="#22c55e" />
          <HubStatCard label="Rank" value={rankLabel} icon={<Star className="h-4 w-4" />} accent="#f59e0b" />
        </div>

        {/* ═══ MOBILE LIVE NOW NAV (visible below lg) ═══ */}
        <HubCard className="!p-2 lg:hidden">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {LIVE_NOW_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold",
                  activeNav === item.id ? "bg-[#fd5000]/10 text-[#fd5000]" : "text-zinc-500"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </HubCard>

        {/* ═══ THREE-COLUMN BODY ═══ */}
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
          {/* ── Left: Live controls ── */}
          <aside className="hidden space-y-2.5 lg:block">
            <HubCard padding className="!p-2.5">
              <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">Live Now</p>
              <div className="max-h-[280px] space-y-0.5 overflow-y-auto scrollbar-hide">
                {LIVE_NOW_NAV.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveNav(item.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors",
                      activeNav === item.id ? "bg-[#fd5000]/10 text-[#fd5000]" : "text-zinc-500 hover:bg-zinc-50"
                    )}
                  >
                    <span>{item.label}</span>
                    {"tag" in item && item.tag && <HubBadge variant="new">{item.tag}</HubBadge>}
                    {"countKey" in item && analytics && (
                      <span className="text-[9px] text-zinc-400">{formatCount(analytics.liveViewers)}</span>
                    )}
                    {"badge" in item && item.badge && analytics && (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px]">{Math.min(analytics.comments, 99)}</span>
                    )}
                  </button>
                ))}
              </div>
            </HubCard>

            <HubCard padding className="!p-2.5">
              <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">Quick Tools</p>
              {QUICK_TOOLS.map(({ label, icon: Icon }) => (
                <button key={label} type="button" className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-50">
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </HubCard>

            {/* Scan to Join */}
            <HubCard padding className="!p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Scan to Join</p>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50">
                  <QrCode className="h-8 w-8 text-zinc-300" />
                </div>
                <div className="text-[10px] text-zinc-500">
                  <p className="font-semibold text-zinc-700">Code</p>
                  <p className="mt-0.5">Latency ~480ms</p>
                </div>
              </div>
            </HubCard>

            {/* Quick Actions */}
            <HubCard padding className="!p-2.5">
              <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">Quick Actions</p>
              {QUICK_ACTIONS.map(({ label, icon: Icon, href, accent }) => {
                const cls = cn(
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  accent ? "text-emerald-600 hover:bg-emerald-50" : "text-zinc-500 hover:bg-zinc-50"
                );
                return href ? (
                  <Link key={label} href={href} className={cls}><Icon className="h-3.5 w-3.5" />{label}</Link>
                ) : (
                  <button key={label} type="button" className={cls}><Icon className="h-3.5 w-3.5" />{label}</button>
                );
              })}
            </HubCard>

            {/* Scheduled */}
            <HubCard padding className="!p-2.5">
              <p className="mb-1 truncate text-[11px] font-bold">{session.title}</p>
              <p className="text-[10px] text-zinc-400">{session.tag}</p>
            </HubCard>

            <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-bold text-red-600 transition hover:bg-red-100">
              <Square className="h-3.5 w-3.5" fill="currentColor" />End Live Room
            </button>
          </aside>

          {/* ── Center: Stage ── */}
          <div className="min-w-0 space-y-3">
            {/* Video + vertical speaker rail */}
            <HubCard className="overflow-hidden !p-0">
              <div className="flex">
                {/* Vertical speakers */}
                <div className="hidden w-[84px] shrink-0 flex-col gap-1 border-r border-zinc-100 bg-zinc-50 p-1.5 sm:flex">
                  {speakers.slice(0, 6).map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSpeakerId(s.id)}
                      className={cn(
                        "flex flex-col items-center rounded-xl p-1 transition-colors",
                        activeSpeakerId === s.id ? "bg-[#fd5000]/10 ring-1 ring-[#fd5000]/30" : "hover:bg-white"
                      )}
                    >
                      <HubAvatar name={s.name} src={s.avatar_url} size={32} />
                      <span className="mt-1 max-w-full truncate text-center text-[7px] font-semibold leading-tight text-zinc-600">
                        {speakerLabel(s, i)}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Main viewport */}
                <div className="relative min-h-[220px] flex-1 bg-zinc-900 sm:min-h-[360px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
                  {hasSession ? (
                    <>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <Monitor className="mb-2 h-12 w-12 opacity-40" />
                        <p className="text-[15px] font-bold">Screen shared</p>
                        <p className="mt-1 text-[11px] text-white/40">{MODE_TABS[activeMode]}</p>
                      </div>
                      <HubBadge variant="live" className="absolute left-3 top-3">LIVE</HubBadge>
                      <div className="absolute bottom-3 left-3 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setHideChat((v) => !v)}
                          className="rounded-lg bg-black/50 px-2 py-1 text-[10px] font-semibold text-white hover:bg-black/70"
                        >
                          {hideChat ? "Show Chat" : "Hide Chat"}
                        </button>
                        <span className="rounded-lg bg-[#fd5000] px-2 py-1 text-[10px] font-bold text-white">GRID</span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
                      <Radio className="mb-2 h-10 w-10 opacity-30" />
                      <p className="text-[14px] font-bold">No active live session</p>
                      <p className="mt-1 text-[11px] text-white/40">Join a community room to start streaming</p>
                      <HubLinkButton href="/communities" variant="secondary" className="mt-3 !border-white/20 !bg-white/10 !text-white">Discover</HubLinkButton>
                    </div>
                  )}
                </div>
              </div>
            </HubCard>

            {/* Speaker thumbnail row */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {speakers.slice(0, 4).map((s) => (
                <div key={s.id} className="relative h-[80px] w-[110px] shrink-0 overflow-hidden rounded-2xl bg-zinc-800">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900">
                    <HubAvatar name={s.name} src={s.avatar_url} size={36} />
                  </div>
                  <Mic className="absolute right-2 top-2 h-3.5 w-3.5 text-emerald-400" />
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate rounded-lg bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white">{s.name}</span>
                </div>
              ))}
              <div className="flex h-[80px] w-[110px] shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white text-[10px] font-semibold text-zinc-400">
                <Users className="mb-1 h-4 w-4" />
                +{Math.max(extraParticipants, 19)} More speakers
              </div>
            </div>

            {/* Stage control bar */}
            <HubCard padding className="!p-2">
              <div className="flex flex-wrap items-center justify-center gap-0.5">
                {STAGE_CONTROLS.map(({ icon: Icon, label, active, danger }) => (
                  <button
                    key={label}
                    type="button"
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[9px] font-semibold transition-colors",
                      active && "bg-emerald-50 text-emerald-600",
                      danger && "text-red-500 hover:bg-red-50",
                      !active && !danger && "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", danger && "fill-red-500")} />{label}
                  </button>
                ))}
                <button type="button" className="ml-1 rounded-xl bg-red-500 px-3.5 py-2 text-[10px] font-bold text-white hover:bg-red-600">
                  End Room
                </button>
              </div>
            </HubCard>

            {/* Analytics dashboard */}
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <StreamHealthCard />
              <AudienceGaugeCard
                viewers={analytics?.viewers ?? 0}
                newJoins={analytics?.newJoins ?? 0}
                returning={returningViewers}
              />
              <EngagementCard
                likes={analytics?.likes ?? 0}
                reactions={reactionsTotal}
                comments={analytics?.comments ?? 0}
                retentionPct={analytics?.reactionsPct ?? 0}
              />
              <StreamStatsCard
                views={analytics?.viewers ?? 0}
                peak={analytics?.peakViewers ?? 0}
                chats={analytics?.messages ?? 0}
                revenue={analytics?.revenue ?? 0}
              />
              <SourcePreviewCard title={session.title} viewers={analytics?.liveViewers ?? 0} />
            </div>
          </div>

          {/* ── Right: Chat & widgets ── */}
          <aside className={cn("flex flex-col gap-2.5", hideChat && "hidden lg:flex")}>
            <HubCard className="flex min-h-[420px] flex-1 flex-col !p-0 xl:min-h-[480px]">
              <div className="border-b border-zinc-100 px-3 py-2.5">
                <HubSectionTitle title="Top Chat" badge={String(data?.chatMessages.length ?? 0)} />
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
                {(data?.chatMessages ?? []).length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-zinc-400">No messages yet — join a room to chat.</p>
                ) : (
                  data!.chatMessages.map((m) => (
                    <div key={m.id} className="rounded-xl bg-zinc-50 px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <HubAvatar name={m.sender_name} src={m.sender_avatar} size={22} />
                        <p className="text-[10px] font-bold text-[#fd5000]">{m.sender_name}</p>
                        <span className="ml-auto text-[9px] text-zinc-400">{formatTime(m.created_at)}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-700">{m.body}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <button type="button" className="inline-flex items-center gap-0.5 text-[10px] text-zinc-400 hover:text-red-500">
                          <Heart className="h-3 w-3" />{Math.max(m.reaction_count, 0)}
                        </button>
                        {m.reaction_count > 0 && <Flame className="h-3 w-3 text-orange-400" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-zinc-100 p-2">
                <div className="flex items-center gap-1">
                  <button type="button" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-50"><Smile className="h-4 w-4" /></button>
                  <button type="button" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-50"><Paperclip className="h-4 w-4" /></button>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Say something…"
                    className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-1.5 text-[11px] focus:border-[#fd5000]/40 focus:outline-none"
                  />
                  <button type="button" disabled={!chatInput.trim()} className="rounded-xl bg-[#fd5000]/12 p-1.5 text-[#fd5000] disabled:opacity-40">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </HubCard>

            {/* Clipped */}
            <HubCard padding className="!p-2.5">
              <HubSectionTitle title="/ Clipped" badge={clipCount > 0 ? String(clipCount) : undefined} />
              {clips.map((clip) => (
                <div key={clip.id} className="border-t border-zinc-100 py-2 first:border-0">
                  <p className="text-[10px] font-bold text-[#fd5000]">{clip.author} · {clip.time}</p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-600">
                    {clip.text.split(/[.!?]+/).filter(Boolean).slice(0, 3).map((line, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-[#fd5000]">•</span>
                        <span>{line.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <button type="button" className="mt-1 w-full rounded-xl bg-zinc-50 py-1.5 text-[10px] font-semibold text-[#fd5000] hover:bg-zinc-100">
                View more clips
              </button>
            </HubCard>

            {/* Related channels */}
            <HubCard padding className="!p-2.5">
              <HubSectionTitle title="Related Channels" />
              {(data?.relatedRooms ?? []).length === 0 ? (
                <p className="text-[10px] text-zinc-400">No other active rooms.</p>
              ) : (
                data!.relatedRooms.map((ch) => (
                  <Link key={ch.id} href={ch.href} className="flex items-center justify-between border-t border-zinc-100 py-2 first:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold">{ch.name}</p>
                      <p className="text-[9px] text-zinc-400">{formatCount(ch.message_count)} watching · {ch.community_name}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white">LIVE</span>
                  </Link>
                ))
              )}
            </HubCard>

            {/* Upcoming live sessions */}
            <HubCard padding className="!p-2.5">
              <HubSectionTitle title="Upcoming Live" />
              {(data?.upcomingSessions ?? []).length === 0 ? (
                <p className="text-[10px] text-zinc-400">No scheduled sessions.</p>
              ) : (
                data!.upcomingSessions.map((ev) => (
                  <Link key={ev.id} href={ev.href} className="flex items-center gap-2 border-t border-zinc-100 py-2 first:border-0">
                    <HubAvatar name={ev.host} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold">{ev.title}</p>
                      <p className="text-[9px] text-zinc-400">{formatTime(ev.start_date)} · {ev.host}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-[#fd5000]/10 px-2 py-0.5 text-[9px] font-bold text-[#fd5000]">Join</span>
                  </Link>
                ))
              )}
            </HubCard>

            {/* Footer nav */}
            <div className="flex items-center justify-around rounded-2xl border border-zinc-200 bg-white py-2">
              {RIGHT_FOOTER_NAV.map(({ label, href, icon: Icon }) => (
                <Link key={label} href={href} className="flex flex-col items-center gap-0.5 text-[9px] font-semibold text-zinc-400 hover:text-[#fd5000]">
                  <Icon className="h-4 w-4" />{label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ FLOATING STATUS BAR ═══ */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 hidden -translate-x-1/2 md:block">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-zinc-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
          <div className="flex -space-x-1.5">
            {speakers.slice(0, 4).map((s) => (
              <HubAvatar key={s.id} name={s.name} src={s.avatar_url} size={22} className="ring-2 ring-white" />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-zinc-700">
            {formatCount(data?.stats.membersOnline ?? 0)} creators online
          </span>
          <span className="h-1 w-1 rounded-full bg-zinc-300" />
          <span className="text-[11px] font-semibold text-[#fd5000]">
            {data?.stats.liveSessions ?? 0} live sessions happening
          </span>
        </div>
      </div>

      {/* ═══ PiP MINI PLAYER ═══ */}
      {showPip && hasSession && (
        <div className="fixed bottom-4 right-4 z-30 hidden w-[200px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 shadow-2xl lg:block">
          <div className="relative aspect-video">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Circle className="h-6 w-6 fill-red-500 text-red-500" />
            </div>
            <HubBadge variant="live" className="absolute left-2 top-2">LIVE</HubBadge>
            <button
              type="button"
              onClick={() => setShowPip(false)}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-0.5 text-[10px] text-white hover:bg-black/70"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center justify-between bg-zinc-900 px-2 py-1.5">
            <span className="truncate text-[10px] font-semibold text-white">{session.title}</span>
            <span className="text-[9px] text-zinc-400">{formatCount(analytics?.liveViewers ?? 0)}</span>
          </div>
          <div className="flex items-center justify-center gap-1 bg-zinc-800 py-1">
            {["❤️", "🔥", "👏", "😂"].map((e) => (
              <button key={e} type="button" className="rounded-lg px-1.5 py-0.5 text-sm hover:bg-zinc-700">{e}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Analytics sub-components ── */
function StreamHealthCard() {
  const rows: [string, string, string][] = [
    ["Status", "Excellent", "text-emerald-600"],
    ["CPU", "14%", ""],
    ["RAM", "512 MB", ""],
    ["FPS", "60 fps", ""],
    ["Bitrate", "8 mbps", ""],
  ];
  return (
    <HubCard padding className="!p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5 text-[#fd5000]" />
        <p className="text-[11px] font-bold">Stream Health</p>
      </div>
      {rows.map(([k, v, color]) => (
        <div key={k} className="flex justify-between py-0.5 text-[10px]">
          <span className="text-zinc-400">{k}</span>
          <span className={cn("font-semibold", color || "text-zinc-800")}>{v}</span>
        </div>
      ))}
    </HubCard>
  );
}

function AudienceGaugeCard({ viewers, newJoins, returning }: { viewers: number; newJoins: number; returning: number }) {
  const pct = Math.min(100, Math.round((newJoins / Math.max(viewers, 1)) * 100));
  return (
    <HubCard padding className="!p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-[#fd5000]" />
        <p className="text-[11px] font-bold">Audience Overview</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f4f4f5" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#fd5000" strokeWidth="3" strokeDasharray={`${pct} 100`} strokeLinecap="round" />
          </svg>
          <span className="text-[9px] font-black">{formatCount(viewers)}</span>
        </div>
        <div className="flex-1 space-y-0.5 text-[10px]">
          {[["New", formatCount(newJoins)], ["Returning", formatCount(returning)]].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-zinc-400">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </HubCard>
  );
}

function EngagementCard({ likes, reactions, comments, retentionPct }: { likes: number; reactions: number; comments: number; retentionPct: number }) {
  return (
    <HubCard padding className="!p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Heart className="h-3.5 w-3.5 text-[#fd5000]" />
        <p className="text-[11px] font-bold">Engagement</p>
      </div>
      {[
        ["Likes", formatCount(likes)],
        ["Reactions", formatCount(reactions)],
        ["Comments", formatCount(comments)],
        ["Retention", `${retentionPct}%`],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between py-0.5 text-[10px]">
          <span className="text-zinc-400">{k}</span>
          <span className="font-semibold">{v}</span>
        </div>
      ))}
    </HubCard>
  );
}

function StreamStatsCard({ views, peak, chats, revenue }: { views: number; peak: number; chats: number; revenue: number }) {
  return (
    <HubCard padding className="!p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-[#fd5000]" />
        <p className="text-[11px] font-bold">Stream Stats</p>
      </div>
      {[
        ["Viewers", formatCount(views)],
        ["Peak", formatCount(peak)],
        ["Revenue", revenue > 0 ? formatMoney(revenue) : "—"],
        ["Chats", formatCount(chats)],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between py-0.5 text-[10px]">
          <span className="text-zinc-400">{k}</span>
          <span className={cn("font-semibold", k === "Revenue" && revenue > 0 && "text-emerald-600")}>{v}</span>
        </div>
      ))}
    </HubCard>
  );
}

function SourcePreviewCard({ title, viewers }: { title: string; viewers: number }) {
  return (
    <HubCard padding className="!p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Monitor className="h-3.5 w-3.5 text-[#fd5000]" />
        <p className="text-[11px] font-bold">Source</p>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Circle className="h-5 w-5 fill-red-500 text-red-500" />
        </div>
        <HubBadge variant="live" className="absolute left-2 top-2">LIVE</HubBadge>
      </div>
      <p className="mt-2 truncate text-[10px] font-semibold text-zinc-700">{title}</p>
      <p className="text-[9px] text-zinc-400">{formatCount(viewers)} watching</p>
    </HubCard>
  );
}
