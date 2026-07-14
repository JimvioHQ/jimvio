"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import {
  Radio, Users, Heart, Share2, Monitor, Mic, MicOff, Video, VideoOff,
  ScreenShare, ScreenShareOff, MessageSquare, Square,
  Loader2, Smile, Send, Wifi, LogIn, Link2, Copy, Check, UserPlus,
  X, AlertTriangle, CheckCircle2, Info, ArrowLeft,
  Flame, HelpCircle, BarChart3, ChevronDown, RotateCcw, MoreHorizontal,
  Zap, WifiOff, Settings, Archive, Trash2, Pin, Bell, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar, HubBadge, HubProgressBar } from "./hub-ui";
import type { LiveDashboard, LiveSessionItem } from "@/lib/community/hub-live-types";
import { getEmptyHubLiveDashboard, getMockSessions } from "@/lib/community/hub-live-demo";
import { LiveSessionsList } from "./live-sessions-list";
import { StartLiveDialog } from "./start-live-dialog";
import { toast } from "sonner";


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


/* ── Confirm dialog (used for destructive actions like ending the room) ── */
function ConfirmDialog({
  open, title, description, confirmLabel, danger = true, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}>
      <div
        className="w-full max-w-[360px] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", danger ? "bg-red-500/20 text-red-400" : "bg-[var(--color-accent)]/20 text-[var(--color-accent)]")}>
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>
          <h3 className="text-[14px] font-black text-[var(--color-text-primary)]">{title}</h3>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn("rounded-xl px-4 py-2 text-[12px] font-bold text-white transition", danger ? "bg-red-600 hover:bg-red-500" : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ── Live indicator ── */
export function LiveIndicator({ label = "LIVE", className }: { label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[10px] font-mono font-medium text-red-400 backdrop-blur-sm", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      {label}
    </span>
  );
}


/* ── Connection quality ── */
export function ConnectionQuality({ quality = "good", className }: { quality?: "good" | "fair" | "poor"; className?: string }) {
  const colors = { good: "text-emerald-400", fair: "text-amber-400", poor: "text-red-400" };
  const labels = { good: "Excellent", fair: "Fair", poor: "Poor" };
  return (
    <div className={cn("flex items-center gap-1.5 rounded-full bg-[var(--color-surface-secondary)] px-2 py-1 text-[10px] font-mono", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", colors[quality])} />
      <span className={colors[quality]}>{labels[quality]}</span>
    </div>
  );
}


/* ── Page ── */
export function HubLivePage({
  sessionId,
  communitySlug,
}: {
  sessionId?: string;
  communitySlug?: string;
}) {
  return sessionId ? (
    <HubLiveSessionPage sessionId={sessionId} communitySlug={communitySlug} />
  ) : (
    <HubLiveListingPage communitySlug={communitySlug} />
  );
}


/* ── Listing page (multi-session) ── */
function HubLiveListingPage({ communitySlug }: { communitySlug?: string }) {
  const [showStartLive, setShowStartLive] = useState(false);

  const handleJoinSession = (session: { id: string }) => {
    const base = communitySlug ? `/c/${communitySlug}/live` : "/c/live";
    window.location.href = `${base}/${session.id}`;
  };

  const handleStartLive = (title: string, spaceId: string, privacy: "public" | "private") => {
    setShowStartLive(false);
    const base = communitySlug ? `/c/${communitySlug}/live` : "/c/live";
    const newId = `sess-${Date.now()}`;
    window.location.href = `${base}/${newId}`;
  };

  return (
    <>
      <LiveSessionsList communitySlug={communitySlug} onStartLive={() => setShowStartLive(true)} onJoinSession={handleJoinSession} />
      <StartLiveDialog open={showStartLive} onClose={() => setShowStartLive(false)} onStart={handleStartLive} communitySlug={communitySlug} />
    </>
  );
}

function HubLiveSessionPage({ sessionId, communitySlug }: { sessionId: string; communitySlug?: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LiveDashboard | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [chatInput, setChatInput] = useState("");

  // Media/stage controls
  const [videoOn, setVideoOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [soundsOn, setSoundsOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showEndRoomConfirm, setShowEndRoomConfirm] = useState(false);
  const [roomEnded, setRoomEnded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [joined, setJoined] = useState(false);
  const [hoveringVideo, setHoveringVideo] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "participants" | "qa" | "polls">("chat");
  const [joining, setJoining] = useState(false);
  const [quality, setQuality] = useState<"good" | "fair" | "poor">("good");

  const joinSession = async () => {
    setJoining(true);
    try {
      // First check if we have access to this session's space
      const checkRes = await fetch(`/api/c/live/${sessionId}/check-access`);
      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        if (checkRes.status === 403) {
          toast.error(checkData.error || "You don't have access to this space. Upgrade your membership to join.");
        } else {
          toast.error(checkData.error || "Access check failed");
        }
        return;
      }

      const res = await fetch(`/api/c/live/${sessionId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to join session");
        return;
      }
      setJoined(true);
      toast.success("Joined session successfully");
    } catch (err) {
      toast.error("Failed to join session");
    } finally {
      setJoining(false);
    }
  };

  const leaveSession = async () => {
    try {
      await fetch(`/api/c/live/${sessionId}/leave`, { method: "POST" });
      setJoined(false);
      toast.success("Left session");
    } catch (err) {
      toast.error("Failed to leave session");
    }
  };

  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbVideoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const stopMediaStream = (ref: { current: MediaStream | null }) => {
    if (ref.current) {
      ref.current.getTracks().forEach(t => t.stop());
      ref.current = null;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraStreamRef.current = stream;
      setVideoOn(true);
      toast.success("Camera turned on");
    } catch {
      setVideoOn(false);
      toast.error("Camera access denied or unavailable");
    }
  };

  const stopCamera = () => {
    stopMediaStream(cameraStreamRef);
    if (videoRef.current) videoRef.current.srcObject = null;
    if (thumbVideoRef.current) thumbVideoRef.current.srcObject = null;
    setVideoOn(false);
    toast.info("Camera turned off");
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      if (screenRef.current) { screenRef.current.srcObject = stream; screenRef.current.play().catch(() => {}); }
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopMediaStream(screenStreamRef);
        if (screenRef.current) screenRef.current.srcObject = null;
        setScreenSharing(false);
        toast.info("Screen sharing stopped");
      });
      setScreenSharing(true);
      toast.info("Screen sharing started");
    } catch {
      setScreenSharing(false);
      toast.error("Screen sharing cancelled or unavailable");
    }
  };

  const stopScreenShare = () => {
    stopMediaStream(screenStreamRef);
    if (screenRef.current) screenRef.current.srcObject = null;
    setScreenSharing(false);
    toast.info("Screen sharing stopped");
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = stream;
      setSoundsOn(true);
      toast.success("Microphone enabled");
    } catch {
      setSoundsOn(false);
      toast.error("Microphone access denied");
    }
  };

  const stopMic = () => {
    stopMediaStream(audioStreamRef);
    setSoundsOn(false);
    toast.info("Microphone disabled");
  };

  // Sync camera stream to <video> element after it mounts
  useEffect(() => {
    if (!videoOn || !cameraStreamRef.current) return;
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
    if (thumbVideoRef.current) {
      thumbVideoRef.current.srcObject = cameraStreamRef.current;
      thumbVideoRef.current.play().catch(() => {});
    }
  }, [videoOn]);

  // Sync screen share stream to <video> element after it mounts
  useEffect(() => {
    if (!screenSharing || !screenStreamRef.current) return;
    if (screenRef.current) {
      screenRef.current.srcObject = screenStreamRef.current;
      screenRef.current.play().catch(() => {});
    }
  }, [screenSharing]);

  // Clean up all media streams on unmount
  useEffect(() => {
    return () => {
      stopMediaStream(cameraStreamRef);
      stopMediaStream(screenStreamRef);
      stopMediaStream(audioStreamRef);
    };
  }, []);

  const sessionUrl = typeof window !== "undefined"
    ? `${window.location.origin}/c/live${sessionId ? `/${sessionId}` : ""}`
    : `jimvio.com/c/live${sessionId ? `/${sessionId}` : ""}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/c/live/${sessionId}`);
        const normalized = getEmptyHubLiveDashboard();
        if (res.ok) {
          const json = await res.json();
          const s = json.session;
          if (s) {
            normalized.session = {
              title: s.title ?? "Live Session",
              host: s.host?.full_name ?? s.host?.username ?? "Host",
              href: `/c/live/${sessionId}`,
              tag: s.status === "live" ? "Live" : "Scheduled",
              roomId: sessionId,
              description: s.description ?? null,
              host_bio: null,
              host_follower_count: 0,
              host_avatar: s.host?.avatar_url ?? null,
            };
            normalized.session.tag = s.status === "live" ? "Live" : "Scheduled";
            if (s.space) {
              normalized.session.tag = `${s.space.name}`;
            }
          }
        }
        if (!cancelled) setData(normalized);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, communitySlug]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.chatMessages]);

  const speakers = useMemo(() => data?.speakers ?? [], [data?.speakers]);

  const relatedSessions = useMemo(() => {
    if (!sessionId) return [];
    const mockAll = getMockSessions(communitySlug);
    return mockAll.filter((s) => s.id !== sessionId && s.status === "live").slice(0, 4);
  }, [sessionId, communitySlug]);

  const qaItems = useMemo(() => [
    { id: "1", question: "Will this session be recorded?", askedBy: "Sarah", votes: 5, answered: true, answer: "Yes, all sessions are automatically recorded and available in Recordings." },
    { id: "2", question: "What pricing tier supports 100+ viewers?", askedBy: "Alex", votes: 3, answered: false },
    { id: "3", question: "Can I share screen alongside camera?", askedBy: "Jordan", votes: 8, answered: true, answer: "Screen share replaces the camera feed. You can toggle between them." },
    { id: "4", question: "Is there a time limit for live sessions?", askedBy: "Morgan", votes: 2, answered: false },
  ], []);

  const polls = useMemo(() => [
    { id: "1", question: "Which topic should we cover next?", options: ["Advanced features", "Beginner guide", "API tutorial", "Case study"], votes: [12, 8, 15, 6], active: true },
    { id: "2", question: "Was this session helpful?", options: ["Yes!", "Somewhat", "Not really"], votes: [34, 12, 3], active: false },
  ], []);

  const endRoom = async () => {
    setShowEndRoomConfirm(false);
    setRoomEnded(true);
    setRecording(false);
    stopMediaStream(cameraStreamRef);
    stopMediaStream(screenStreamRef);
    stopMediaStream(audioStreamRef);
    if (videoRef.current) videoRef.current.srcObject = null;
    if (thumbVideoRef.current) thumbVideoRef.current.srcObject = null;
    if (screenRef.current) screenRef.current.srcObject = null;
    setVideoOn(false);
    setSoundsOn(false);
    setScreenSharing(false);

    await fetch(`/api/c/live/${sessionId}/end`, { method: "POST" }).catch(() => {});

    toast.success("Live room ended. This session has been saved to Recordings.");
  };

  const sendChatMessage = () => {
    const body = chatInput.trim();
    if (!body || !data) return;

    const newMessage = {
      id: `local-${Date.now()}`,
      sender_name: "You",
      sender_avatar: "",
      body,
      created_at: new Date().toISOString(),
      reaction_count: 0,
    };
    setData({ ...data, chatMessages: [...data.chatMessages, newMessage] });
    setChatInput("");
    fetch(`/api/c/live/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, messageType: "chat" }),
    }).catch(() => { });
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--color-accent)]" />
          <div className="absolute inset-0 h-10 w-10 animate-pulse rounded-full bg-[var(--color-accent)]/10" />
        </div>
        <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">Loading live session…</p>
      </div>
    );
  }

  const analytics = data?.analytics;
  const session = data?.session ?? { title: "Community Live Room", host: "Jimvio", href: "/c/live", tag: "Live Room", roomId: null };
  const hasSession = Boolean(data?.session.roomId) && !roomEnded;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-[var(--color-bg)] lg:flex-row">
      {/* ═══ TOP SESSION BAR (mobile only) ═══ */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)]/30 bg-[var(--color-surface)]/80 px-4 py-2.5 lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <LiveIndicator className="shrink-0" />
            <p className="truncate text-[13px] font-bold text-[var(--color-text-primary)]">{session.title}</p>
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{session.host} · {formatOnlineDuration(elapsed)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {speakers.slice(0, 3).map((s) => (
              <HubAvatar key={s.id} name={s.name} src={s.avatar_url} size={22} className="ring-2 ring-[var(--color-bg)]" />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">{formatCount(analytics?.viewers ?? 0)}</span>
        </div>
      </div>

      {/* ═══ LEFT: VIDEO / STREAM SURFACE ═══ */}
      <div
        className="relative flex h-[45vh] shrink-0 flex-col bg-[var(--color-bg)] lg:h-auto lg:flex-1"
        onMouseEnter={() => setHoveringVideo(true)}
        onMouseLeave={() => setHoveringVideo(false)}
      >
        {!joined ? (
          /* ── Join overlay (enhanced) ── */
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface-secondary)] via-[var(--color-bg)] to-black" />
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `radial-gradient(circle at 25% 50%, var(--color-accent) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
            }} />
            <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-md">
              {/* Icon */}
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-accent)]/10">
                <Radio className="h-10 w-10 text-[var(--color-accent)]" />
              </div>

              {/* Title */}
              <h2 className="text-[22px] font-black text-[var(--color-text-primary)]">{session.title}</h2>

              {/* Description */}
              {session.description && (
                <p className="mt-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{session.description}</p>
              )}

              {/* Host row with bio */}
              <div className="mt-4 flex items-center gap-2.5">
                <HubAvatar name={session.host} src={session.host_avatar} size={28} />
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{session.host} <span className="font-normal text-[var(--color-text-muted)]">is live</span></p>
                  {session.host_bio && (
                    <p className="text-[10px] text-[var(--color-text-muted)]">{session.host_bio}</p>
                  )}
                  {session.host_follower_count != null && session.host_follower_count > 0 && (
                    <p className="text-[10px] text-[var(--color-text-muted)]">{formatCount(session.host_follower_count)} followers</p>
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{formatCount(analytics?.viewers ?? 0)} watching</span>
                <span className="flex items-center gap-1"><Wifi className="h-3.5 w-3.5" />Live</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatOnlineDuration(elapsed)}</span>
              </div>

              {/* Community preview — show speaker avatars */}
              {speakers.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {speakers.slice(0, 5).map((s) => (
                      <HubAvatar key={s.id} name={s.name} src={s.avatar_url} size={26} className="ring-2 ring-[var(--color-bg)]" />
                    ))}
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{speakers.length} in session</span>
                </div>
              )}

              {/* Join button */}
              <button
                type="button"
                onClick={joinSession}
                disabled={joining}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {joining ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Joining…</>
                ) : (
                  <><LogIn className="h-4 w-4" /> Join Live</>
                )}
              </button>

              {/* Related sessions strip */}
              {relatedSessions.length > 0 && (
                <div className="mt-6 w-full border-t border-[var(--color-border)]/30 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">More live sessions</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    {relatedSessions.map((rs) => {
                      const href = communitySlug ? `/c/${communitySlug}/live/${rs.id}` : `/c/live/${rs.id}`;
                      return (
                        <button
                          key={rs.id}
                          type="button"
                          onClick={() => { window.location.href = href; }}
                          className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2 text-left text-[11px] transition hover:bg-[var(--color-border)]"
                        >
                          <p className="font-semibold text-[var(--color-text-primary)] truncate max-w-[120px]">{rs.title}</p>
                          <p className="text-[9px] text-[var(--color-text-muted)]">{formatCount(rs.viewer_count ?? 0)} watching</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="mt-4 text-[10px] text-[var(--color-text-muted)]">By joining, you agree to the community guidelines</p>
            </div>
          </div>
        ) : roomEnded ? (
          /* ── Room ended ── */
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center px-6">
              <Square className="mx-auto mb-4 h-16 w-16 text-[var(--color-text-muted)]" />
              <h3 className="text-[18px] font-black text-[var(--color-text-primary)]">Session Ended</h3>
              <p className="mt-2 text-[var(--color-text-muted)]">This live room has been closed by the host</p>
              <button
                onClick={() => { window.location.href = communitySlug ? `/c/${communitySlug}/live` : "/c/live"; }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 px-4 py-2 text-[12px] font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)]"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Live
              </button>
            </div>
          </div>
        ) : (
          /* ── Active session ── */
          <div className="relative flex flex-1 flex-col">
            {/* Video surface */}
            <div className="relative flex-1 overflow-hidden">
              {/* Camera stream */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{ objectFit: "cover" }}
              />
              {/* Screen share overlay */}
              {screenSharing && screenRef.current?.srcObject && (
                <video
                  ref={screenRef}
                  className="absolute inset-0 z-10 w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                  style={{ objectFit: "contain" }}
                />
              )}
              {/* Self-view thumbnail */}
              {videoOn && !screenSharing && cameraStreamRef.current && (
                <video
                  ref={thumbVideoRef}
                  className="absolute bottom-4 right-4 z-10 h-24 w-32 rounded-lg border-2 border-[var(--color-border-strong)] object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              )}

              {/* Gradient overlay for bottom UI legibility */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--color-bg)]/80 to-transparent" />

              {/* REC + duration + viewer count - bottom-left */}
              <div className="absolute bottom-4 left-4 flex items-center gap-3">
                {recording && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[10px] font-mono font-medium text-red-400 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    REC
                  </span>
                )}
                <span className="rounded-full bg-[var(--color-surface-secondary)]/70 px-2.5 py-1 text-[10px] font-mono text-[var(--color-text-muted)] backdrop-blur-sm">
                  {formatElapsed(elapsed)}
                </span>
                <span className="rounded-full bg-[var(--color-surface-secondary)]/70 px-2.5 py-1 text-[10px] font-mono text-[var(--color-text-muted)] backdrop-blur-sm">
                  {analytics?.viewers ?? 0} watching
                </span>
              </div>

              {/* Connection quality - bottom-right */}
              <ConnectionQuality quality={quality} className="absolute bottom-4 right-4" />

              {/* Media controls bar - appears on hover */}
              <div
                className={cn(
                  "absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 transition-opacity duration-200",
                  hoveringVideo && "opacity-100"
                )}
              >
                <div className="flex items-center gap-2 rounded-xl bg-black/50 px-3 py-2 backdrop-blur-xl">
                  {/* Mic */}
                  <button
                    onClick={soundsOn ? stopMic : startMic}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors",
                      soundsOn
                        ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                        : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    )}
                  >
                    {soundsOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    {soundsOn ? "Mic" : "Muted"}
                  </button>
                  {/* Camera */}
                  <button
                    onClick={videoOn ? stopCamera : startCamera}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors",
                      videoOn
                        ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                        : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    )}
                  >
                    {videoOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                    {videoOn ? "Camera" : "Off"}
                  </button>
                  {/* Screen share */}
                  <button
                    onClick={screenSharing ? stopScreenShare : startScreenShare}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors",
                      screenSharing && "ring-2 ring-emerald-400"
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
                        <span className="text-[11px] text-[var(--color-text-muted)]">End for everyone?</span>
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
            </div>

            {/* Recording indicator */}
            {recording && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[10px] font-mono font-medium text-red-400 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {formatElapsed(recordingSeconds)}
              </div>
            )}
          </div>
        )}

          <div className="lg:w-[340px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--color-border)]/30">
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
                      <span className="ml-0.5 rounded bg-[var(--color-surface-secondary)] px-1 py-0.5 text-[8px] font-bold text-[var(--color-text-muted)]">{data?.chatMessages.length ?? 0}</span>
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
                        <MessageSquare className="mb-2 h-8 w-8 text-[var(--color-text-muted)]" />
                        <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">No messages yet</p>
                        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Be the first to say something!</p>
                      </div>
                    ) : (
                      data!.chatMessages.map((m, i) => (
                        <div
                          key={m.id}
                          className="animate-in fade-in slide-in-from-bottom-1 duration-200 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 transition hover:bg-[var(--color-border)]"
                          style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
                        >
                          <div className="flex items-center gap-2">
                            <HubAvatar name={m.sender_name} src={m.sender_avatar} size={20} />
                            <p className="text-[11px] font-bold text-[var(--color-accent)]">{m.sender_name}</p>
                            <span className="ml-auto text-[9px] text-[var(--color-text-muted)]">{formatTime(m.created_at)}</span>
                          </div>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{m.body}</p>
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
                              className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
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
                  <div className="border-t border-[var(--color-border)]/30 bg-[var(--color-bg)]/50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker((v) => !v)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)] hover:text-[var(--color-accent)]"
                        >
                          <Smile className="h-4.5 w-4.5" />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-full left-0 mb-1.5 flex animate-in fade-in slide-in-from-bottom-1 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl">
                            {["😀", "😂", "❤️", "🔥", "👏", "🎉", "👍", "😍"].map((e) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => { setChatInput((prev) => prev + e); setShowEmojiPicker(false); }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-[var(--color-border)] hover:scale-110"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                        placeholder="Say something…"
                        className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-2 text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-[var(--color-accent)]/30 focus:bg-[var(--color-border)] focus:outline-none"
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
                </div>
              )}

              {/* Participants tab */}
              {activeTab === "participants" && (
                <div className="flex-1 space-y-1 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {speakers.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                      <Users className="mb-2 h-8 w-8 text-[var(--color-text-muted)]" />
                      <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">No participants yet</p>
                    </div>
                  ) : (
                    speakers.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5 transition hover:bg-[var(--color-border)]">
                        <HubAvatar name={s.name} src={s.avatar_url} size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-[var(--color-text-primary)]">{s.name}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{s.role}</p>
                        </div>
                        {s.role === "Host" && (
                          <span className="rounded bg-[var(--color-accent)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--color-accent)]">HOST</span>
                        )}
                        {s.role === "Speaker" && (
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">SPEAKER</span>
                        )}
                      </div>
                    ))
                  )}
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5">
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Viewers</span>
                    <span className="text-[12px] font-bold text-[var(--color-text-primary)]">{formatCount(analytics?.viewers ?? 0)}</span>
                  </div>
                </div>
              )}

              {/* Q&A tab */}
              {activeTab === "qa" && (
                <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {qaItems.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                      <HelpCircle className="mb-2 h-8 w-8 text-[var(--color-text-muted)]" />
                      <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">No questions yet</p>
                      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Ask something in chat to get started</p>
                    </div>
                  ) : (
                    qaItems.map((q) => (
                      <div key={q.id} className="rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5 transition hover:bg-[var(--color-border)]">
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg bg-[var(--color-surface-secondary)] px-1.5 py-1 text-[10px] font-bold text-[var(--color-text-muted)] transition hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            {q.votes}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold leading-snug text-[var(--color-text-primary)]">{q.question}</p>
                            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">Asked by {q.askedBy}</p>
                            {q.answered && (
                              <div className="mt-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Answered
                                </div>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{q.answer}</p>
                              </div>
                            )}
                            {!q.answered && (
                              <span className="mt-1.5 inline-block rounded bg-[var(--color-surface-secondary)]/50 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-text-muted)]">Awaiting answer</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Polls tab */}
              {activeTab === "polls" && (
                <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {polls.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                      <BarChart3 className="mb-2 h-8 w-8 text-[var(--color-text-muted)]" />
                      <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">No polls yet</p>
                      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Create a poll to engage your audience</p>
                    </div>
                  ) : (
                    polls.map((poll) => {
                      const totalVotes = poll.votes.reduce((a, b) => a + b, 0);
                      return (
                        <div key={poll.id} className="rounded-xl bg-[var(--color-surface-secondary)] px-3 py-3">
                          <div className="flex items-center gap-2">
                            <p className="flex-1 text-[12px] font-bold text-[var(--color-text-primary)]">{poll.question}</p>
                            {poll.active && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400">ACTIVE</span>}
                          </div>
                          <div className="mt-2.5 space-y-1.5">
                            {poll.options.map((opt, oi) => {
                              const pct = totalVotes > 0 ? Math.round((poll.votes[oi] / totalVotes) * 100) : 0;
                              return (
                                <div key={oi}>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[var(--color-text-secondary)]">{opt}</span>
                                    <span className="font-semibold text-[var(--color-text-muted)]">{pct}%</span>
                                  </div>
                                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                                    <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
})}
                          </div>
                          <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
                        </div>
                      );
                    }))
                  }
                  </div>
                )}

            {/* Collapsed chat preview (when on non-chat tabs) */}
            {activeTab !== "chat" && data && data.chatMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className="mx-3 mb-1 flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 transition hover:bg-[var(--color-border)]"
              >
                <div className="flex -space-x-1">
                  <HubAvatar name={data.chatMessages[data.chatMessages.length - 1].sender_name} size={18} />
                </div>
                <div className="min-w-0 flex-1 truncate text-left">
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">{data.chatMessages[data.chatMessages.length - 1].sender_name}</span>
                  <span className="ml-1 text-[11px] text-[var(--color-text-muted)]">{data.chatMessages[data.chatMessages.length - 1].body}</span>
                </div>
                <span className="shrink-0 rounded bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-text-muted)]">{data.chatMessages.length}</span>
              </button>
            )}

            {/* Message input (always visible when joined) */}
            <div className="border-t border-[var(--color-border)]/30 bg-[var(--color-bg)]/50 p-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)] hover:text-[var(--color-accent)]"
                  >
                    <Smile className="h-4.5 w-4.5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-1.5 flex animate-in fade-in slide-in-from-bottom-1 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl">
                      {["😀", "😂", "❤️", "🔥", "👏", "🎉", "👍", "😍"].map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => { setChatInput((prev) => prev + e); setShowEmojiPicker(false); }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-[var(--color-border)] hover:scale-110"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                  placeholder="Say something…"
                  className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-2 text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-[var(--color-accent)]/30 focus:bg-[var(--color-border)] focus:outline-none"
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
          </div>
        </div>

        {/* ═══ MOBILE BOTTOM CONTROLS ═══ */}
        {joined && (
        <div className="flex items-center justify-center gap-2 border-t border-[var(--color-border)]/30 bg-[var(--color-surface)]/80 backdrop-blur-xl px-4 py-3 lg:hidden">
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
              className="w-full max-w-[380px] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                    <Link2 className="h-4 w-4 text-[var(--color-accent)]" />
                  </span>
                  <h3 className="text-[14px] font-black text-[var(--color-text-primary)]">Invite</h3>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowInviteDialog(false); setInviteCopied(false); }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">Share this link with others to join the session</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={sessionUrl}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2.5 text-[12px] text-[var(--color-text-secondary)] outline-none"
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
                    inviteCopied ? "bg-emerald-500/15 text-emerald-400" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
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
  );
}


/* ── Media control button for the bottom bar ── */
function MediaButton({ icon: Icon, active, onClick, label, shortcut }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void; label: string; shortcut?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all",
        active
          ? "bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10 hover:bg-emerald-500/25"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {shortcut && (
        <span className="ml-0.5 rounded bg-[var(--color-surface-secondary)] px-1 py-0.5 text-[8px] font-bold text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]">
          {shortcut}
        </span>
      )}
    </button>
  );
}


/* ── Mobile media control button ── */
function MobileMediaButton({ icon: Icon, active, onClick }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
        active
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
      )}
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}