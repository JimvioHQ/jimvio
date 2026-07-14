"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Radio,
  Users,
  MessageSquare,
  HelpCircle,
  BarChart2,
  SmilePlus,
  Layers,
  DollarSign,
  ShoppingBag,
  Cpu,
  BarChart3,
  Video,
  Settings,
  Calendar,
  Share2,
  Copy,
  Check,
  Plus,
  QrCode,
  Camera,
  CameraOff,
  ScreenShare,
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
  Volume2,
  RecordCircle,
  Focus,
  Zap,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

export type ScreenId =
  | "live-now"
  | "participants"
  | "chat"
  | "qa"
  | "polls"
  | "reactions"
  | "rooms"
  | "monetization"
  | "ecommerce"
  | "engine"
  | "analytics"
  | "recordings"
  | "settings";

export type BadgeVariant = "live" | "new" | "neutral";

interface LiveDashboardSession {
  id: string;
  title: string;
  roomType: string;
  status: "LIVE" | "ENDED" | "SCHEDULED";
  participantsCount: number;
  qaCount: number;
  pollsCount: number;
  ecommercePinnedCount: number;
  quality: string;
  durationSeconds: number;
}

interface MockUser {
  id: string;
  name: string;
  avatar: string;
  role: "host" | "cohost" | "speaker" | "viewer";
  isMuted: boolean;
  isVideoOn: boolean;
  isSpotlighted: boolean;
}

interface ChatMessage {
  id: number;
  sender: MockUser;
  text: string;
  time: string;
}

interface AiClip {
  id: string;
  title: string;
  thumbnail: string;
  timestamp: string;
  duration: string;
}

interface LiveDashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSessionChange?: (session: LiveDashboardSession | null) => void;
}

/* ─────────────────────────────────────────────────────────────
   Mock Data
   ───────────────────────────────────────────────────────────── */

const INITIAL_LIVE_DASHBOARD: LiveDashboardSession = {
  id: "mira-seto-001",
  title: "Mastering Glaze Faults & Corrections",
  roomType: "Workshop",
  status: "LIVE",
  participantsCount: 142,
  qaCount: 3,
  pollsCount: 2,
  ecommercePinnedCount: 2,
  quality: "1080p 60 FPS",
  durationSeconds: 1847,
};

const MOCK_USERS: Record<string, MockUser> = {
  "u-mira": { id: "u-mira", name: "Mira Seto", avatar: "https://i.pravatar.cc/150?u=mira", role: "host", isMuted: false, isVideoOn: true, isSpotlighted: true },
  "u-june": { id: "u-june", name: "June Park", avatar: "https://i.pravatar.cc/150?u=june", role: "cohost", isMuted: false, isVideoOn: true, isSpotlighted: false },
  "u-marcus": { id: "u-marcus", name: "Marcus Chen", avatar: "https://i.pravatar.cc/150?u=marcus", role: "speaker", isMuted: false, isVideoOn: true, isSpotlighted: false },
  "u-devon": { id: "u-devon", name: "Devon Lee", avatar: "https://i.pravatar.cc/150?u=devon", role: "speaker", isMuted: true, isVideoOn: false, isSpotlighted: false },
  "u-alex": { id: "u-alex", name: "Alex Rivera", avatar: "https://i.pravatar.cc/150?u=alex", role: "viewer", isMuted: true, isVideoOn: false, isSpotlighted: false },
};

const CURRENT_USER = MOCK_USERS["u-mira"];

const MOCK_AI_CLIPS: AiClip[] = [
  { id: "clip-1", title: "Fixing Crawling Glaze on Vertical Forms", thumbnail: "https://picsum.photos/seed/glaze1/160/90", timestamp: "12:34", duration: "45s HD" },
  { id: "clip-2", title: "Troubleshooting Pinholing in Reduction", thumbnail: "https://picsum.photos/seed/glaze2/160/90", timestamp: "28:12", duration: "38s HD" },
  { id: "clip-3", title: "Shino Foot Ring Technique", thumbnail: "https://picsum.photos/seed/glaze3/160/90", timestamp: "45:20", duration: "52s HD" },
];

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}



/* ─────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────── */

function RecordingIndicator({ isRecording, duration, onToggle }: { isRecording: boolean; duration: number; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-mono font-medium transition-all",
        isRecording
          ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm shadow-red-500/10"
          : "bg-[var(--color-surface)]/50 text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
      )}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      {isRecording && (
        <span className="flex items-center gap-1.5">
          <RecordCircle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
          <span className="font-mono font-medium text-red-400">REC</span>
        </span>
      )}
      {!isRecording && (
        <RecordCircle className="h-4 w-4 text-[var(--color-text-muted)]" />
      )}
      <span className="font-mono font-semibold">{formatDuration(duration)}</span>
    </button>
  );
}

function ConnectionQuality({ quality }: { quality: "excellent" | "good" | "fair" | "poor" }) {
  const config = {
    excellent: { color: "text-emerald-500", label: "Excellent", bars: 5 },
    good: { color: "text-emerald-400", label: "Good", bars: 4 },
    fair: { color: "text-amber-400", label: "Fair", bars: 3 },
    poor: { color: "text-red-400", label: "Poor", bars: 2 },
  };
  const cfg = config[quality];
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <span className={cn("font-semibold", cfg.color)}>{cfg.label}</span>
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-1 rounded transition-colors"
            style={{
              height: i <= cfg.bars ? "100%" : "30%",
              backgroundColor: i <= cfg.bars ? "var(--color-accent)" : "var(--color-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ShareableLink({ url, onCopy }: { url: string; onCopy: () => void; copied?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-xs">
      <span className="px-2 font-mono text-[11px] text-[var(--color-text-secondary)] truncate max-w-[150px]">
        {url}
      </span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 rounded-lg bg-[var(--color-card)] px-2.5 py-1 font-mono font-bold text-[var(--color-text)] shadow hover:bg-[var(--color-accent)] hover:text-white transition"
      >
        <Copy className="h-3 w-3" />
        <span>{copied ? "Copied!" : "Copy"}</span>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────── */

export const LiveDashboardScreen: React.FC<{
  onNavigate: (screen: ScreenId) => void;
  onSessionChange?: (session: LiveDashboardSession | null) => void;
}> = ({ onNavigate, onSessionChange }) => {
  const [session, setSession] = useState<LiveDashboardSession>(INITIAL_LIVE_DASHBOARD);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(INITIAL_LIVE_DASHBOARD.title);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeLeftNav, setActiveLeftNav] = useState("live-now");
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  const [liveSeconds, setLiveSeconds] = useState(INITIAL_LIVE_DASHBOARD.durationSeconds);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, sender: MOCK_USERS["u-june"], text: "The audio clarity is perfect from Seto!", time: "10:14 AM" },
    { id: 2, sender: MOCK_USERS["u-marcus"], text: "Can you zoom in on that Shino foot ring?", time: "10:15 AM" },
    { id: 3, sender: MOCK_USERS["u-devon"], text: "Voted on the poll! Shino faults 100%.", time: "10:16 AM" },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Live timer tick
  useEffect(() => {
    if (session.status !== "LIVE") return;
    const timer = setInterval(() => setLiveSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [session.status]);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText("https://jimvio.live/mira-seto");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveTitle = () => {
    setSession({ ...session, title: titleInput });
    setIsEditingTitle(false);
  };

  const handleSendLiveChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages([
      ...chatMessages,
      { id: Date.now(), sender: CURRENT_USER, text: chatInput.trim(), time: "Just now" },
    ]);
    setChatInput("");
  };

  const handleEndRoomConfirmed = () => {
    setIsEndConfirmOpen(false);
    setSession({ ...session, status: "ENDED" });
    if (onSessionChange) onSessionChange(null);
    alert("Live room terminated for all 142 viewers. Recording saved to Studio Ledger.");
    onNavigate("feed");
  };

  const leftNavItems = [
    { id: "live-now", label: "Live Now", icon: Radio, badge: "LIVE", badgeVariant: "live" as BadgeVariant },
    { id: "participants", label: "Participants", icon: Users, badge: `${session.participantsCount}` },
    { id: "chat", label: "Live Chat", icon: MessageSquare },
    { id: "qa", label: "Q&A Queue", icon: HelpCircle, badge: `${session.qaCount}` },
    { id: "polls", label: "Polls & Quizzes", icon: BarChart2, badge: `${session.pollsCount}` },
    { id: "reactions", label: "Reactions", icon: SmilePlus },
    { id: "rooms", label: "Breakout Rooms", icon: Layers },
    { id: "monetization", label: "Monetization", icon: DollarSign, badge: "New", badgeVariant: "new" as BadgeVariant },
    { id: "ecommerce", label: "E-Commerce", icon: ShoppingBag, badge: `${session.ecommercePinnedCount} Pinned` },
    { id: "engine", label: "Broadcast Engine", icon: Cpu },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "recordings", label: "Recordings", icon: Video },
    { id: "settings", label: "Studio Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col font-body">
      {/* 1. Reduced Top Bar w/ Global Search */}
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("feed")}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-1.5 font-mono text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Exit Studio</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-accent)] font-display text-sm font-black text-white">
              J
            </span>
            <span className="font-display text-base font-bold">Jimvio Broadcast Studio</span>
          </div>
        </div>

        {/* Global Search inside top bar */}
        <div className="hidden md:flex items-center max-w-sm w-full mx-4">
          <div className="flex w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            <span>🔍 Search studio assets or questions...</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="live">BROADCASTING TO {session.participantsCount} VIEWERS</Badge>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] text-white font-bold text-sm">
            J
          </div>
        </div>
      </header>

      {/* Main Studio Body Grid */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 2. Live-Context Left Nav */}
        <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-4 no-scrollbar">
          <div className="space-y-1">
            <div className="px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
              Live Session Control
            </div>
            {leftNavItems.map((item) => {
              const IconComp = item.icon;
              const isSelected = activeLeftNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveLeftNav(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 font-body text-xs sm:text-sm font-medium transition text-left",
                    isSelected
                      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-bold border-l-4 border-[var(--color-accent)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <IconComp className={cn("h-4 w-4 shrink-0", isSelected ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]")} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge variant={item.badgeVariant || "neutral"} pulse={item.badgeVariant === "live"}>
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scheduled list below */}
          <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
            <div className="px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Scheduled Broadcasts
            </div>
            <div className="rounded-xl bg-[var(--color-surface)] p-2.5 border border-[var(--color-border)] space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-indigo-500 font-bold">
                <span>Apr 26 • 2:00 PM EST</span>
                <Calendar className="h-3 w-3" />
              </div>
              <div className="font-display text-xs font-bold text-[var(--color-text)]">
                Mastering Glaze Faults & Corrections
              </div>
              <div className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                House Matters • 88 RSVP
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main Stage + Controls Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
          {/* 3. Session Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Badge variant="live">LIVE</Badge>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 font-display text-base font-bold text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="rounded-lg bg-[var(--color-accent)] px-3 py-1 font-mono text-xs font-bold text-white shadow"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <h1
                    onClick={() => setIsEditingTitle(true)}
                    className="font-display text-base sm:text-lg font-bold text-[var(--color-text)] truncate cursor-pointer hover:text-[var(--color-accent)] transition"
                    title="Click to edit session title"
                  >
                    {session.title}
                  </h1>
                  <span className="font-mono text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-surface)] px-2 py-0.5 rounded border">
                    {session.roomType}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Duration Timer & Connection Quality */}
              <div className="flex items-center gap-2 font-mono text-xs bg-[var(--color-surface)] px-3 py-1 rounded-xl border">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold">{formatDuration(liveSeconds)}</span>
                <span className="opacity-40">•</span>
                <span className="text-emerald-500 font-semibold">{session.quality} (60 FPS)</span>
              </div>

              {/* Shareable Link w/ Copy Action */}
              <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-xs">
                <span className="px-2 font-mono text-[11px] text-[var(--color-text-secondary)] truncate max-w-[150px]">
                  jimvio.live/mira-seto
                </span>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 rounded-lg bg-[var(--color-card)] px-2.5 py-1 font-mono font-bold text-[var(--color-text)] shadow hover:bg-[var(--color-accent)] hover:text-white transition"
                >
                  {copiedLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedLink ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              {/* Invite button */}
              <button
                onClick={() => alert("Launching Speaker & Guest Invite Modal...")}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 py-1.5 font-mono text-xs font-bold text-white shadow hover:bg-[var(--color-accent-hover)] transition"
              >
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                <span>Invite</span>
              </button>
            </div>
          </div>

          {/* Toolbar Row */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] p-3 shrink-0">
            {session.id !== "mira-seto-001" && (
              <>
                <button className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-xs font-semibold transition hover:border-[var(--color-accent)]/30">Share</button>
                <button className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-xs font-semibold transition hover:border-[var(--color-accent)]/30">Present</button>
                <button className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-xs font-semibold transition hover:border-[var(--color-accent)]/30">Polls</button>
                <button className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-xs font-semibold transition hover:border-[var(--color-accent)]/30">Trading</button>
                <button className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-xs font-semibold transition hover:border-[var(--color-accent)]/30">Classroom</button>
              </>
            )}
          </div>
        </div>

          {/* Main Stage + Controls Column */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 4. Main Stage (Video Surface + Trading Charts + Presentation Canvas) */}
            <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Stage Content */}
              <div className="relative flex-1 bg-[var(--color-bg)] overflow-hidden">
                {/* Stage Background */}
                <div className="absolute inset-0 bg-[var(--color-bg)]">
                  <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                {/* Stage Content Area */}
                <div className="relative flex h-full w-full items-center justify-center p-4">
                  {/* Main Video / Screen Share */}
                  <div className="relative flex-1 max-w-4xl mx-auto aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-[var(--color-accent)]/50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative flex h-full w-full items-center justify-center">
                        {/* Mock Camera Feed */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                          <div className="text-center">
                            <Camera className="h-16 w-16 mx-auto mb-4 text-white/30" />
                            <p className="text-white/60 font-medium">Mira's Camera Feed</p>
                            <p className="text-xs text-white/40 mt-1">1080p @ 60fps • WebRTC</p>
                          </div>
                        </div>

                        {/* Screen Share Overlay */}
                        {isScreenSharing && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                            <div className="text-center">
                              <Monitor className="h-16 w-16 mx-auto mb-4 text-white/30" />
                              <p className="text-white/60 font-medium">Screen Sharing Active</p>
                              <p className="text-xs text-white/40 mt-1">Mira's Screen • 1440p @ 30fps</p>
                            </div>
                          </div>
                        )}

                        {/* Self-view thumbnail */}
                        {isVideoOn && !isScreenSharing && (
                          <div className="absolute bottom-4 right-4 z-10 h-24 w-32 rounded-lg border-2 border-white/20 overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                              <span className="text-white/50 text-xs font-medium">You</span>
                            </div>
                          </div>
                        )}

                        {/* Recording Indicator */}
                        <RecordingIndicator
                          isRecording={isRecording}
                          duration={liveSeconds}
                          onToggle={() => setIsRecording(!isRecording)}
                        />

                        {/* REC + duration + viewer count - bottom-left */}
                        <div className="absolute bottom-4 left-4 flex items-center gap-3">
                          {isRecording && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[10px] font-mono font-medium text-red-400 backdrop-blur-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                              REC
                            </span>
                          )}
                        <span className="rounded-full bg-[var(--color-surface-secondary)]/70 px-2.5 py-1 text-[10px] font-mono text-[var(--color-text-muted)] backdrop-blur-sm">
                          {formatDuration(liveSeconds)}
                        </span>
                        <span className="rounded-full bg-[var(--color-surface-secondary)]/70 px-2.5 py-1 text-[10px] font-mono text-[var(--color-text-muted)] backdrop-blur-sm">
                          {session.participantsCount} watching
                        </span>
                      </div>

                      {/* Connection quality - bottom-right */}
                      <ConnectionQuality quality="excellent" className="absolute bottom-4 right-4" />

                      {/* Media controls bar - appears on hover */}
                      <div
                        className={cn(
                          "absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 transition-opacity duration-200",
                          isVideoOn || isScreenSharing ? "opacity-100" : ""
                        )}
                      >
                        <div className="flex items-center gap-2 rounded-xl bg-black/50 px-3 py-2 backdrop-blur-xl">
                          {/* Mic */}
                          <button
                            onClick={() => setIsMicOn(!isMicOn)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors",
                              isMicOn
                                ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                                : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            )}
                          >
                            {isMicOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                            {isMicOn ? "Mic" : "Muted"}
                          </button>
                          {/* Camera */}
                          <button
                            onClick={isVideoOn ? stopCamera : startCamera}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors",
                              isVideoOn
                                ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                                : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            )}
                          >
                            {isVideoOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                            {isVideoOn ? "Camera" : "Off"}
                          </button>
                          {/* Screen share */}
                          <button
                            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors",
                              isScreenSharing && "ring-2 ring-emerald-400"
                            )}
                          >
                            <Monitor className="h-3.5 w-3.5" />
                            Share
                          </button>
                          {/* Like */}
                          <button
                            onClick={() => toast.success("❤️ Sent!")}
                            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                          >
                            <Heart className="h-3.5 w-3.5" /> Like
                          </button>
                          {/* Invite */}
                          <button
                            onClick={() => setShowInviteDialog(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Invite
                          </button>

                          <div className="ml-auto">
                            {showEndRoomConfirm ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-zinc-500">End for everyone?</span>
                                <button
                                  onClick={endRoom}
                                  className="rounded-lg bg-red-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-red-700 transition-colors"
                                >
                                  End
                                </button>
                                <button
                                  onClick={() => setShowEndRoomConfirm(false)}
                                  className="rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowEndRoomConfirm(true)}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors",
                                  "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                )}
                              >
                                <Square className="h-3.5 w-3.5" />
                                End
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recording indicator */}
                      {isRecording && (
                        <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[10px] font-mono font-medium text-red-400 backdrop-blur-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          {formatDuration(recordingSeconds)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right panel (sidebar) - Chat, Participants, Q&A, Polls */}
                  <aside className="lg:w-[340px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--color-border)]/30">
                    <div className="h-[40vh] lg:h-full">
                      {/* Session header */}
                      <div className="p-4 border-b border-[var(--color-border)]/30 bg-[var(--color-surface)]/50">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-mono font-medium text-[var(--color-accent)]">{session.tag ?? "Live"}</span>
                          <h3 className="truncate text-[14px] font-black text-[var(--color-text-primary)]">{session.title}</h3>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <HubAvatar name={session.host} size={24} />
                          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{session.host}</span>
                          <LiveIndicator label="LIVE" />
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{formatOnlineDuration(elapsed)}</p>
                      </div>

                      {/* Tab bar */}
                      <div className="flex border-b border-[var(--color-border)]/30 bg-[var(--color-surface)]/50">
                        {([
                          ["chat", "Chat", MessageSquare] as const,
                          ["participants", "Participants", Users] as const,
                          ["qa", "Q&A", HelpCircle] as const,
                          ["polls", "Polls", BarChart3] as const,
                        ]).map(([key, label, Icon]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setActiveTab(key as "chat" | "participants" | "qa" | "polls")}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider transition",
                              activeTab === key
                                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                            {key === "chat" && (
                              <span className="ml-0.5 rounded bg-white/5 px-1 py-0.5 text-[8px] font-bold text-[var(--color-text-muted)]">{data?.chatMessages.length ?? 0}</span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Chat tab */}
                      {activeTab === "chat" && (
                        <div className="flex flex-col h-[calc(100%-140px)]">
                          <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-2.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {(data?.chatMessages ?? []).length === 0 ? (
                              <div className="flex flex-col items-center py-12 text-center">
                                <MessageSquare className="mb-2 h-8 w-8 text-zinc-700" />
                                <p className="text-[13px] font-semibold text-zinc-500">No messages yet</p>
                                <p className="mt-1 text-[11px] text-zinc-600">Be the first to say something!</p>
                              </div>
                            ) : (
                              data!.chatMessages.map((m, i) => (
                                <div
                                  key={m.id}
                                  className="animate-in fade-in slide-in-from-bottom-1 duration-200 rounded-xl bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]"
                                  style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
                                >
                                  <div className="flex items-center gap-2">
                                    <HubAvatar name={m.sender_name} src={m.sender_avatar} size={20} />
                                    <p className="text-[11px] font-bold text-[var(--color-accent)]">{m.sender_name}</p>
                                    <span className="ml-auto text-[9px] text-zinc-600">{formatTime(m.created_at)}</span>
                                  </div>
                                  <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-200">{m.body}</p>
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        if (!data) return;
                                        setData({
                                          ...data,
                                          chatMessages: data.chatMessages.map((msg) =>
                                            msg.id === m.id ? { ...msg, reaction_count: msg.reaction_count + 1 } : msg
                                          ),
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                                    >
                                      <Heart className="h-3 w-3" />
                                      {Math.max(m.reaction_count, 0)}
                                    </button>
                                    {m.reaction_count >= 3 && <Flame className="h-3.5 w-3.5 text-orange-400" />}
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={chatEndRef} />
                          </div>

                          {/* Message input */}
                          <div className="border-t border-white/10 bg-[#0e0e0e] p-3">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowEmojiPicker((v) => !v)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-500 transition hover:bg-white/10 hover:text-[var(--color-accent)]"
                                >
                                  <Smile className="h-4.5 w-4.5" />
                                </button>
                                {showEmojiPicker && (
                                  <div className="absolute bottom-full left-0 mb-1.5 flex animate-in fade-in slide-in-from-bottom-1 gap-1 rounded-xl border border-white/10 bg-[#1a1a1a] p-2 shadow-xl">
                                    {["😀", "😂", "❤️", "🔥", "👏", "🎉", "👍", "😍"].map((e) => (
                                      <button
                                        key={e}
                                        type="button"
                                        onClick={() => { setChatInput((prev) => prev + e); setShowEmojiPicker(false); }}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-white/10 hover:scale-110"
                                      >
                                        {e}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                              placeholder="Say something…"
                              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-[13px] text-white placeholder-zinc-600 transition focus:border-[var(--color-accent)]/30 focus:bg-white/[0.07] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={sendChatMessage}
                              disabled={!chatInput.trim()}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/25 disabled:opacity-30"
                            >
                              <Send className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    </aside>
                </div>
              </div>
            </div>
          </div>

        {/* ═══ MOBILE BOTTOM CONTROLS ═══ */}
        {joined && (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-[#121212] px-4 py-3 lg:hidden">
          <MobileMediaButton icon={soundsOn ? Mic : MicOff} active={soundsOn} onClick={() => soundsOn ? stopMic() : startMic()} />
          <MobileMediaButton icon={videoOn ? Video : VideoOff} active={videoOn} onClick={() => videoOn ? stopCamera() : startCamera()} />
          <MobileMediaButton icon={screenSharing ? ScreenShareOff : Monitor} active={screenSharing} onClick={() => screenSharing ? stopScreenShare() : startScreenShare()} />
          <MobileMediaButton icon={Heart} active={false} onClick={() => toast.success("❤️ Sent!")} />
          <button
            type="button"
            onClick={() => setShowEndRoomConfirm(true)}
            disabled={roomEnded}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            <Square className="h-3.5 w-3.5" fill="currentColor" />
            End
          </button>
        </div>
        )}

        {/* ── Invite Dialog ── */}
        {showInviteDialog && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setShowInviteDialog(false); setInviteCopied(false); }}>
            <div
              className="w-full max-w-[380px] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 rounded-2xl border border-white/10 bg-[#1a1a1a] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                    <Link2 className="h-4 w-4 text-[var(--color-accent)]" />
                  </span>
                  <h3 className="text-[14px] font-black text-white">Invite</h3>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowInviteDialog(false); setInviteCopied(false); }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-[12px] text-zinc-400">Share this link with others to join the session</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={sessionUrl}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] text-zinc-300 outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(sessionUrl);
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2000);
                      toast.success("Link copied to clipboard");
                    } catch {
                      toast.error("Couldn't copy the link");
                    }
                  }}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition",
                    inviteCopied ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {inviteCopied ? <Check className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={showEndRoomConfirm}
          title="End this live room?"
          description="Viewers will be disconnected and the session will move to Recordings. This can't be undone."
          confirmLabel="End Room"
          onConfirm={endRoom}
          onCancel={() => setShowEndRoomConfirm(false)}
        />
      </div>
    </div>
    </div>
  );
}

/* ── Media control button for the bottom bar ── */
interface MediaButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  label: string;
  shortcut?: string;
}
function MediaButton({ icon: Icon, active, onClick, label, shortcut }: MediaButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all",
        active
          ? "bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10 hover:bg-emerald-500/25"
          : "text-zinc-400 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {shortcut && (
        <span className="ml-0.5 rounded bg-white/5 px-1 py-0.5 text-[8px] font-bold text-zinc-600 group-hover:text-zinc-400">
          {shortcut}
        </span>
      )}
    </button>
  );
}

/* ── Mobile media control button ── */
interface MobileMediaButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}
function MobileMediaButton({ icon: Icon, active, onClick }: MobileMediaButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
        active
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}