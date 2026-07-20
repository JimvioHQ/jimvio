"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  MessageSquare,
  MonitorPlay,
  Radio,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveDashboard } from "@/lib/community/hub-live-types";
import { normalizeHubLiveDashboard } from "@/lib/community/hub-live-demo";
import { useLiveMediaPlane } from "@/hooks/live/useLiveMediaPlane";
import { useLiveSession } from "@/hooks/live/useLiveSession";
import { useLiveChat } from "@/hooks/live/useLiveChat";
import { useLiveKitRoom } from "@/hooks/live/useLiveKitRoom";
import {
  canEndLive,
  canInviteSpeaker,
  canLaunchPoll,
  canPublishAv,
  canRecord,
  canShareScreen,
} from "@/lib/live/roles";
import { uploadLiveRecording } from "@/lib/live/upload-recording";
import { AiFab } from "./live/AiFab";
import { CommandPalette, defaultLiveCommands } from "./live/CommandPalette";
import { ControlDock, useEphemeralToast } from "./live/ControlDock";
import { ChatWorkspace } from "./live/ChatWorkspace";
import { StageMediaPreview } from "./live/StageMediaPreview";
import { RemoteAudioSink } from "./live/RemoteAudioSink";
import {
  AnalyticsPanel,
  ClipsPanel,
  DrawerHeader,
  EventsPanel,
  LayoutPanel,
  PeoplePanel,
  PollsPanel,
  QaPanel,
  RoomsPanel,
  SettingsPanel,
} from "./live/panels";
import { SpeakerStrip } from "./live/SpeakerStrip";
import {
  LEFT_TOOLS,
  RIGHT_TABS,
  LAYOUTS,
  type ActivityMode,
  type DrawerState,
  type LeftPanel,
  type RightTab,
  type SpeakerUi,
  type StudioMode,
} from "./live/studio-types";
import {
  formatCount,
  formatElapsed,
  formatTime,
  readDrawerState,
  readMode,
  writeDrawerState,
  writeMode,
} from "./live/studio-utils";
import { FOCUS_RING, FOCUS_RING_DARK, MOTION_COLORS } from "./live/studio-ui";

type LoadError = "network" | "server" | null;

export function HubLivePage({ sessionId: sessionIdProp }: { sessionId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError>(null);
  const [data, setData] = useState<LiveDashboard | null>(null);
  const [mode, setMode] = useState<StudioMode>(() => readMode());
  const [drawer, setDrawer] = useState<DrawerState>(() => readDrawerState());
  const [layout, setLayout] = useState<(typeof LAYOUTS)[number]>("Presentation");
  const [activity, setActivity] = useState<ActivityMode>("live");
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [online, setOnline] = useState(true);
  const [connection, setConnection] = useState<"excellent" | "good" | "poor">("excellent");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [chatIdle, setChatIdle] = useState(false);
  const [hasPolls, setHasPolls] = useState(false);
  const [egressRecording, setEgressRecording] = useState(false);
  const chatIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { msg: toast, show: showToast } = useEphemeralToast();

  const media = useLiveMediaPlane(true);
  const live = useLiveSession(sessionIdProp ?? null);
  const chatRoomId = live.session?.room_id ?? data?.session.roomId ?? null;
  const liveChat = useLiveChat(chatRoomId);

  const livekit = useLiveKitRoom({
    sessionId: live.session?.status === "live" ? live.session.id : null,
    enabled: true,
    localAvStream: media.cameraStream,
    camOn: media.camOn,
    micOn: media.micOn,
    shareStream: media.shareStream,
    sharing: media.sharing,
    preferLocalStage: live.myRole === "host" || live.myRole === "cohost" || live.myRole === "speaker",
  });

  const micOn = media.micOn;
  const camOn = media.camOn;
  const recording = media.recordingState === "recording" || media.recordingState === "paused";
  const stageStream = livekit.stageStream ?? media.previewStream;

  const sessionUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/communities/live`
      : "jimvio.com/communities/live";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/c/live");
      if (!res.ok) {
        setLoadError("server");
        setData(normalizeHubLiveDashboard(null));
        return;
      }
      const json = (await res.json()) as LiveDashboard;
      const normalized = normalizeHubLiveDashboard(json);
      setData(normalized);
      if (normalized.speakers[0]) setActiveSpeakerId(normalized.speakers[0].id);
    } catch {
      setLoadError("network");
      setData(normalizeHubLiveDashboard(null));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDrawer = useCallback((patch: Partial<DrawerState>) => {
    setDrawer((prev) => {
      const next = { ...prev, ...patch };
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => writeDrawerState(next), 200);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/c/live");
        if (cancelled) return;
        if (!res.ok) {
          setLoadError("server");
          setData(normalizeHubLiveDashboard(null));
          return;
        }
        const json = (await res.json()) as LiveDashboard;
        if (cancelled) return;
        const normalized = normalizeHubLiveDashboard(json);
        setData(normalized);
        if (normalized.speakers[0]) setActiveSpeakerId(normalized.speakers[0].id);
      } catch {
        if (cancelled) return;
        setLoadError("network");
        setData(normalizeHubLiveDashboard(null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Resume active live session, or join viewer sessionId from route */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (sessionIdProp) {
          await live.join(sessionIdProp);
          return;
        }
        const res = await fetch("/api/c/live/sessions");
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { sessions?: Array<{ id: string }> };
        const first = json.sessions?.[0];
        if (first?.id) await live.join(first.id);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdProp]);

  useEffect(() => {
    if (media.lastError) showToast(media.lastError);
  }, [media.lastError, showToast]);

  useEffect(() => {
    if (livekit.error) showToast(livekit.error);
  }, [livekit.error, showToast]);

  /* Keep activity mode in sync when share track ends externally */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror media plane share flag into existing activity chrome
    setActivity((prev) => {
      if (media.sharing) return "share";
      return prev === "share" ? "live" : prev;
    });
  }, [media.sharing]);

  const inviteAcceptedRef = useRef(false);
  useEffect(() => {
    if (!live.userId || !live.session) return;
    const me = live.participants.find((p) => p.user_id === live.userId);
    if (me?.status === "invited" && !inviteAcceptedRef.current) {
      inviteAcceptedRef.current = true;
      showToast("Speaker invite received — accepting");
      void live.acceptInvite().catch(() => {
        inviteAcceptedRef.current = false;
      });
    }
    if (me?.status === "joined") inviteAcceptedRef.current = false;
  }, [live.participants, live.userId, live.session, live, showToast]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sync = () => {
      const on = typeof navigator !== "undefined" ? navigator.onLine : true;
      setOnline(on);
      if (!on) {
        setConnection("poor");
        return;
      }
      if (String(livekit.connectionState) === "reconnecting") setConnection("good");
      else setConnection("excellent");
      void media.recover();
      if (live.session?.status === "live" && !livekit.connected) {
        void livekit.reconnect().catch(() => undefined);
      }
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect on network only; livekit object identity churns
  }, [
    media,
    livekit.connectionState,
    livekit.connected,
    livekit.reconnect,
    live.session?.status,
  ]); // narrowed livekit deps — avoid reconnect loops

  useEffect(() => {
    if (mode === "minimal" || focusMode) return;
    const bump = () => {
      setChatIdle(false);
      if (chatIdleTimer.current) clearTimeout(chatIdleTimer.current);
      chatIdleTimer.current = setTimeout(() => setChatIdle(true), 90_000);
    };
    bump();
    return () => {
      if (chatIdleTimer.current) clearTimeout(chatIdleTimer.current);
    };
  }, [mode, focusMode, chatInput, drawer.rightTab]);

  useEffect(() => {
    if (chatIdle && drawer.rightOpen && drawer.rightTab === "chat" && mode !== "minimal") {
      updateDrawer({ rightOpen: false });
    }
  }, [chatIdle]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistMode = useCallback(
    (next: StudioMode) => {
      setMode(next);
      writeMode(next);
      setModeMenuOpen(false);
      if (next === "minimal") updateDrawer({ leftPanel: "none", rightOpen: true });
    },
    [updateDrawer]
  );

  const toggleLeft = useCallback(
    (id: Exclude<LeftPanel, "none">) => {
      updateDrawer({ leftPanel: drawer.leftPanel === id ? "none" : id });
    },
    [drawer.leftPanel, updateDrawer]
  );

  const closeDrawers = useCallback(() => {
    updateDrawer({ leftPanel: "none" });
    setModeMenuOpen(false);
    setPaletteOpen(false);
  }, [updateDrawer]);

  const openRight = useCallback(
    (tab: RightTab) => {
      updateDrawer({ rightOpen: true, rightTab: tab });
      setChatIdle(false);
      setFocusMode(false);
    },
    [updateDrawer]
  );

  const gate = useCallback(
    (allowed: boolean, message: string) => {
      if (allowed) return true;
      showToast(message);
      return false;
    },
    [showToast]
  );

  const toggleMic = useCallback(async () => {
    if (live.session && !gate(canPublishAv(live.myRole), "Speakers only")) return;
    const on = await media.toggleMic();
    void live.syncMedia({ micOn: on });
  }, [gate, live, media]);

  const toggleCam = useCallback(async () => {
    if (live.session && !gate(canPublishAv(live.myRole), "Speakers only")) return;
    const on = await media.toggleCamera();
    void live.syncMedia({ camOn: on });
  }, [gate, live, media]);

  const toggleRecord = useCallback(async () => {
    if (!online) {
      showToast("Recording unavailable offline");
      return;
    }
    if (live.session && !gate(canRecord(live.myRole), "Host controls only")) return;

    /* Prefer LiveKit Egress when a live session is active (survives browser close). */
    if (live.session?.status === "live") {
      try {
        if (egressRecording || recording) {
          const res = await fetch(`/api/live/sessions/${live.session.id}/recording`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "stop" }),
          });
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(json.error ?? "Stop recording failed");
          setEgressRecording(false);
          if (media.recordingState !== "idle") await media.stopRecording({ download: false });
          showToast("Recording stopping — replay will appear when ready");
          return;
        }
        const res = await fetch(`/api/live/sessions/${live.session.id}/recording`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Start recording failed");
        setEgressRecording(true);
        showToast("Recording started (LiveKit Egress)");
        return;
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Recording failed");
        /* fall through to local MediaRecorder only if egress unavailable */
        if (!(e instanceof Error && /not configured|503/i.test(e.message))) return;
      }
    }

    if (recording) {
      if (media.recordingState === "paused") {
        media.resumeRecording();
        showToast("Recording resumed");
        return;
      }
      const blob = await media.stopRecording({ download: true });
      showToast("Recording saved");
      if (blob && data?.session.communityId && chatRoomId) {
        const up = await uploadLiveRecording(blob, {
          communityId: data.session.communityId,
          roomId: chatRoomId,
        });
        if (up.ok && "url" in up && up.url) showToast("Recording uploaded");
        else if (!up.ok) showToast(up.error);
      }
      return;
    }
    const ok = await media.startRecording();
    showToast(ok ? "Recording started" : media.lastError ?? "Recording failed");
  }, [
    online,
    gate,
    live,
    recording,
    egressRecording,
    media,
    showToast,
    data,
    chatRoomId,
  ]);

  const recordingActive = recording || egressRecording;

  const startShare = useCallback(async () => {
    if (live.session && !gate(canShareScreen(live.myRole), "Speakers only")) return;
    const ok = await media.startScreenShare();
    if (ok) {
      setActivity("share");
      void live.syncMedia({ sharing: true });
    }
  }, [gate, live, media]);

  const stopShare = useCallback(() => {
    media.stopScreenShare();
    setActivity("live");
    void live.syncMedia({ sharing: false });
  }, [live, media]);

  const endLive = useCallback(async () => {
    if (!live.session) {
      showToast("No active live session");
      return;
    }
    if (!gate(canEndLive(live.myRole), "Only the host can end live")) return;
    try {
      media.stopScreenShare();
      if (egressRecording && live.session) {
        await fetch(`/api/live/sessions/${live.session.id}/recording`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        }).catch(() => undefined);
        setEgressRecording(false);
      }
      if (recording) await media.stopRecording({ download: true });
      await live.endLive();
      showToast("Live ended");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not end live");
    }
  }, [live, gate, media, recording, egressRecording, showToast]);

  const createOrJoinLive = useCallback(async () => {
    const communityId = data?.session.communityId ?? data?.rooms[0]?.community_id;
    const roomId = data?.session.roomId ?? data?.rooms[0]?.id ?? null;
    if (!communityId) {
      showToast("Join a community to go live");
      return;
    }
    try {
      if (live.session?.status === "live") {
        showToast("Already live");
        return;
      }
      await live.createLive({
        communityId,
        roomId,
        title: data?.session.title,
      }).then((session) => {
        if (session?.id && !sessionIdProp) {
          router.replace(`/communities/live/${session.id}`);
        }
      });
      showToast("You are live");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not start live");
    }
  }, [data, live, showToast, router, sessionIdProp]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (typing) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
          closeDrawers();
        }
        return;
      }
      if (e.key === "Escape") {
        if (focusMode) {
          setFocusMode(false);
          return;
        }
        closeDrawers();
        return;
      }
      if (meta || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "m") void toggleMic();
      if (k === "v") void toggleCam();
      if (k === "s") {
        if (media.sharing) stopShare();
        else void startShare();
      }
      if (k === "r") void toggleRecord();
      if (k === "p") {
        if (live.session && !gate(canLaunchPoll(live.myRole), "Moderators only")) return;
        setHasPolls(true);
        openRight("polls");
        void live
          .launchPoll("Which pair are you watching?", ["EUR/USD", "GBP/USD", "XAU/USD"])
          .catch(() => undefined);
      }
      if (k === "f" && !meta) setFocusMode((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    closeDrawers,
    focusMode,
    openRight,
    toggleCam,
    toggleMic,
    toggleRecord,
    media.sharing,
    startShare,
    stopShare,
    gate,
    live,
  ]);

  const speakersFromLive = useMemo(() => {
    if (live.speakers.length) {
      return live.speakers.map((p) => {
        const dash = data?.speakers.find((s) => s.id === p.user_id);
        const remote = livekit.remotes.find((r) => r.identity === p.user_id);
        return {
          id: p.user_id,
          name: dash?.name ?? remote?.name ?? (p.user_id === live.userId ? "You" : "Speaker"),
          avatar_url: dash?.avatar_url ?? null,
          role: p.role,
        };
      });
    }
    if (livekit.remotes.length) {
      return livekit.remotes
        .filter((r) => r.role !== "viewer")
        .map((r) => ({
          id: r.identity,
          name: r.name,
          avatar_url: null as string | null,
          role: r.role === "unknown" ? "speaker" : r.role,
        }));
    }
    return null;
  }, [live.speakers, live.userId, data?.speakers, livekit.remotes]);

  const speakers = useMemo(
    () => speakersFromLive ?? data?.speakers ?? [],
    [speakersFromLive, data?.speakers]
  );
  const analytics = data?.analytics;
  const session = data?.session ?? {
    title: "Community Live Room",
    host: "Jimvio",
    href: "/communities/live",
    tag: "Live Room",
    roomId: null,
  };
  const hasSession = Boolean(live.session?.status === "live" || data?.session.roomId);

  const speakerUi = useMemo(() => {
    const map: Record<string, SpeakerUi> = {};
    speakers.forEach((s, i) => {
      const liveP = live.participants.find((p) => p.user_id === s.id);
      const remote = livekit.remotes.find((r) => r.identity === s.id);
      const isSelf = s.id === live.userId;
      map[s.id] = {
        micOn: isSelf
          ? micOn
          : remote
            ? remote.micOn
            : liveP
              ? liveP.mic_on
              : i === 0
                ? micOn
                : true,
        camOn: isSelf
          ? camOn
          : remote
            ? remote.camOn
            : liveP
              ? liveP.cam_on
              : i === 0
                ? camOn
                : i !== 2,
        handRaised: liveP?.hand_raised ?? false,
        connection: String(livekit.connectionState) === "reconnecting" ? "warn" : "good",
        role:
          (liveP?.role as SpeakerUi["role"]) ??
          (remote?.role === "host" || remote?.role === "cohost" || remote?.role === "speaker"
            ? remote.role
            : i === 0
              ? "host"
              : i === 1
                ? "cohost"
                : "speaker"),
        speaking:
          (livekit.activeSpeakerId ?? activeSpeakerId) === s.id ||
          Boolean(remote?.speaking),
      };
    });
    return map;
  }, [
    speakers,
    micOn,
    camOn,
    activeSpeakerId,
    live.participants,
    live.userId,
    livekit.remotes,
    livekit.connectionState,
    livekit.activeSpeakerId,
  ]);

  const clips = useMemo(() => {
    const msgs = liveChat.messages.length ? liveChat.messages : data?.chatMessages ?? [];
    return msgs
      .filter((m) => m.body.length > 15)
      .slice(-5)
      .reverse()
      .map((m) => ({
        id: m.id,
        author: m.sender_name.split(" ")[0],
        text: m.body.slice(0, 90) + (m.body.length > 90 ? "…" : ""),
        time: formatTime(m.created_at),
      }));
  }, [data?.chatMessages, liveChat.messages]);

  const chatMessages = liveChat.messages.length ? liveChat.messages : data?.chatMessages ?? [];

  const visibleRightTabs = useMemo(() => {
    return RIGHT_TABS.filter((t) => {
      if (t.id === "polls" && !hasPolls && drawer.rightTab !== "polls") return false;
      if (t.id === "clips" && clips.length === 0 && drawer.rightTab !== "clips") return false;
      if (
        t.id === "events" &&
        (data?.upcomingSessions?.length ?? 0) === 0 &&
        (data?.relatedRooms?.length ?? 0) === 0 &&
        drawer.rightTab !== "events"
      )
        return false;
      return true;
    });
  }, [hasPolls, clips.length, data, drawer.rightTab]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopied(true);
      showToast("Link copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const commands = useMemo(
    () =>
      defaultLiveCommands({
        invite: () => {
          if (live.session && !gate(canInviteSpeaker(live.myRole), "Host controls only")) return;
          toggleLeft("people");
          showToast("Invite speakers");
        },
        muteAll: () => showToast("Muted all guests"),
        poll: () => {
          if (live.session && !gate(canLaunchPoll(live.myRole), "Moderators only")) return;
          setHasPolls(true);
          openRight("polls");
          void live
            .launchPoll("Which pair are you watching?", ["EUR/USD", "GBP/USD", "XAU/USD"])
            .catch(() => undefined);
        },
        clip: () => {
          openRight("clips");
          showToast("Moment clipped");
        },
        share: () => void startShare(),
        record: () => void toggleRecord(),
        analytics: () => openRight("analytics"),
        searchPeople: () => toggleLeft("people"),
      }),
    [openRight, showToast, toggleLeft, toggleRecord, startShare, gate, live]
  );

  const showLeftRail = mode === "studio" && !focusMode;
  const showSpeakers = mode !== "minimal" && !focusMode && hasSession;
  const showRight =
    !focusMode &&
    (mode === "minimal" || mode === "creator" || mode === "studio") &&
    (drawer.rightOpen || mode === "minimal");
  const immersive = activity === "share" || focusMode;

  if (loading) {
    return (
      <div
        className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f7f7f8]"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-4 w-4 animate-spin text-neutral-300" aria-hidden />
        <span className="sr-only">Loading live studio</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-[calc(100vh-56px)] min-h-[520px] flex-col text-neutral-900 motion-safe:transition-colors motion-safe:duration-[180ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
        immersive ? "bg-neutral-950" : "bg-[#f7f7f8]"
      )}
    >
      {/* Status banners — offline / load errors */}
      {(!online || loadError) && !focusMode && (
        <div
          role="alert"
          className="flex shrink-0 items-center justify-between gap-3 bg-neutral-900 px-4 py-2 text-[12px] text-white"
        >
          <p className="min-w-0 truncate tracking-[-0.01em]">
            {!online
              ? "You’re offline — reconnect to restore chat and controls."
              : loadError === "network"
                ? "Couldn’t reach the live service."
                : "Live data temporarily unavailable."}
          </p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className={cn(
              "shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium hover:bg-white/15",
              FOCUS_RING_DARK
            )}
          >
            Retry
          </button>
        </div>
      )}
      {/* Header */}
      {!focusMode && (
        <header
          className={cn(
            "flex h-10 shrink-0 items-center gap-3 px-3 transition-colors duration-[180ms] sm:px-5",
            immersive
              ? "bg-black/30 text-white backdrop-blur-xl"
              : "bg-white/50 backdrop-blur-xl"
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {hasSession ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-medium tracking-[0.06em]",
                  immersive ? "text-red-400/90" : "text-red-600/90"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {live.session?.status === "live" ? "LIVE" : "LIVE"}
              </span>
            ) : (
              <span className={cn("text-[10px] font-medium tracking-[0.06em]", immersive ? "text-white/35" : "text-neutral-400")}>
                OFFLINE
              </span>
            )}
            <h1
              className={cn(
                "truncate text-[13px] font-medium tracking-[-0.02em]",
                immersive ? "text-white/95" : "text-neutral-900"
              )}
            >
              {session.title}
            </h1>
            <span
              className={cn(
                "hidden tabular-nums text-[11px] sm:inline",
                immersive ? "text-white/35" : "text-neutral-400"
              )}
            >
              {formatElapsed(elapsed)}
            </span>
          </div>

          <div
            className={cn(
              "flex items-center gap-2.5 text-[12px]",
              immersive ? "text-white/45" : "text-neutral-500"
            )}
          >
            <span className="inline-flex items-center gap-1 tabular-nums tracking-[-0.01em]">
              <Users className="h-3.5 w-3.5 opacity-50" strokeWidth={1.6} />
              {formatCount(live.viewerCount || analytics?.viewers || 0)}
            </span>
            <ConnectionPill quality={connection} dark={immersive} />
          </div>

          <div className="flex items-center gap-0.5">
            <ModeSwitcher
              mode={mode}
              open={modeMenuOpen}
              dark={immersive}
              onOpenChange={setModeMenuOpen}
              onSelect={persistMode}
            />
            <button
              type="button"
              onClick={copyUrl}
              title="Copy link"
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full",
                MOTION_COLORS,
                immersive ? FOCUS_RING_DARK : FOCUS_RING,
                immersive
                  ? "text-white/50 hover:bg-white/10 hover:text-white"
                  : "text-neutral-400 hover:bg-black/[0.04] hover:text-neutral-700"
              )}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (live.session) {
                  if (!gate(canInviteSpeaker(live.myRole), "Host controls only")) return;
                  toggleLeft("people");
                  return;
                }
                void createOrJoinLive();
              }}
              className={cn(
                "ml-0.5 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium tracking-[-0.01em] active:scale-[0.98]",
                MOTION_COLORS,
                immersive ? FOCUS_RING_DARK : FOCUS_RING,
                immersive
                  ? "bg-white text-neutral-900 hover:bg-white/90"
                  : "bg-neutral-900 text-white hover:bg-neutral-800"
              )}
            >
              {live.session ? "Invite" : "Go Live"}
            </button>
            <button
              type="button"
              onClick={() => updateDrawer({ rightOpen: !drawer.rightOpen })}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full lg:hidden",
                MOTION_COLORS,
                immersive ? FOCUS_RING_DARK : FOCUS_RING,
                immersive
                  ? "text-white/50 hover:bg-white/10"
                  : "text-neutral-400 hover:bg-black/[0.04]"
              )}
              aria-label={drawer.rightOpen ? "Hide side panel" : "Show side panel"}
              aria-expanded={drawer.rightOpen}
            >
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
            </button>
          </div>
        </header>
      )}

      {/* Body */}
      <div className="relative flex min-h-0 flex-1">
        {showLeftRail && (
          <aside className="relative z-20 hidden w-11 shrink-0 flex-col items-center gap-0.5 bg-transparent py-3 md:flex">
            {LEFT_TOOLS.map(({ id, label, icon: Icon }) => (
              <RailIcon
                key={id}
                label={label}
                active={drawer.leftPanel === id}
                onClick={() => toggleLeft(id)}
              >
                <Icon className="h-4 w-4" strokeWidth={1.6} />
              </RailIcon>
            ))}
          </aside>
        )}

        {/* Left drawer */}
        {!focusMode && drawer.leftPanel !== "none" && (
          <>
            <aside
              className={cn(
                "absolute inset-y-0 z-30 hidden w-[272px] flex-col bg-white/97 shadow-[8px_0_40px_rgba(0,0,0,0.06)] backdrop-blur-xl md:flex",
                "animate-in fade-in slide-in-from-left-1 duration-[180ms]",
                showLeftRail ? "left-11" : "left-0"
              )}
            >
              <DrawerHeader
                title={LEFT_TOOLS.find((t) => t.id === drawer.leftPanel)?.label ?? ""}
                onClose={() => updateDrawer({ leftPanel: "none" })}
              />
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                {drawer.leftPanel === "people" && (
                  <PeoplePanel
                    speakers={speakers}
                    viewers={live.viewerCount || analytics?.liveViewers || 0}
                    activeSpeakerId={activeSpeakerId}
                    onSelect={(id) => {
                      setActiveSpeakerId(id);
                      if (
                        live.session &&
                        canInviteSpeaker(live.myRole) &&
                        id !== live.userId
                      ) {
                        void live
                          .invite(id)
                          .then(() => showToast("Invite sent"))
                          .catch((e) =>
                            showToast(e instanceof Error ? e.message : "Invite failed")
                          );
                      }
                    }}
                    query={peopleQuery}
                    onQuery={setPeopleQuery}
                  />
                )}
                {drawer.leftPanel === "rooms" && (
                  <RoomsPanel rooms={data?.rooms ?? []} related={data?.relatedRooms ?? []} />
                )}
                {drawer.leftPanel === "layout" && (
                  <LayoutPanel layout={layout} onChange={setLayout} />
                )}
                {drawer.leftPanel === "settings" && (
                  <SettingsPanel mode={mode} onMode={persistMode} />
                )}
              </div>
            </aside>

            <div className="fixed inset-0 z-50 md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/25"
                aria-label="Close"
                onClick={() => updateDrawer({ leftPanel: "none" })}
              />
              <div className="absolute inset-y-0 left-0 flex w-[min(300px,88vw)] flex-col bg-white shadow-2xl animate-in fade-in slide-in-from-left-2 duration-200">
                <DrawerHeader
                  title={LEFT_TOOLS.find((t) => t.id === drawer.leftPanel)?.label ?? ""}
                  onClose={() => updateDrawer({ leftPanel: "none" })}
                />
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                  {drawer.leftPanel === "people" && (
                    <PeoplePanel
                      speakers={speakers}
                      viewers={live.viewerCount || analytics?.liveViewers || 0}
                      activeSpeakerId={activeSpeakerId}
                      onSelect={(id) => {
                        setActiveSpeakerId(id);
                        if (
                          live.session &&
                          canInviteSpeaker(live.myRole) &&
                          id !== live.userId
                        ) {
                          void live
                            .invite(id)
                            .then(() => showToast("Invite sent"))
                            .catch((e) =>
                              showToast(e instanceof Error ? e.message : "Invite failed")
                            );
                        }
                      }}
                      query={peopleQuery}
                      onQuery={setPeopleQuery}
                    />
                  )}
                  {drawer.leftPanel === "rooms" && (
                    <RoomsPanel rooms={data?.rooms ?? []} related={data?.relatedRooms ?? []} />
                  )}
                  {drawer.leftPanel === "layout" && (
                    <LayoutPanel layout={layout} onChange={setLayout} />
                  )}
                  {drawer.leftPanel === "settings" && (
                    <SettingsPanel mode={mode} onMode={persistMode} />
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Stage */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              immersive ? "p-0 sm:p-1.5" : "p-2 sm:p-3 lg:p-5"
            )}
          >
            <div
              role="presentation"
              onDoubleClick={() => setFocusMode((v) => !v)}
              className={cn(
                "relative flex min-h-0 flex-1 cursor-default overflow-hidden bg-neutral-950",
                immersive ? "rounded-none sm:rounded-[16px]" : "rounded-[20px]",
                activity === "share" && "motion-safe:sm:scale-[1.002]",
                "motion-safe:transition-transform motion-safe:duration-[180ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#171717_0%,#050505_72%)]" />
              <StageMediaPreview stream={stageStream} />
              {livekit.remotes.map((r) => (
                <RemoteAudioSink key={`audio-${r.identity}`} stream={r.audioStream} />
              ))}

              {hasSession ? (
                <div className="relative z-[1] flex h-full w-full flex-col">
                  <div
                    className={cn(
                      "flex min-h-0 flex-1 items-center justify-center",
                      immersive ? "p-4 sm:p-8 lg:p-14" : "p-5 sm:p-10 lg:p-14"
                    )}
                  >
                    <div
                      className={cn(
                        "w-full overflow-hidden rounded-2xl bg-white/98 shadow-[0_24px_80px_rgba(0,0,0,0.4)] transition-all duration-[180ms]",
                        activity === "share" ? "max-w-5xl" : "max-w-4xl"
                      )}
                    >
                      <div className="flex items-center gap-1.5 px-4 py-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-200" />
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-200" />
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-200" />
                        <span className="ml-2 text-[10px] tracking-[-0.01em] text-neutral-400">
                          {activity === "share"
                            ? "Screen share"
                            : activity === "present"
                              ? "Presentation"
                              : layout}{" "}
                          · {session.host}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "border-t border-neutral-100/80 bg-gradient-to-b from-neutral-50/80 to-white text-center",
                          immersive ? "px-10 py-24 sm:py-28" : "px-8 py-16 sm:py-20 lg:py-24"
                        )}
                      >
                        <p className="text-[11px] font-normal tracking-[0.04em] text-neutral-400">
                          {session.tag}
                        </p>
                        <p className="mt-2.5 text-[1.45rem] font-medium tracking-[-0.04em] text-neutral-900 sm:text-[1.75rem] lg:text-[2rem]">
                          {session.title}
                        </p>
                      </div>
                    </div>
                  </div>

                  {showSpeakers && (
                    <div className="relative z-[2] flex justify-center px-3 pb-5 sm:pb-6">
                      <SpeakerStrip
                        speakers={speakers}
                        ui={speakerUi}
                        activeId={activeSpeakerId}
                        onSelect={setActiveSpeakerId}
                        onInvite={() => toggleLeft("people")}
                      />
                    </div>
                  )}

                  {focusMode && (
                    <button
                      type="button"
                      onClick={() => setFocusMode(false)}
                      className={cn(
                        "absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium tracking-[-0.01em] text-white/75 backdrop-blur-md hover:bg-white/15",
                        MOTION_COLORS,
                        FOCUS_RING_DARK
                      )}
                    >
                      Exit Focus
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center px-6 text-center">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                    <Radio className="h-6 w-6 text-white/35" strokeWidth={1.5} />
                  </div>
                  <p className="text-[15px] font-medium tracking-[-0.02em] text-white">
                    Ready when you are
                  </p>
                  <p className="mt-1.5 max-w-sm text-[13px] text-white/40">
                    Open a community room to start streaming.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => void createOrJoinLive()}
                      className="rounded-full bg-white px-4 py-2 text-[12px] font-medium text-neutral-900 transition-opacity duration-200 hover:opacity-90"
                    >
                      Go Live
                    </button>
                    <Link
                      href="/communities/explore"
                      className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-medium text-white/80 transition-opacity duration-200 hover:opacity-90"
                    >
                      Browse communities
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <ControlDock
              activity={activity}
              micOn={micOn}
              camOn={camOn}
              recording={recordingActive}
              focusMode={focusMode}
              onMic={() => void toggleMic()}
              onCam={() => void toggleCam()}
              onShare={() => void startShare()}
              onStopShare={stopShare}
              onPresent={() => setActivity((a) => (a === "present" ? "live" : "present"))}
              onRecord={() => void toggleRecord()}
              onPoll={() => {
                if (live.session && !gate(canLaunchPoll(live.myRole), "Moderators only")) return;
                setHasPolls(true);
                openRight("polls");
                void live
                  .launchPoll("Which pair are you watching?", ["EUR/USD", "GBP/USD", "XAU/USD"])
                  .catch(() => undefined);
              }}
              onInvite={() => {
                if (live.session && !gate(canInviteSpeaker(live.myRole), "Host controls only")) return;
                toggleLeft("people");
              }}
              onAnnotate={() => showToast("Annotate")}
              onLaser={() => showToast("Laser pointer")}
              onFullscreen={() => setFocusMode(true)}
              onPrev={() => showToast("Previous slide")}
              onNext={() => showToast("Next slide")}
              onTimer={() => showToast("Timer started")}
              onSlides={() => showToast("Slides")}
              onEnd={() => void endLive()}
            />
          </div>
        </main>

        {/* Right workspace */}
        {showRight && (
          <aside
            className={cn(
              "flex w-full max-w-[340px] shrink-0 flex-col bg-white/90 backdrop-blur-xl sm:w-[300px]",
              "fixed inset-y-0 right-0 z-40",
              "transition-transform duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              "lg:static lg:z-auto lg:max-w-none",
              drawer.rightOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
              !drawer.rightOpen && mode !== "minimal" && "lg:hidden"
            )}
          >
            <div
              role="tablist"
              aria-label="Workspace panels"
              className="flex items-end gap-0 overflow-x-auto px-2 pt-1 scrollbar-hide"
            >
              {visibleRightTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={drawer.rightTab === tab.id}
                  onClick={() => openRight(tab.id)}
                  className={cn(
                    "shrink-0 border-b-2 px-2.5 py-2.5 text-[12px] tracking-[-0.01em]",
                    MOTION_COLORS,
                    FOCUS_RING,
                    drawer.rightTab === tab.id
                      ? "border-neutral-900 font-medium text-neutral-900"
                      : "border-transparent font-normal text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  {tab.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => updateDrawer({ rightOpen: false })}
                className={cn(
                  "ml-auto mb-1.5 rounded-lg p-1.5 text-neutral-400 hover:text-neutral-600 lg:hidden",
                  MOTION_COLORS,
                  FOCUS_RING
                )}
                aria-label="Close side panel"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {drawer.rightTab === "chat" && (
                <ChatWorkspace
                  messages={chatMessages}
                  scrollTop={drawer.chatScroll}
                  onScrollSave={(y) => updateDrawer({ chatScroll: y })}
                  chatInput={chatInput}
                  setChatInput={(v) => {
                    setChatInput(v);
                    liveChat.signalTyping();
                  }}
                  onSend={async (body) => {
                    try {
                      await liveChat.send(body);
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "Message failed");
                    }
                  }}
                />
              )}
              {drawer.rightTab === "qa" && <QaPanel />}
              {drawer.rightTab === "polls" && <PollsPanel hasPolls={hasPolls} />}
              {drawer.rightTab === "clips" && <ClipsPanel clips={clips} />}
              {drawer.rightTab === "events" && (
                <EventsPanel
                  upcoming={data?.upcomingSessions ?? []}
                  related={data?.relatedRooms ?? []}
                />
              )}
              {drawer.rightTab === "analytics" && <AnalyticsPanel analytics={analytics} />}
            </div>
          </aside>
        )}
      </div>

      {/* Floating AI — never permanent chrome */}
      <AiFab
        hidden={focusMode}
        onAction={(id) => {
          if (id === "poll") {
            setHasPolls(true);
            openRight("polls");
          }
          if (id === "summarize" || id === "announce") openRight("chat");
          if (id === "moments" || id === "clips") openRight("clips");
        }}
      />

      <CommandPalette
        key={paletteOpen ? "open" : "closed"}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={commands}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-900/90 px-3 py-1.5 text-[11px] font-medium tracking-[-0.01em] text-white backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function ConnectionPill({
  quality,
  dark,
}: {
  quality: "excellent" | "good" | "poor";
  dark?: boolean;
}) {
  const Icon = quality === "poor" ? WifiOff : Wifi;
  const label = quality === "excellent" ? "Excellent" : quality === "good" ? "Good" : "Poor";
  return (
    <span
      className={cn(
        "hidden sm:inline-flex",
        dark
          ? "text-white/40"
          : quality === "excellent"
            ? "text-emerald-600/80"
            : quality === "good"
              ? "text-amber-600/80"
              : "text-red-500/80"
      )}
      title={`Connection: ${label}`}
      aria-label={`Connection ${label}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
    </span>
  );
}

function RailIcon({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="group/item relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          MOTION_COLORS,
          FOCUS_RING,
          active
            ? "bg-neutral-900 text-white"
            : "text-neutral-400 hover:bg-black/[0.04] hover:text-neutral-700"
        )}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-x-0.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg motion-safe:transition-all motion-safe:duration-150 group-hover/item:translate-x-0 group-hover/item:opacity-100">
        {label}
      </span>
    </div>
  );
}

function ModeSwitcher({
  mode,
  open,
  dark,
  onOpenChange,
  onSelect,
}: {
  mode: StudioMode;
  open: boolean;
  dark?: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (m: StudioMode) => void;
}) {
  const labels: Record<StudioMode, string> = {
    minimal: "Minimal",
    creator: "Creator",
    studio: "Studio",
  };
  return (
    <div className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Workspace mode: ${labels[mode]}`}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full px-2 text-[11px] font-normal tracking-[-0.01em]",
          MOTION_COLORS,
          dark ? FOCUS_RING_DARK : FOCUS_RING,
          dark
            ? "text-white/40 hover:bg-white/10 hover:text-white/80"
            : "text-neutral-400 hover:bg-black/[0.04] hover:text-neutral-700"
        )}
      >
        <MonitorPlay className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        {labels[mode]}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close mode menu" onClick={() => onOpenChange(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl bg-white p-1 shadow-[0_12px_40px_rgba(0,0,0,0.1)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150"
          >
            {(
              [
                ["minimal", "Minimal", "Stage + Chat"],
                ["creator", "Creator", "Stage + Speakers"],
                ["studio", "Studio", "Full tools"],
              ] as const
            ).map(([id, title, desc]) => (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={mode === id}
                onClick={() => onSelect(id)}
                className={cn(
                  "flex w-full flex-col rounded-lg px-3 py-2 text-left",
                  MOTION_COLORS,
                  FOCUS_RING,
                  mode === id ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
                )}
              >
                <span className="text-[12px] font-medium tracking-[-0.01em]">{title}</span>
                <span className={cn("text-[10px]", mode === id ? "text-white/50" : "text-neutral-400")}>
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
