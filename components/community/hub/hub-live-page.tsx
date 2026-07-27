"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Fullscreen,
  Loader2,
  Menu,
  MessageSquare,
  MonitorPlay,
  MoreHorizontal,
  Radio,
  Settings,
  Share2,
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
  canAcceptSpeaker,
  canEndLive,
  canInviteSpeaker,
  canLaunchPoll,
  canPublishAv,
  canRecord,
  canRejectSpeaker,
  canShareScreen,
} from "@/lib/live/roles";
import { uploadLiveRecording } from "@/lib/live/upload-recording";
import { AiFab } from "./live/AiFab";
import { CommandPalette, defaultLiveCommands } from "./live/CommandPalette";
import { ControlDock, useEphemeralToast } from "./live/ControlDock";
import { ChatWorkspace } from "./live/ChatWorkspace";
import { LiveContextNav } from "./live/LiveContextNav";
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
import {
  LiveAiPanel,
  LiveCommerceRail,
  LiveCreatorTools,
  LiveKnowledgeCapture,
  LivePollsCollabPanel,
  LiveQaCollabPanel,
  LiveReactionsBar,
  LiveRecordingPanel,
  LiveResourcesPanel,
  LiveRoomTypePicker,
  LiveSharedNotes,
  LiveTasksPanel,
  LiveWhiteboardLazy,
  ScreenShareMenu,
} from "@/components/community/live-collab";
import { useLiveCollabStore } from "@/lib/community/live-collab";
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
import {
  FOCUS_RING,
  FOCUS_RING_DARK,
  LIVE_PAGE_BG,
  MOTION_COLORS,
} from "./live/studio-ui";

type LoadError = "network" | "server" | null;

export function HubLivePage({
  sessionId: sessionIdProp,
  communitySlug: communitySlugProp,
}: {
  sessionId?: string;
  communitySlug?: string;
}) {
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
  const [peopleQuery, setPeopleQuery] = useState("");
  const [chatIdle, setChatIdle] = useState(false);
  const [hasPolls, setHasPolls] = useState(false);
  const [egressRecording, setEgressRecording] = useState(false);
  const [liveNavOpen, setLiveNavOpen] = useState(false);
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
      const qs = communitySlugProp
        ? `?slug=${encodeURIComponent(communitySlugProp)}`
        : "";
      const res = await fetch(`/api/c/live${qs}`);
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
  }, [communitySlugProp]);

  const updateDrawer = useCallback((patch: Partial<DrawerState>) => {
    setDrawer((prev) => {
      const next = { ...prev, ...patch };
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => writeDrawerState(next), 200);
      return next;
    });
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /* Resume active live session, or join viewer sessionId from route */
  const autoJoinedRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (sessionIdProp) {
          if (autoJoinedRef.current === sessionIdProp) return;
          autoJoinedRef.current = sessionIdProp;
          await live.join(sessionIdProp);
          return;
        }
        const scopedId = data?.session.liveSessionId;
        if (scopedId) {
          if (autoJoinedRef.current === scopedId) return;
          autoJoinedRef.current = scopedId;
          await live.join(scopedId);
          if (!cancelled) router.replace(`/communities/live/${scopedId}`);
          return;
        }
        if (communitySlugProp) return;
        const res = await fetch("/api/c/live/sessions");
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { sessions?: Array<{ id: string }> };
        const first = json.sessions?.[0];
        if (first?.id) {
          if (autoJoinedRef.current === first.id) return;
          autoJoinedRef.current = first.id;
          await live.join(first.id);
          router.replace(`/communities/live/${first.id}`);
        }
      } catch {
        autoJoinedRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdProp, data?.session.liveSessionId, communitySlugProp]);

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

  const [pendingInvite, setPendingInvite] = useState(false);
  const invitePromptedRef = useRef(false);
  const wasPublishableRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!live.userId || !live.session) return;
    const me = live.participants.find((p) => p.user_id === live.userId);
    if (me?.status === "invited") {
      setPendingInvite(true);
      if (!invitePromptedRef.current) {
        invitePromptedRef.current = true;
        showToast("Speaker invite — Accept to join the stage");
      }
      return;
    }
    setPendingInvite(false);
    if (me?.status === "joined") invitePromptedRef.current = false;
  }, [live.participants, live.userId, live.session, showToast]);

  /* Remint LiveKit token when role upgrades to publishable (e.g. host accepts hand raise). */
  useEffect(() => {
    if (!live.session || live.session.status !== "live") {
      wasPublishableRef.current = null;
      return;
    }
    const publishable = canPublishAv(live.myRole);
    const prev = wasPublishableRef.current;
    wasPublishableRef.current = publishable;
    if (prev === false && publishable) {
      void livekit.reconnect().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remint on role upgrade only
  }, [live.myRole, live.session?.id, live.session?.status, livekit.reconnect]);

  /* Host mute: force local mic off when server marks mic_on false. */
  useEffect(() => {
    if (!live.userId) return;
    const me = live.participants.find((p) => p.user_id === live.userId);
    if (me && me.mic_on === false && media.micOn) {
      media.plane.current?.setMicEnabled(false);
    }
  }, [live.participants, live.userId, media.micOn, media.plane]);

  useEffect(() => {
    if (live.session?.status !== "live" || !live.session.started_at) {
      setElapsed(0);
      return;
    }
    const started = new Date(live.session.started_at).getTime();
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [live.session?.status, live.session?.started_at]);

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
    const prefs = useLiveCollabStore.getState();
    const ok = await media.startScreenShare({
      target: prefs.shareTarget,
      quality: prefs.shareQuality,
    });
    if (ok) {
      setActivity(prefs.presenterMode ? "present" : "share");
      void live.syncMedia({ sharing: true });
    }
  }, [gate, live, media]);

  const stopShare = useCallback(() => {
    media.stopScreenShare();
    setActivity("live");
    void live.syncMedia({ sharing: false });
  }, [live, media]);

  const leaveLive = useCallback(async () => {
    if (!live.session) return;
    if (canEndLive(live.myRole)) {
      showToast("Host must end the live session");
      return;
    }
    try {
      media.stopScreenShare();
      await live.leave();
      showToast("Left live — discussion stays open");
      const href =
        data?.session.discussionHref ??
        (data?.session.communitySlug
          ? `/communities/${data.session.communitySlug}`
          : "/communities");
      router.push(href);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not leave");
    }
  }, [live, media, showToast, router, data?.session.discussionHref, data?.session.communitySlug]);

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
      showToast("Live ended — discussion stays open");
      void loadDashboard();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not end live");
    }
  }, [live, gate, media, recording, egressRecording, showToast, loadDashboard]);

  const createOrJoinLive = useCallback(async () => {
    const communityId =
      data?.session.communityId ?? data?.rooms[0]?.community_id ?? null;
    const roomId = data?.session.roomId ?? data?.rooms[0]?.id ?? null;
    try {
      if (live.session?.status === "live") {
        showToast("Already live");
        return;
      }
      await live
        .createLive({
          communityId,
          roomId: communityId ? roomId : null,
          title: data?.session.title || (communityId ? undefined : "Creator Live"),
          privacy: communityId ? undefined : "public",
        })
        .then((session) => {
          if (session?.id && !sessionIdProp) {
            router.replace(`/communities/live/${session.id}`);
          }
        });
      setElapsed(0);
      showToast(communityId ? "You are live" : "Creator Live started");
      void loadDashboard();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not start live");
    }
  }, [data, live, showToast, router, sessionIdProp, loadDashboard]);

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

  const analytics = data?.analytics;
  const session = data?.session ?? {
    title: "Community Live Room",
    host: "Jimvio",
    href: "/communities/live",
    tag: "Live Room",
    roomId: null,
  };
  const hasSession = Boolean(live.session?.status === "live");
  const speakers = useMemo(() => {
    if (speakersFromLive) return speakersFromLive;
    // Dashboard speakers are participant-backed only when a live session exists.
    if (hasSession || data?.session?.liveSessionId) return data?.speakers ?? [];
    return [];
  }, [speakersFromLive, data?.speakers, data?.session?.liveSessionId, hasSession]);

  const pendingHandRaises = useMemo(() => {
    return live.participants
      .filter((p) => p.status === "requested")
      .map((p) => {
        const dash = data?.speakers.find((s) => s.id === p.user_id);
        const remote = livekit.remotes.find((r) => r.identity === p.user_id);
        return {
          id: p.user_id,
          name: dash?.name ?? remote?.name ?? (p.user_id === live.userId ? "You" : "Viewer"),
          avatar_url: dash?.avatar_url ?? null,
          role: "requested",
        };
      });
  }, [live.participants, live.userId, data?.speakers, livekit.remotes]);

  const peoplePanelProps = useMemo(() => {
    const canManageRequests =
      canAcceptSpeaker(live.myRole) || canRejectSpeaker(live.myRole);
    return {
      speakers,
      viewers: live.viewerCount || analytics?.liveViewers || 0,
      activeSpeakerId,
      onSelect: (id: string) => {
        // Speakers are already on stage — only focus them; never re-invite.
        setActiveSpeakerId(id);
      },
      query: peopleQuery,
      onQuery: setPeopleQuery,
      pendingRequests: canManageRequests ? pendingHandRaises : undefined,
      onAcceptRequest: canAcceptSpeaker(live.myRole)
        ? (id: string) => {
            void live
              .accept(id)
              .then(() => showToast("Speaker accepted"))
              .catch((e) =>
                showToast(e instanceof Error ? e.message : "Accept failed")
              );
          }
        : undefined,
      onRejectRequest: canRejectSpeaker(live.myRole)
        ? (id: string) => {
            void live
              .reject(id)
              .then(() => showToast("Request declined"))
              .catch((e) =>
                showToast(e instanceof Error ? e.message : "Reject failed")
              );
          }
        : undefined,
    };
  }, [
    speakers,
    live.viewerCount,
    live.myRole,
    live.accept,
    live.reject,
    analytics?.liveViewers,
    activeSpeakerId,
    peopleQuery,
    pendingHandRaises,
    showToast,
  ]);
  const liveStatusLabel =
    live.session?.status === "live"
      ? "LIVE"
      : live.session?.status === "ended" || data?.session.liveStatus === "ended"
        ? "ENDED"
        : data?.session.liveStatus === "scheduled"
          ? "UPCOMING"
          : "OFFLINE";
  const discussionHref =
    data?.session.discussionHref ??
    (data?.session.communitySlug
      ? `/communities/${data.session.communitySlug}`
      : "/communities");

  const speakerUi = useMemo(() => {
    const map: Record<string, SpeakerUi> = {};
    speakers.forEach((s) => {
      const liveP = live.participants.find((p) => p.user_id === s.id);
      const remote = livekit.remotes.find((r) => r.identity === s.id);
      const isSelf = s.id === live.userId;
      const roleFromLabel =
        s.role === "Host" || s.role === "host"
          ? ("host" as const)
          : s.role === "Co-host" || s.role === "cohost"
            ? ("cohost" as const)
            : ("speaker" as const);
      map[s.id] = {
        micOn: isSelf ? micOn : remote ? remote.micOn : liveP ? liveP.mic_on : false,
        camOn: isSelf ? camOn : remote ? remote.camOn : liveP ? liveP.cam_on : false,
        handRaised: liveP?.hand_raised ?? false,
        connection: String(livekit.connectionState) === "reconnecting" ? "warn" : "good",
        role:
          (liveP?.role as SpeakerUi["role"]) ??
          (remote?.role === "host" || remote?.role === "cohost" || remote?.role === "speaker"
            ? remote.role
            : roleFromLabel),
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
      if (t.id === "clips" && clips.length === 0 && drawer.rightTab !== "clips") return false;
      if (
        t.id === "events" &&
        (data?.upcomingSessions?.length ?? 0) === 0 &&
        (data?.relatedRooms?.length ?? 0) === 0 &&
        drawer.rightTab !== "events"
      )
        return false;
      // Always expose collaboration suite tabs
      return true;
    });
  }, [clips.length, data, drawer.rightTab]);

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

  const showLeftRail = !focusMode;
  const showSpeakers = mode !== "minimal" && !focusMode && hasSession;
  const showRight =
    !focusMode &&
    (mode === "minimal" || mode === "creator" || mode === "studio") &&
    (drawer.rightOpen || mode === "minimal");
  const immersive = activity === "share" || focusMode;
  const startedLabel = live.session?.started_at
    ? `Started ${formatTime(live.session.started_at)}`
    : null;

  if (loading) {
    return (
      <div
        className={cn("flex min-h-[calc(100vh-56px)] items-center justify-center", LIVE_PAGE_BG)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-neutral-200/70" />
          <Loader2 className="h-4 w-4 animate-spin text-neutral-300" aria-hidden />
          <span className="sr-only">Loading live studio</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-[calc(100vh-56px)] min-h-[520px] flex-col text-neutral-900 motion-safe:transition-colors motion-safe:duration-[180ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
        immersive ? "bg-neutral-950" : LIVE_PAGE_BG
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
      {pendingInvite && hasSession && !focusMode && (
        <div
          role="status"
          className="flex shrink-0 items-center justify-between gap-3 bg-accent px-4 py-2 text-[12px] text-white"
        >
          <p className="min-w-0 truncate font-medium">
            You’ve been invited to speak on stage.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => {
                void live
                  .acceptInvite()
                  .then(() => livekit.reconnect())
                  .then(() => {
                    setPendingInvite(false);
                    showToast("You’re on stage");
                  })
                  .catch((e) =>
                    showToast(e instanceof Error ? e.message : "Could not accept")
                  );
              }}
              className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-accent"
            >
              Accept
            </button>
          </div>
        </div>
      )}
      {/* Header — match reference: back link + one info/actions row */}
      {!focusMode && (
        <header
          className={cn(
            "shrink-0 px-4 py-2.5 transition-colors duration-[180ms] sm:px-5",
            immersive ? "bg-black/30 text-white" : "bg-white"
          )}
        >
          <div className="mb-1.5 flex items-center gap-2">
            <button
              type="button"
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg lg:hidden",
                immersive ? "text-white/70 hover:bg-white/10" : "text-neutral-500 hover:bg-neutral-50",
                FOCUS_RING
              )}
              aria-label="Open live menu"
              onClick={() => setLiveNavOpen(true)}
            >
              <Menu className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
            <Link
              href="/communities/live"
              className={cn(
                "inline-flex items-center gap-1 text-[12px] font-medium",
                immersive ? "text-white/55 hover:text-white" : "text-neutral-500 hover:text-neutral-800",
                FOCUS_RING
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Back to Live
            </Link>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {hasSession ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em] text-white">
                    LIVE
                  </span>
                ) : (
                  <span className={cn("text-[10px] font-semibold tracking-[0.06em]", immersive ? "text-white/35" : "text-neutral-400")}>
                    {liveStatusLabel}
                  </span>
                )}
                <h1
                  className={cn(
                    "min-w-0 truncate text-[17px] font-bold tracking-[-0.03em] sm:text-[18px]",
                    immersive ? "text-white" : "text-neutral-900"
                  )}
                >
                  {session.title}
                </h1>
              </div>
              <p
                className={cn(
                  "mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px]",
                  immersive ? "text-white/45" : "text-neutral-500"
                )}
              >
                <span>{session.tag || "Live Room"}</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">
                  {formatCount(live.viewerCount || analytics?.viewers || 0)} watching
                </span>
                {startedLabel && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{startedLabel}</span>
                  </>
                )}
                {hasSession && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="font-medium tabular-nums text-red-500">{formatElapsed(elapsed)}</span>
                  </>
                )}
                <span aria-hidden>·</span>
                <Link
                  href={discussionHref}
                  className={cn(
                    "font-medium underline-offset-2 hover:underline",
                    immersive ? "text-white/55" : "text-neutral-500"
                  )}
                >
                  Discussion
                </Link>
                <ConnectionPill quality={connection} dark={immersive} />
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {!hasSession && (
                <button
                  type="button"
                  onClick={() => void createOrJoinLive()}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full bg-accent px-3.5 text-[12px] font-semibold text-white hover:bg-accent-hover",
                    FOCUS_RING
                  )}
                >
                  Go Live
                </button>
              )}
              <button
                type="button"
                onClick={() => showToast("Following host")}
                className={cn(
                  "hidden h-9 items-center rounded-full border px-3.5 text-[12px] font-semibold sm:inline-flex",
                  MOTION_COLORS,
                  immersive ? FOCUS_RING_DARK : FOCUS_RING,
                  immersive
                    ? "border-white/20 text-white hover:bg-white/10"
                    : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                )}
              >
                Follow
              </button>
              <button
                type="button"
                onClick={copyUrl}
                title="Share"
                aria-label="Share live link"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full",
                  MOTION_COLORS,
                  immersive ? FOCUS_RING_DARK : FOCUS_RING,
                  immersive
                    ? "text-white/50 hover:bg-white/10 hover:text-white"
                    : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                )}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                ) : (
                  <Share2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => toggleLeft("settings")}
                title="More"
                aria-label="More options"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full",
                  MOTION_COLORS,
                  immersive ? FOCUS_RING_DARK : FOCUS_RING,
                  immersive
                    ? "text-white/50 hover:bg-white/10 hover:text-white"
                    : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                )}
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.6} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => updateDrawer({ rightOpen: !drawer.rightOpen })}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full lg:hidden",
                  MOTION_COLORS,
                  immersive ? FOCUS_RING_DARK : FOCUS_RING,
                  immersive
                    ? "text-white/50 hover:bg-white/10"
                    : "text-neutral-400 hover:bg-neutral-50"
                )}
                aria-label={drawer.rightOpen ? "Hide side panel" : "Show side panel"}
                aria-expanded={drawer.rightOpen}
              >
                <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Body — three columns: LIVE NOW | Stage | Chat */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {showLeftRail && (
          <>
            <LiveContextNav
              leftPanel={drawer.leftPanel}
              rightTab={drawer.rightTab}
              viewerCount={live.viewerCount || analytics?.viewers || 0}
              liveStatus={
                hasSession
                  ? "LIVE"
                  : liveStatusLabel === "ENDED"
                    ? "ENDED"
                    : liveStatusLabel === "UPCOMING"
                      ? "UPCOMING"
                      : "OFFLINE"
              }
              title={session.title}
              category={session.tag || "Live Room"}
              onOverview={() => {
                updateDrawer({ leftPanel: "none", rightTab: "chat", rightOpen: true });
                setLiveNavOpen(false);
              }}
              onOpenLeft={(panel) => {
                toggleLeft(panel);
                setLiveNavOpen(false);
              }}
              onOpenRight={(tab) => {
                openRight(tab);
                setLiveNavOpen(false);
              }}
              onShare={copyUrl}
              onInvite={() => {
                if (live.session && !gate(canInviteSpeaker(live.myRole), "Host controls only")) return;
                toggleLeft("people");
                setLiveNavOpen(false);
              }}
              onClip={() => {
                openRight("clips");
                setLiveNavOpen(false);
              }}
              onSave={() => {
                openRight("recording");
                setLiveNavOpen(false);
              }}
              onReport={() => showToast("Report submitted")}
              onFollow={() => showToast("Following host")}
              onGoLive={() => void createOrJoinLive()}
              hasSession={hasSession}
            />
            {liveNavOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/30"
                  aria-label="Close live menu"
                  onClick={() => setLiveNavOpen(false)}
                />
                <div className="absolute inset-y-0 left-0 flex w-[min(280px,88vw)] flex-col bg-white shadow-2xl">
                  <div className="flex items-center justify-end border-b border-neutral-100 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setLiveNavOpen(false)}
                      className={cn("rounded-lg p-2 text-neutral-400 hover:text-neutral-700", FOCUS_RING)}
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <LiveContextNav
                      variant="drawer"
                      leftPanel={drawer.leftPanel}
                      rightTab={drawer.rightTab}
                      viewerCount={live.viewerCount || analytics?.viewers || 0}
                      liveStatus={
                        hasSession
                          ? "LIVE"
                          : liveStatusLabel === "ENDED"
                            ? "ENDED"
                            : liveStatusLabel === "UPCOMING"
                              ? "UPCOMING"
                              : "OFFLINE"
                      }
                      title={session.title}
                      category={session.tag || "Live Room"}
                      onOverview={() => {
                        updateDrawer({ leftPanel: "none", rightTab: "chat", rightOpen: true });
                        setLiveNavOpen(false);
                      }}
                      onOpenLeft={(panel) => {
                        toggleLeft(panel);
                        setLiveNavOpen(false);
                      }}
                      onOpenRight={(tab) => {
                        openRight(tab);
                        setLiveNavOpen(false);
                      }}
                      onShare={copyUrl}
                      onInvite={() => {
                        if (live.session && !gate(canInviteSpeaker(live.myRole), "Host controls only"))
                          return;
                        toggleLeft("people");
                        setLiveNavOpen(false);
                      }}
                      onClip={() => {
                        openRight("clips");
                        setLiveNavOpen(false);
                      }}
                      onSave={() => {
                        openRight("recording");
                        setLiveNavOpen(false);
                      }}
                      onReport={() => showToast("Report submitted")}
                      onFollow={() => showToast("Following host")}
                      onGoLive={() => void createOrJoinLive()}
                      hasSession={hasSession}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Left drawer */}
        {!focusMode && drawer.leftPanel !== "none" && (
          <>
            <aside
              className={cn(
                "absolute inset-y-0 z-30 hidden w-[280px] flex-col bg-white shadow-[8px_0_40px_rgba(0,0,0,0.06)] md:flex",
                "animate-in fade-in slide-in-from-left-1 duration-[180ms]",
                showLeftRail ? "left-[220px]" : "left-0"
              )}
            >
              <DrawerHeader
                title={LEFT_TOOLS.find((t) => t.id === drawer.leftPanel)?.label ?? ""}
                onClose={() => updateDrawer({ leftPanel: "none" })}
              />
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                {drawer.leftPanel === "people" && <PeoplePanel {...peoplePanelProps} />}
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
                  {drawer.leftPanel === "people" && <PeoplePanel {...peoplePanelProps} />}
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

        {/* Stage — large 16:9 player, speakers, dock */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f7f7f8]">
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-y-auto",
              immersive ? "p-0" : "px-3 pb-3 pt-1 sm:px-4 sm:pb-4"
            )}
          >
            <div
              role="presentation"
              onDoubleClick={() => setFocusMode((v) => !v)}
              className={cn(
                "relative w-full shrink-0 cursor-default overflow-hidden bg-neutral-950 shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
                immersive ? "min-h-0 flex-1 rounded-none" : "aspect-video rounded-2xl",
                activity === "share" && "motion-safe:sm:scale-[1.002]",
                "motion-safe:transition-transform motion-safe:duration-[180ms]"
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#1a1a1a_0%,#050505_72%)]" />
              <StageMediaPreview stream={stageStream} cover={Boolean(stageStream)} />
              {livekit.remotes.map((r) => (
                <RemoteAudioSink key={`audio-${r.identity}`} stream={r.audioStream} />
              ))}

              {hasSession ? (
                <div className="relative z-[2] h-full w-full">
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
                    <div className="pointer-events-auto flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-2 py-1 text-[10px] font-bold tracking-[0.04em] text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        LIVE
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium tabular-nums text-white backdrop-blur-md">
                        {formatCount(live.viewerCount || analytics?.viewers || 0)}
                      </span>
                      {recordingActive && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600/90 px-2 py-1 text-[10px] font-semibold text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          REC
                        </span>
                      )}
                    </div>
                    <div className="pointer-events-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        className={cn(
                          "rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md hover:bg-black/70",
                          FOCUS_RING_DARK
                        )}
                        aria-label="Quality 1080p"
                      >
                        1080p
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLeft("settings")}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white/85 backdrop-blur-md hover:bg-black/70",
                          FOCUS_RING_DARK
                        )}
                        aria-label="Player settings"
                      >
                        <Settings className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                      </button>
                    </div>
                  </div>

                  {!stageStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                      {livekit.connecting ? (
                        <p className="inline-flex items-center gap-2 text-[13px] text-white/55">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Connecting…
                        </p>
                      ) : livekit.error ? (
                        <div className="max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-200">
                          <p className="font-medium">Connection issue</p>
                          <p className="mt-1 text-red-200/80">{livekit.error}</p>
                          <button
                            type="button"
                            onClick={() => void livekit.reconnect()}
                            className={cn(
                              "mt-2 rounded-full bg-white/10 px-3 py-1 font-medium text-white hover:bg-white/15",
                              FOCUS_RING_DARK
                            )}
                          >
                            Reconnect
                          </button>
                        </div>
                      ) : (
                        <>
                          <Radio className="mb-3 h-8 w-8 text-white/30" strokeWidth={1.5} aria-hidden />
                          <p className="text-[14px] font-medium text-white/70">{session.host}</p>
                          <p className="mt-1 text-[12px] text-white/35">Waiting for media…</p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pb-2.5 pt-10">
                    <div className="mb-2 h-[3px] overflow-hidden rounded-full bg-white/25">
                      <div className="h-full w-full rounded-full bg-accent" />
                    </div>
                    <div className="pointer-events-auto flex items-center gap-2.5 text-white/90">
                      <button
                        type="button"
                        className={cn("rounded p-0.5 hover:bg-white/10", FOCUS_RING_DARK)}
                        aria-label="Play"
                        onClick={() => undefined}
                      >
                        <MonitorPlay className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                      </button>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        LIVE
                      </span>
                      <span className="tabular-nums text-[11px] text-white/70">
                        {formatElapsed(elapsed)}
                      </span>
                      <div className="ml-auto flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setFocusMode(true)}
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10",
                            FOCUS_RING_DARK
                          )}
                          aria-label="Enter fullscreen"
                        >
                          <Fullscreen className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>

                  {focusMode && (
                    <button
                      type="button"
                      onClick={() => setFocusMode(false)}
                      className={cn(
                        "absolute right-4 top-4 z-20 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/75 backdrop-blur-md hover:bg-white/15",
                        MOTION_COLORS,
                        FOCUS_RING_DARK
                      )}
                    >
                      Exit Focus
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative z-[1] flex h-full min-h-[220px] w-full flex-col items-center justify-center px-6 text-center aspect-video">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06]">
                    <Radio className="h-5 w-5 text-white/35" strokeWidth={1.5} />
                  </div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                    Ready when you are
                  </p>
                  <p className="mt-1.5 max-w-sm text-[13px] text-white/40">
                    Open a community room to start streaming.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => void createOrJoinLive()}
                      className="rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-white hover:bg-accent-hover"
                    >
                      Go Live
                    </button>
                    <Link
                      href="/communities/explore"
                      className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-medium text-white/80 hover:opacity-90"
                    >
                      Browse communities
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {hasSession && showSpeakers && (
              <div className="mt-2.5 shrink-0 sm:mt-3">
                <SpeakerStrip
                  speakers={speakers}
                  ui={speakerUi}
                  activeId={activeSpeakerId}
                  onSelect={setActiveSpeakerId}
                  onInvite={() => toggleLeft("people")}
                />
              </div>
            )}

            {hasSession ? (
            <ControlDock
              activity={activity}
              micOn={micOn}
              camOn={camOn}
              recording={recordingActive}
              sharing={media.sharing}
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
              onReact={() => openRight("chat")}
              onQa={() => openRight("qa")}
              onCopyLink={copyUrl}
              onAnnotate={() => showToast("Annotate")}
              onLaser={() => showToast("Laser pointer")}
              onFullscreen={() => setFocusMode(true)}
              onPrev={() => showToast("Previous slide")}
              onNext={() => showToast("Next slide")}
              onTimer={() => showToast("Timer started")}
              onSlides={() => showToast("Slides")}
              onMore={() => openRight("tools")}
              onEnd={() => void endLive()}
              onLeave={() => void leaveLive()}
              canEnd={canEndLive(live.myRole)}
            />
            ) : null}
          </div>
        </main>

        {/* Right workspace — Live Chat column */}
        {showRight && (
          <aside
            className={cn(
              "flex w-full max-w-[300px] shrink-0 flex-col bg-white sm:w-[300px]",
              "fixed inset-y-0 right-0 z-40",
              "transition-transform duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              "lg:static lg:z-auto lg:max-w-none lg:border-l lg:border-neutral-100",
              drawer.rightOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
              !drawer.rightOpen && mode !== "minimal" && "lg:hidden"
            )}
          >
            {drawer.rightTab !== "chat" && (
            <div
              role="tablist"
              aria-label="Workspace panels"
              className="flex items-end gap-0 overflow-x-auto border-b border-neutral-100 px-2 pt-1 scrollbar-hide"
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
                      ? "border-accent font-semibold text-accent"
                      : "border-transparent font-medium text-neutral-400 hover:text-neutral-600"
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
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              {drawer.rightTab === "chat" && (
                <>
                  <div className="flex items-center justify-end px-2 pt-1 lg:hidden">
                    <button
                      type="button"
                      onClick={() => updateDrawer({ rightOpen: false })}
                      className={cn(
                        "rounded-lg p-1.5 text-neutral-400 hover:text-neutral-600",
                        FOCUS_RING
                      )}
                      aria-label="Close side panel"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <ChatWorkspace
                    messages={chatMessages}
                    scrollTop={drawer.chatScroll}
                    onScrollSave={(y) => updateDrawer({ chatScroll: y })}
                    chatInput={chatInput}
                    setChatInput={(v) => {
                      setChatInput(v);
                      liveChat.signalTyping();
                    }}
                    hostName={session.host}
                    participantAvatars={speakers.slice(0, 6).map((s) => ({
                      name: s.name,
                      src: s.avatar_url,
                    }))}
                    onSend={async (body, reply) => {
                      try {
                        await liveChat.send(body, reply);
                      } catch (e) {
                        showToast(e instanceof Error ? e.message : "Message failed");
                      }
                    }}
                  />
                  {live.session?.id && (
                    <LiveReactionsBar
                      sessionId={live.session.id}
                      userId={live.userId}
                      userName={null}
                      handRaised={
                        live.participants.find((p) => p.user_id === live.userId)
                          ?.hand_raised === true ||
                        live.participants.find((p) => p.user_id === live.userId)
                          ?.status === "requested"
                      }
                      onReact={async (emoji) => {
                        try {
                          await live.react(emoji);
                        } catch {
                          /* local reaction already shown */
                        }
                      }}
                      onRaiseHand={async () => {
                        try {
                          await live.requestSpeak();
                          showToast("Hand raised — waiting for host");
                        } catch (e) {
                          showToast(
                            e instanceof Error ? e.message : "Could not raise hand"
                          );
                        }
                      }}
                    />
                  )}
                </>
              )}
              {drawer.rightTab === "qa" &&
                (live.session?.id ? (
                  <LiveQaCollabPanel sessionId={live.session.id} />
                ) : (
                  <QaPanel />
                ))}
              {drawer.rightTab === "polls" &&
                (live.session?.id ? (
                  <LivePollsCollabPanel
                    sessionId={live.session.id}
                    canLaunch={canLaunchPoll(live.myRole)}
                  />
                ) : (
                  <PollsPanel hasPolls={hasPolls} />
                ))}
              {drawer.rightTab === "whiteboard" && live.session?.id && (
                <LiveWhiteboardLazy
                  sessionId={live.session.id}
                  userId={live.userId}
                  canEdit={canPublishAv(live.myRole) || live.myRole === "moderator"}
                />
              )}
              {drawer.rightTab === "notes" && live.session?.id && (
                <LiveSharedNotes
                  sessionId={live.session.id}
                  userId={live.userId}
                  canEdit={!!live.userId}
                />
              )}
              {drawer.rightTab === "resources" && (
                <LiveResourcesPanel roomId={chatRoomId} />
              )}
              {drawer.rightTab === "tasks" && (
                <LiveTasksPanel
                  communityId={data?.session.communityId}
                  roomId={chatRoomId}
                />
              )}
              {drawer.rightTab === "knowledge" && live.session?.id && (
                <LiveKnowledgeCapture
                  sessionId={live.session.id}
                  communityId={data?.session.communityId}
                  roomId={chatRoomId}
                  userId={live.userId}
                  chatSample={chatMessages
                    .slice(-10)
                    .map((m) => `- ${m.sender_name}: ${m.body}`)
                    .join("\n")}
                />
              )}
              {drawer.rightTab === "commerce" && (
                <LiveCommerceRail
                  communityId={data?.session.communityId}
                  canManage={canLaunchPoll(live.myRole)}
                  onShareOffer={(title) => {
                    void liveChat.send(`🛒 Live offer: ${title}`);
                    showToast("Offer shared in chat");
                  }}
                />
              )}
              {drawer.rightTab === "recording" && live.session?.id && (
                <LiveRecordingPanel
                  sessionId={live.session.id}
                  canManage={canRecord(live.myRole)}
                />
              )}
              {drawer.rightTab === "tools" && live.session?.id && (
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  <LiveRoomTypePicker
                    sessionId={live.session.id}
                    canManage={canEndLive(live.myRole) || live.myRole === "cohost"}
                  />
                  <div className="px-3">
                    <ScreenShareMenu
                      sharing={media.sharing}
                      onStart={() => void startShare()}
                      onStop={stopShare}
                    />
                  </div>
                  <LiveCreatorTools
                    sessionId={live.session.id}
                    canManage={canInviteSpeaker(live.myRole)}
                  />
                </div>
              )}
              {drawer.rightTab === "ai" && (
                <LiveAiPanel
                  roomId={chatRoomId}
                  communityId={data?.session.communityId}
                  channelName={data?.session.title ?? "Live"}
                />
              )}
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
          if (id === "summarize" || id === "announce") openRight("knowledge");
          if (id === "moments" || id === "clips") openRight("clips");
          if (id === "notes") openRight("notes");
          if (id === "actions") openRight("tasks");
          if (id === "resources") openRight("resources");
          if (id === "questions") openRight("qa");
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
