"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Fullscreen,
  Loader2,
  MoreHorizontal,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, LiveDashboard, Speaker } from "@/lib/community/hub-live-types";
import { normalizeHubLiveDashboard } from "@/lib/community/hub-live-demo";
import { useLiveMediaPlane } from "@/hooks/live/useLiveMediaPlane";
import { useLiveSession } from "@/hooks/live/useLiveSession";
import { useLiveChat } from "@/hooks/live/useLiveChat";
import { useLiveKitRoom } from "@/hooks/live/useLiveKitRoom";
import { useFollowUser } from "@/hooks/live/useFollowUser";
import {
  canAcceptSpeaker,
  canEndLive,
  canInviteSpeaker,
  canLaunchPoll,
  canModerateChat,
  canPublishAv,
  canRecord,
  canRejectSpeaker,
  canShareScreen,
} from "@/lib/live/roles";
import {
  parseParticipantPermissions,
  permissionDeniedReason,
} from "@/lib/live/participant-permissions";
import { presenceToChatMessages } from "@/lib/live/presence-events";
import { sortMessagesChronologically } from "@/lib/live/chat-message-state";
import { liveStudioLog } from "@/lib/live/observability";
import { detectScreenShareCapability } from "@/lib/live/screen-share-capability";
import { LiveExperienceHeader } from "./live/LiveExperienceHeader";
import { LivePrepareStage } from "./live/LivePrepareStage";
import {
  LiveDestinationsPanel,
  type HostPublicSocial,
} from "./live/LiveDestinationsPanel";
import { LiveReactionFloater } from "./live/LiveReactionFloater";
import { useLiveDestinations } from "@/hooks/live/useLiveDestinations";
import { LiveMobileDock } from "./live/LiveMobileDock";
import { LiveConfirmDialog } from "./live/LiveConfirmDialog";
import { LiveStageFallback } from "./live/LiveStageFallback";
import { ControlDock, useEphemeralToast } from "./live/ControlDock";
import { ChatWorkspace } from "./live/ChatWorkspace";
import { LiveContextNav } from "./live/LiveContextNav";
import { LiveMorePanel, type LiveMoreActionId } from "./live/LiveMorePanel";
import { LiveShareSheet } from "./live/LiveShareSheet";
import { StageMediaPreview } from "./live/StageMediaPreview";
import { RemoteAudioSink } from "./live/RemoteAudioSink";
import {
  AnalyticsPanel,
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
import { LiveStagePipStack, LiveStagePipTile, LiveViewFullOverlay } from "./live/LiveStagePip";
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
import { LiveGuestJoinCard } from "./live/LiveGuestJoinCard";
import type { LiveGuestPreview } from "@/lib/live/guest-join";
import { createClient } from "@/lib/supabase/client";
import {
  FOCUS_RING,
  FOCUS_RING_DARK,
  LIVE_PAGE_BG,
  MOTION_COLORS,
} from "./live/studio-ui";

const EMPTY_SPEAKERS: Speaker[] = Object.freeze([]) as unknown as Speaker[];
const EMPTY_CHAT_MESSAGES: ChatMessage[] =
  Object.freeze([]) as unknown as ChatMessage[];

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
  const [confirmDialog, setConfirmDialog] = useState<null | "end" | "leave" | "back">(null);
  const [endLiveBusy, setEndLiveBusy] = useState(false);
  const [leaveLiveBusy, setLeaveLiveBusy] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [connection, setConnection] = useState<"excellent" | "good" | "poor">("excellent");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [chatIdle, setChatIdle] = useState(false);
  const [hasPolls, setHasPolls] = useState(false);
  const [egressRecording, setEgressRecording] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [guestPreview, setGuestPreview] = useState<LiveGuestPreview | null>(null);
  const [guestPreviewLoading, setGuestPreviewLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [liveNavOpen, setLiveNavOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<
    null | "general" | "video" | "audio" | "chat" | "destinations" | "recording"
  >(null);
  const [draftTitle, setDraftTitle] = useState("Start your Live");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [screenShareBannerHidden, setScreenShareBannerHidden] = useState(false);
  const [viewFull, setViewFull] = useState<{
    name: string;
    stream: MediaStream;
  } | null>(null);
  const [hostSocial, setHostSocial] = useState<HostPublicSocial[]>([]);
  const [selfProfile, setSelfProfile] = useState<{
    name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const chatIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { msg: toast, show: showToast } = useEphemeralToast();

  const media = useLiveMediaPlane(true);
  const live = useLiveSession(sessionIdProp ?? null);
  const destinations = useLiveDestinations(
    live.session?.status === "live" && live.session.id ? live.session.id : null
  );
  const chatRoomId = live.session?.room_id ?? data?.session.roomId ?? null;
  const liveChat = useLiveChat(
    live.session?.status === "live" ? chatRoomId : null,
    live.session?.status === "live" ? live.session.id : null,
    {
      userId: live.userId,
      displayName: "You",
    }
  );
  const hostUserId = live.session?.host_id ?? null;
  const follow = useFollowUser(
    hostUserId && live.userId && hostUserId !== live.userId ? hostUserId : null
  );

  const participantPerms = useMemo(
    () =>
      parseParticipantPermissions(
        (live.session?.settings ?? null) as Record<string, unknown> | null
      ),
    [live.session?.settings]
  );

  const isHostControlRole =
    live.myRole === "host" || live.myRole === "cohost";
  const roleCanPublish = canPublishAv(live.myRole);
  const canUseMic =
    isHostControlRole || (roleCanPublish && participantPerms.allowAudio);
  const canUseCam =
    isHostControlRole || (roleCanPublish && participantPerms.allowVideo);
  const canUseScreen =
    isHostControlRole ||
    (canShareScreen(live.myRole) && participantPerms.allowScreenShare);
  const canUseRecord = canRecord(live.myRole, {
    allowParticipantRecording: participantPerms.allowRecording,
  });

  const livekit = useLiveKitRoom({
    sessionId: live.session?.status === "live" ? live.session.id : null,
    enabled: true,
    localAvStream: media.cameraStream,
    camOn: media.camOn && canUseCam,
    micOn: media.micOn && canUseMic,
    shareStream: media.shareStream,
    sharing: media.sharing && canUseScreen,
    preferLocalStage:
      live.myRole === "host" || live.myRole === "cohost",
    hostIdentity: hostUserId,
    stagePinIdentity: (() => {
      const settings = (live.session?.settings ?? {}) as Record<string, unknown>;
      const focus = settings.stage_focus as
        | { identity?: string | null }
        | undefined;
      return typeof focus?.identity === "string" ? focus.identity : null;
    })(),
  });

  const micOn = media.micOn;
  const camOn = media.camOn;
  const recording = media.recordingState === "recording" || media.recordingState === "paused";
  // Never feed mic-only MediaStreams into the video stage (black rectangle).
  // Host/cohost own the main stage; guests stay in PIP even when cam/share is on.
  const canPublishLocal =
    live.myRole === "host" || live.myRole === "cohost";
  const stageStream = (() => {
    if (canPublishLocal && media.sharing) {
      return livekit.stageStream ?? media.shareStream ?? null;
    }
    const candidate =
      livekit.stageStream ??
      (canPublishLocal && camOn ? media.previewStream : null);
    if (!candidate) return null;
    const hasLiveVideo = candidate
      .getVideoTracks()
      .some((t) => t.readyState === "live" && t.enabled && !t.muted);
    return hasLiveVideo ? candidate : null;
  })();

  const loadDashboard = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = Boolean(opts?.soft);
    // Soft refresh must not blank the Live room UI.
    if (!soft) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const qs = communitySlugProp
        ? `?slug=${encodeURIComponent(communitySlugProp)}`
        : "";
      const res = await fetch(`/api/c/live${qs}`);
      if (!res.ok) {
        setLoadError("server");
        if (!soft) setData(normalizeHubLiveDashboard(null));
        return;
      }
      const json = (await res.json()) as LiveDashboard;
      const normalized = normalizeHubLiveDashboard(json);
      setData(normalized);
      setLoadError(null);
      const hostSpeaker = normalized.speakers.find(
        (s) => s.role === "host" || s.role === "Host"
      );
      if (hostSpeaker) setActiveSpeakerId(hostSpeaker.id);
      else if (normalized.speakers[0]) setActiveSpeakerId(normalized.speakers[0].id);
    } catch {
      setLoadError("network");
      if (!soft) setData(normalizeHubLiveDashboard(null));
    } finally {
      if (!soft) setLoading(false);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("dest_connected");
    const destError = params.get("dest_error");
    const openSettings = params.get("open") === "settings";
    const openDestinations =
      params.get("open") === "destinations" || Boolean(connected);
    if (connected) {
      showToast(`${connected} connected`);
      void destinations.refreshList();
    }
    if (destError) {
      showToast(destError);
    }
    // OAuth return may request destinations — never auto-open Settings on entry.
    if (openDestinations) {
      updateDrawer({ leftPanel: "destinations", rightOpen: false });
    } else if (openSettings) {
      // Legacy ?open=settings → Destinations when returning from OAuth; otherwise ignore.
      updateDrawer({ leftPanel: "none" });
    }
    if (connected || destError || openSettings || openDestinations) {
      params.delete("dest_connected");
      params.delete("dest_error");
      params.delete("open");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot URL flash
  }, []);

  /* Settings must never be the default landing panel. */
  useEffect(() => {
    setDrawer((prev) =>
      prev.leftPanel === "settings" ? { ...prev, leftPanel: "none" } : prev
    );
  }, []);

  /* Pre-live: never keep Chat / post-live panels open. After Go Live, open Chat once
   * unless a restored panel (people/destinations/settings/analytics) was already open. */
  const chatOpenedForSession = useRef<string | null>(null);
  useEffect(() => {
    const sid = live.session?.status === "live" ? live.session.id : null;
    if (!sid) {
      chatOpenedForSession.current = null;
      setDrawer((prev) => {
        if (!prev.rightOpen && prev.leftPanel === "none") return prev;
        const next: DrawerState = {
          ...prev,
          rightOpen: false,
          leftPanel:
            prev.leftPanel === "destinations" || prev.leftPanel === "settings"
              ? prev.leftPanel
              : "none",
        };
        writeDrawerState(next);
        return next;
      });
      return;
    }
    if (chatOpenedForSession.current === sid) return;
    chatOpenedForSession.current = sid;
    setDrawer((prev) => {
      const hasRestoredPanel =
        prev.leftPanel === "people" ||
        prev.leftPanel === "destinations" ||
        prev.leftPanel === "settings" ||
        (prev.rightOpen && prev.rightTab === "analytics");
      if (hasRestoredPanel) return prev;
      const next: DrawerState = {
        ...prev,
        leftPanel: "none",
        rightOpen: true,
        rightTab: "chat",
      };
      writeDrawerState(next);
      return next;
    });
  }, [live.session?.id, live.session?.status]);

  /* Prefetch host/self profile so prepare stage shows the real avatar. */
  useEffect(() => {
    if (!live.userId) {
      setSelfProfile(null);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", live.userId)
      .maybeSingle()
      .then(({ data: profile }: { data: {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
      } | null }) => {
        if (cancelled || !profile) return;
        setSelfProfile({
          name:
            profile.full_name?.trim() ||
            profile.username?.trim() ||
            null,
          avatar_url: profile.avatar_url ?? null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [live.userId]);

  /* Resume active live session, or join viewer sessionId from route */
  const autoJoinedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!live.authReady) return;
    // Guests must authenticate via Join Live before joining.
    if (sessionIdProp && !live.userId) return;

    let cancelled = false;
    (async () => {
      try {
        if (sessionIdProp) {
          if (autoJoinedRef.current === sessionIdProp) return;
          autoJoinedRef.current = sessionIdProp;
          await live.join(sessionIdProp);
          return;
        }
        // Entry route (/communities/live): hard-navigate to the session URL
        // before joining. Joining here then soft-rendering LiveKit caused
        // client crashes that bubbled to Next.js DefaultGlobalError.
        const scopedId = data?.session.liveSessionId;
        if (scopedId) {
          if (autoJoinedRef.current === scopedId) return;
          autoJoinedRef.current = scopedId;
          if (!cancelled) {
            window.location.assign(`/communities/live/${scopedId}`);
          }
          return;
        }
        if (communitySlugProp) return;
        if (!live.userId) return;
        const res = await fetch("/api/c/live/sessions");
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { sessions?: Array<{ id: string }> };
        const first = json.sessions?.[0];
        if (first?.id) {
          if (autoJoinedRef.current === first.id) return;
          autoJoinedRef.current = first.id;
          if (!cancelled) {
            window.location.assign(`/communities/live/${first.id}`);
          }
        }
      } catch (e) {
        autoJoinedRef.current = null;
        if (!cancelled) {
          showToast(e instanceof Error ? e.message : "Could not join live session");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdProp, data?.session.liveSessionId, communitySlugProp, live.authReady, live.userId]);

  /* Guest Join Live — public session preview for unauthenticated visitors */
  useEffect(() => {
    if (!sessionIdProp || !live.authReady || live.userId) {
      setGuestPreview(null);
      setGuestPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setGuestPreviewLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/c/live/sessions/${sessionIdProp}/preview`);
        const json = (await res.json().catch(() => ({}))) as {
          preview?: LiveGuestPreview;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.preview) {
          setGuestPreview({
            sessionId: sessionIdProp,
            title: null,
            status: "unknown",
            privacy: "unknown",
            canGuestJoin: false,
            hostName: null,
            message:
              res.status === 404
                ? "This Live could not be found."
                : "This Live is not available right now.",
          });
          return;
        }
        setGuestPreview(json.preview);
      } catch {
        if (!cancelled) {
          setGuestPreview({
            sessionId: sessionIdProp,
            title: null,
            status: "unknown",
            privacy: "unknown",
            canGuestJoin: false,
            hostName: null,
            message: "Could not load this Live. Check your connection and try again.",
          });
        }
      } finally {
        if (!cancelled) setGuestPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionIdProp, live.authReady, live.userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("guest_error");
    if (err) {
      setGuestError(err);
      params.delete("guest_error");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [sessionIdProp]);

  useEffect(() => {
    if (!media.lastError) return;
    showToast(media.lastError);
  }, [media.lastError, showToast]);

  useEffect(() => {
    if (!livekit.error) return;
    showToast(livekit.error);
  }, [livekit.error, showToast]);

  /* Keep activity + server share flag in sync when share track ends externally */
  const wasSharingRef = useRef(false);
  const syncMediaRef = useRef(live.syncMedia);
  syncMediaRef.current = live.syncMedia;
  const hasLiveSessionRef = useRef(Boolean(live.session));
  hasLiveSessionRef.current = Boolean(live.session);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror media plane share flag into existing activity chrome
    setActivity((prev) => {
      if (media.sharing) return "share";
      return prev === "share" || prev === "present" ? "live" : prev;
    });
    if (wasSharingRef.current && !media.sharing && hasLiveSessionRef.current) {
      void syncMediaRef.current({ sharing: false });
    }
    wasSharingRef.current = media.sharing;
  }, [media.sharing]);

  const [pendingInvite, setPendingInvite] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
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

  /* Remint LiveKit token when role/policy upgrades to publishable. */
  useEffect(() => {
    if (!live.session || live.session.status !== "live") {
      wasPublishableRef.current = null;
      return;
    }
    const publishable =
      canPublishAv(live.myRole) &&
      (isHostControlRole ||
        participantPerms.allowAudio ||
        participantPerms.allowVideo ||
        participantPerms.allowScreenShare);
    const prev = wasPublishableRef.current;
    wasPublishableRef.current = publishable;
    if (prev === false && publishable) {
      void livekit.reconnect().catch(() => undefined);
    }
    if (prev === true && publishable === false) {
      void livekit.reconnect().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remint on role/policy change
  }, [
    live.myRole,
    live.session?.id,
    live.session?.status,
    livekit.reconnect,
    isHostControlRole,
    participantPerms.allowAudio,
    participantPerms.allowVideo,
    participantPerms.allowScreenShare,
  ]);

  /* Enforce host permission policy immediately — stop local media when blocked. */
  useEffect(() => {
    if (!live.session || isHostControlRole) return;
    if (!participantPerms.allowAudio && media.micOn) {
      media.plane.current?.setMicEnabled(false);
      void live.syncMedia({ micOn: false });
      showToast("Microphone is disabled by the host.");
    }
    if (!participantPerms.allowVideo && media.camOn) {
      void media.toggleCamera();
      void live.syncMedia({ camOn: false });
      showToast("Camera is disabled by the host.");
    }
    if (!participantPerms.allowScreenShare && media.sharing) {
      media.stopScreenShare();
      setActivity("live");
      void live.syncMedia({ sharing: false });
      showToast("Screen sharing is disabled by the host.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- policy enforcement only
  }, [
    live.session?.id,
    isHostControlRole,
    participantPerms.allowAudio,
    participantPerms.allowVideo,
    participantPerms.allowScreenShare,
  ]);

  /* Host force-stop share: remote participant.sharing flipped false while local still sharing. */
  useEffect(() => {
    if (!live.userId || !media.sharing) return;
    const me = live.participants.find((p) => p.user_id === live.userId);
    if (me && me.sharing === false) {
      media.stopScreenShare();
      setActivity("live");
      setScreenShareBannerHidden(false);
      showToast("Screen sharing was stopped.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to remote force-media
  }, [live.participants, live.userId, media.sharing]);

  /* Host public social profiles for Destinations → Follow (no secrets). */
  useEffect(() => {
    if (!hostUserId) {
      setHostSocial([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/identity/social?userId=${encodeURIComponent(hostUserId)}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          accounts?: Array<{
            platform?: string;
            handle?: string | null;
            url?: string | null;
          }>;
        };
        if (cancelled || !res.ok) return;
        setHostSocial(
          (json.accounts ?? [])
            .filter((a) => a.platform)
            .map((a) => ({
              platform: String(a.platform),
              handle: a.handle ?? null,
              url: a.url ?? null,
            }))
        );
      })
      .catch(() => {
        if (!cancelled) setHostSocial([]);
      });
    return () => {
      cancelled = true;
    };
  }, [hostUserId]);

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

  // Refs keep recover/reconnect out of effect deps — `media` / livekit return
  // new object identities every render; putting them in deps + calling recover()
  // caused React #185 (Maximum update depth exceeded).
  const mediaRecoverRef = useRef(media.recover);
  mediaRecoverRef.current = media.recover;
  const livekitReconnectRef = useRef(livekit.reconnect);
  livekitReconnectRef.current = livekit.reconnect;
  const liveChatReloadRef = useRef(liveChat.reload);
  liveChatReloadRef.current = liveChat.reload;
  const liveChatFlushRef = useRef(liveChat.flushOutbox);
  liveChatFlushRef.current = liveChat.flushOutbox;
  const sessionLiveRef = useRef(live.session?.status === "live");
  sessionLiveRef.current = live.session?.status === "live";
  const livekitConnectedRef = useRef(livekit.connected);
  livekitConnectedRef.current = livekit.connected;

  useEffect(() => {
    const applyOnline = () => {
      const on = typeof navigator !== "undefined" ? navigator.onLine : true;
      setOnline(on);
      if (!on) {
        setConnection("poor");
        return;
      }
      const lk = String(livekit.connectionState);
      if (lk === "reconnecting" || lk === "connecting") {
        setConnection("good");
        return;
      }
      if (lk === "disconnected" && sessionLiveRef.current) {
        setConnection("good");
        return;
      }
      setConnection("excellent");
    };

    const onOnline = () => {
      applyOnline();
      void mediaRecoverRef.current();
      if (sessionLiveRef.current && !livekitConnectedRef.current) {
        void livekitReconnectRef.current().catch(() => undefined);
      }
      void liveChatReloadRef.current().catch(() => undefined);
      void liveChatFlushRef.current();
    };
    const onOffline = () => {
      setOnline(false);
      setConnection("poor");
    };

    applyOnline();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [livekit.connectionState]);

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
      if (next === "minimal") updateDrawer({ leftPanel: "none", rightOpen: false });
    },
    [updateDrawer]
  );

  const toggleLeft = useCallback(
    (id: Exclude<LeftPanel, "none">) => {
      const closing = drawer.leftPanel === id;
      updateDrawer({
        leftPanel: closing ? "none" : id,
        // One contextual right panel at a time (reference layout).
        rightOpen: closing ? drawer.rightOpen : false,
      });
      if (!closing) {
        setShareOpen(false);
        setLiveNavOpen(false);
        setFocusMode(false);
      }
    },
    [drawer.leftPanel, drawer.rightOpen, updateDrawer]
  );

  const closeDrawers = useCallback(() => {
    updateDrawer({ leftPanel: "none" });
  }, [updateDrawer]);

  const openRight = useCallback(
    (_tab?: RightTab) => {
      // Live Studio right rail is Chat-only — ignore secondary tab requests.
      updateDrawer({ rightOpen: true, rightTab: "chat", leftPanel: "none" });
      setShareOpen(false);
      setChatIdle(false);
      setFocusMode(false);
    },
    [updateDrawer]
  );

  const toggleChat = useCallback(() => {
    if (drawer.rightOpen && drawer.rightTab === "chat") {
      updateDrawer({ rightOpen: false });
      return;
    }
    updateDrawer({ rightOpen: true, rightTab: "chat", leftPanel: "none" });
    setShareOpen(false);
    setLiveNavOpen(false);
    setChatIdle(false);
    setFocusMode(false);
  }, [drawer.rightOpen, drawer.rightTab, updateDrawer]);

  const openStreamTo = useCallback(() => {
    setLiveNavOpen(false);
    setShareOpen(false);
    toggleLeft("destinations");
  }, [toggleLeft]);

  const openMore = useCallback(() => {
    setLiveNavOpen((v) => !v);
    updateDrawer({ leftPanel: "none", rightOpen: false });
    setShareOpen(false);
    setFocusMode(false);
  }, [updateDrawer]);

  const gate = useCallback(
    (allowed: boolean, message: string) => {
      if (allowed) return true;
      showToast(message);
      return false;
    },
    [showToast]
  );

  const toggleMic = useCallback(async () => {
    if (live.session && !gate(canPublishAv(live.myRole), "Join as a participant to use the mic"))
      return;
    const denied = permissionDeniedReason("audio", participantPerms);
    if (live.session && !isHostControlRole && denied) {
      showToast(denied);
      return;
    }
    const on = await media.toggleMic();
    void live.syncMedia({ micOn: on });
  }, [gate, live, media, participantPerms, isHostControlRole, showToast]);

  const toggleCam = useCallback(async () => {
    if (live.session && !gate(canPublishAv(live.myRole), "Join as a participant to use the camera"))
      return;
    const denied = permissionDeniedReason("video", participantPerms);
    if (live.session && !isHostControlRole && denied) {
      showToast(denied);
      return;
    }
    const on = await media.toggleCamera();
    void live.syncMedia({ camOn: on });
  }, [gate, live, media, participantPerms, isHostControlRole, showToast]);

  const enableStudioMedia = useCallback(async () => {
    if (live.session && !gate(canPublishAv(live.myRole), "Join as a participant to use camera/mic"))
      return;
    if (
      live.session &&
      !isHostControlRole &&
      !participantPerms.allowAudio &&
      !participantPerms.allowVideo
    ) {
      showToast("Camera and microphone are disabled by the host.");
      return;
    }
    setMediaBusy(true);
    try {
      const result = await media.enableStudioMedia();
      void live.syncMedia({ micOn: result.microphone, camOn: result.camera });
      if (!result.camera && !result.microphone) {
        showToast(media.lastError || "Could not access camera or microphone");
      }
    } finally {
      setMediaBusy(false);
    }
  }, [gate, live, media, showToast, isHostControlRole, participantPerms]);

  const toggleRecord = useCallback(async () => {
    if (recordingBusy) return;
    if (!online) {
      showToast("Recording unavailable offline");
      return;
    }
    if (!live.session || live.session.status !== "live") {
      showToast("Start the Live before recording");
      return;
    }
    if (
      !gate(
        canRecord(live.myRole, {
          allowParticipantRecording: participantPerms.allowRecording,
        }),
        permissionDeniedReason("recording", participantPerms) ||
          "Recording is not available"
      )
    ) {
      return;
    }

    setRecordingBusy(true);
    try {
      if (egressRecording || recording) {
        const res = await fetch(`/api/live/sessions/${live.session.id}/recording`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          showToast(json.error ?? "Recording failed — could not stop");
          return;
        }
        setEgressRecording(false);
        if (media.recordingState !== "idle") {
          await media.stopRecording({ download: false });
        }
        showToast("Recording stopped — it will appear in saved recordings when ready");
        return;
      }

      const res = await fetch(`/api/live/sessions/${live.session.id}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        recordingId?: string;
        alreadyActive?: boolean;
      };
      if (!res.ok) {
        showToast(json.error ?? "Recording failed");
        return;
      }
      setEgressRecording(true);
      showToast(
        json.alreadyActive
          ? "This Live is already being recorded"
          : "Recording started — capturing this Live"
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Recording failed");
    } finally {
      setRecordingBusy(false);
    }
  }, [
    online,
    gate,
    live,
    recording,
    egressRecording,
    recordingBusy,
    media,
    showToast,
    participantPerms,
  ]);

  const recordingActive = recording || egressRecording;

  useEffect(() => {
    if (live.session?.status !== "live" || !live.session.id) {
      setEgressRecording(false);
      return;
    }
    let cancelled = false;
    void fetch(`/api/live/sessions/${live.session.id}/recording`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          recordingStatus?: string;
        };
        if (cancelled || !res.ok) return;
        if (json.recordingStatus === "recording") {
          setEgressRecording(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [live.session?.id, live.session?.status]);

  const [screenShareCapability, setScreenShareCapability] = useState(() =>
    detectScreenShareCapability()
  );
  useEffect(() => {
    setScreenShareCapability(detectScreenShareCapability());
  }, []);

  const startShare = useCallback(async () => {
    if (live.session && !gate(canShareScreen(live.myRole), "Join as a participant to share screen"))
      return;
    const denied = permissionDeniedReason("screen", participantPerms);
    if (live.session && !isHostControlRole && denied) {
      showToast(denied);
      return;
    }
    const capability = detectScreenShareCapability();
    setScreenShareCapability(capability);
    if (!capability.canAttempt) {
      showToast(
        capability.reason ??
          "This browser does not provide screen capture to web apps on this device."
      );
      return;
    }
    const prefs = useLiveCollabStore.getState();
    const ok = await media.startScreenShare({
      target: prefs.shareTarget,
      quality: prefs.shareQuality,
    });
    if (ok) {
      setActivity("share");
      setScreenShareBannerHidden(false);
      void live.syncMedia({ sharing: true });
      liveStudioLog("info", "media_publish", {
        kind: "screen_share",
        sessionId: live.session?.id ?? null,
        target: prefs.shareTarget,
      });
    } else if (media.lastError) {
      liveStudioLog("error", "media_publish_failed", {
        kind: "screen_share",
        sessionId: live.session?.id ?? null,
        error: media.lastError,
      });
      showToast(media.lastError);
    }
  }, [gate, live, media, showToast, participantPerms, isHostControlRole]);

  const stopShare = useCallback(() => {
    media.stopScreenShare();
    setActivity("live");
    setScreenShareBannerHidden(false);
    void live.syncMedia({ sharing: false });
    liveStudioLog("info", "media_publish", {
      kind: "screen_share_stop",
      sessionId: live.session?.id ?? null,
    });
  }, [live, media]);

  const switchShareSource = useCallback(async () => {
    if (live.session && !gate(canShareScreen(live.myRole), "Speakers only")) return;
    const prefs = useLiveCollabStore.getState();
    const ok = await media.switchScreenShare({
      target: prefs.shareTarget,
      quality: prefs.shareQuality,
    });
    if (ok) {
      setActivity("share");
      void live.syncMedia({ sharing: true });
      showToast("Share source updated");
    }
  }, [gate, live, media, showToast]);

  const leaveLive = useCallback(async () => {
    if (!live.session) return;
    if (canEndLive(live.myRole)) {
      showToast("Host must end the live session");
      return;
    }
    setLeaveLiveBusy(true);
    try {
      media.stopScreenShare();
      await livekit.disconnect();
      await media.releaseMedia();
      await live.leave();
      setConfirmDialog(null);
      showToast("Left live");
      const href =
        data?.session.discussionHref ??
        (data?.session.communitySlug
          ? `/communities/${data.session.communitySlug}`
          : communitySlugProp
            ? `/communities/${communitySlugProp}`
            : "/communities/live");
      router.push(href);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not leave");
    } finally {
      setLeaveLiveBusy(false);
    }
  }, [
    live,
    livekit,
    media,
    showToast,
    router,
    data?.session.discussionHref,
    data?.session.communitySlug,
    communitySlugProp,
  ]);

  const endLive = useCallback(async () => {
    if (!live.session) {
      showToast("No active live session");
      return;
    }
    if (!gate(canEndLive(live.myRole), "Only the host can end live")) return;
    setEndLiveBusy(true);
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
      await livekit.disconnect();
      await media.releaseMedia();
      await live.endLive();
      showToast("Live ended");
      setConfirmDialog(null);
      const href = communitySlugProp
        ? `/communities/${communitySlugProp}`
        : "/communities/live";
      router.push(href);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not end live");
    } finally {
      setEndLiveBusy(false);
    }
  }, [live, gate, media, livekit, recording, egressRecording, showToast, router, communitySlugProp]);

  const createOrJoinLive = useCallback(async () => {
    // Hub Live (/communities/live) = Creator Live (no community).
    // Community Live only when opened via /communities/[slug]/live.
    const communityId = communitySlugProp
      ? (data?.session.communityId ?? null)
      : null;
    const roomId = communityId
      ? (data?.session.roomId ?? data?.rooms[0]?.id ?? null)
      : null;

    if (communitySlugProp && !communityId) {
      showToast("Community context unavailable — refresh and try again");
      return;
    }

    try {
      if (live.session?.status === "live") {
        if (live.session.id && !sessionIdProp) {
          window.location.assign(`/communities/live/${live.session.id}`);
          return;
        }
        showToast("Already live");
        return;
      }
      const session = await live.createLive({
        communityId,
        roomId,
        title:
          data?.session.title && communityId
            ? data.session.title
            : communityId
              ? undefined
              : draftTitle.trim() || "Creator Live",
        privacy: communityId ? undefined : "public",
      });
      if (session?.id) {
        // Prefer hard navigation so PWA/SW cannot abort soft RSC transitions.
        window.location.assign(`/communities/live/${session.id}`);
      }
      setElapsed(0);
      showToast(communityId ? "You are live" : "Creator Live started");
      void loadDashboard({ soft: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start live";
      // Recover from race / orphaned live — open the active session.
      if (/already have a live|already has a live/i.test(msg)) {
        try {
          const res = await fetch("/api/c/live/sessions");
          const json = (await res.json()) as { sessions?: Array<{ id: string }> };
          const existing = json.sessions?.[0];
          if (existing?.id) {
            window.location.assign(`/communities/live/${existing.id}`);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      showToast(msg);
    }
  }, [
    data,
    live,
    showToast,
    router,
    sessionIdProp,
    loadDashboard,
    communitySlugProp,
    draftTitle,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
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
        openRight("chat");
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
    live.session,
    live.myRole,
    live.launchPoll,
  ]);

  const speakersFromLive = useMemo(() => {
    if (live.speakers.length) {
      return live.speakers.map((p) => {
        const dash = data?.speakers.find((s) => s.id === p.user_id);
        const remote = livekit.remotes.find((r) => r.identity === p.user_id);
        const name =
          p.display_name ||
          dash?.name ||
          remote?.name ||
          (p.user_id === live.userId ? "You" : null);
        return {
          id: p.user_id,
          name: name || "Member",
          avatar_url: p.avatar_url ?? dash?.avatar_url ?? null,
          role: p.role,
          username: p.username ?? null,
        };
      });
    }
    if (livekit.remotes.length) {
      return livekit.remotes
        .filter((r) => r.role !== "viewer")
        .map((r) => ({
          id: r.identity,
          name: r.name || "Member",
          avatar_url: null as string | null,
          role: r.role === "unknown" ? "speaker" : r.role,
          username: null as string | null,
        }));
    }
    return null;
  }, [live.speakers, live.userId, data?.speakers, livekit.remotes]);

  /**
   * Full People list for the active Live room.
   *
   * When LiveKit is connected, room presence is LiveKit-primary (join/leave
   * without refresh). DB rows hydrate names/roles and cover waiting-room /
   * just-joined users still connecting to the SFU.
   */
  const peopleFromLive = useMemo(() => {
    const byId = new Map<string, Speaker>();
    const dbByUser = new Map(live.participants.map((p) => [p.user_id, p]));
    const dashById = new Map((data?.speakers ?? []).map((s) => [s.id, s]));

    const toSpeaker = (
      id: string,
      opts?: { name?: string | null; role?: string | null }
    ): Speaker => {
      const p = dbByUser.get(id);
      const dash = dashById.get(id);
      const remote = livekit.remotes.find((r) => r.identity === id);
      const name =
        p?.display_name ||
        dash?.name ||
        opts?.name ||
        remote?.name ||
        (id === live.userId ? "You" : null);
      const role =
        p?.role ||
        opts?.role ||
        (remote && remote.role !== "unknown" ? remote.role : null) ||
        "viewer";
      return {
        id,
        name: name || "Member",
        avatar_url: p?.avatar_url ?? dash?.avatar_url ?? null,
        role,
        username: p?.username ?? null,
      };
    };

    if (livekit.connected) {
      if (live.userId) {
        byId.set(live.userId, toSpeaker(live.userId, { name: "You", role: live.myRole }));
      }
      for (const r of livekit.remotes) {
        if (!r.identity || byId.has(r.identity)) continue;
        byId.set(
          r.identity,
          toSpeaker(r.identity, {
            name: r.name,
            role: r.role === "unknown" ? "viewer" : r.role,
          })
        );
      }
      // Waiting / invited: DB-only (no LiveKit until admitted / accepted).
      for (const p of live.participants) {
        if (p.status !== "requested" && p.status !== "invited") continue;
        if (byId.has(p.user_id)) continue;
        byId.set(p.user_id, toSpeaker(p.user_id, { role: p.role || p.status }));
      }
      // Grace: DB joined but SFU connect still in flight (recent join only).
      const now = Date.now();
      for (const p of live.participants) {
        if (p.status !== "joined" || byId.has(p.user_id)) continue;
        const ts = Date.parse(String(p.joined_at ?? p.updated_at ?? ""));
        if (!Number.isFinite(ts) || now - ts > 8_000) continue;
        byId.set(p.user_id, toSpeaker(p.user_id, { role: p.role }));
      }
    } else {
      for (const p of live.participants) {
        if (p.status !== "joined") continue;
        byId.set(p.user_id, toSpeaker(p.user_id, { role: p.role }));
      }
      for (const r of livekit.remotes) {
        if (!r.identity || byId.has(r.identity)) continue;
        byId.set(
          r.identity,
          toSpeaker(r.identity, {
            name: r.name,
            role: r.role === "unknown" ? "viewer" : r.role,
          })
        );
      }
    }

    if (!byId.size) return null;
    return Array.from(byId.values());
  }, [
    live.participants,
    live.userId,
    live.myRole,
    data?.speakers,
    livekit.remotes,
    livekit.connected,
  ]);

  /* When LiveKit sees a peer the DB list lacks, heal via authoritative GET
     (service-role API) — covers missed postgres_changes without polling. */
  const livekitHealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const livekitHealedKey = useRef<string>("");
  useEffect(() => {
    const sid = live.session?.id;
    if (!sid || live.session?.status !== "live" || !livekit.connected) return;
    const joined = new Set(
      live.participants
        .filter((p) => p.status === "joined")
        .map((p) => p.user_id)
    );
    const missingIds = livekit.remotes
      .map((r) => r.identity)
      .filter((id): id is string => Boolean(id) && !joined.has(id))
      .sort();
    if (!missingIds.length) {
      livekitHealedKey.current = "";
      return;
    }
    const key = `${sid}:${missingIds.join(",")}`;
    if (livekitHealedKey.current === key) return;
    if (livekitHealTimer.current) clearTimeout(livekitHealTimer.current);
    livekitHealTimer.current = setTimeout(() => {
      livekitHealedKey.current = key;
      void live.refresh(sid).catch(() => undefined);
    }, 250);
    return () => {
      if (livekitHealTimer.current) clearTimeout(livekitHealTimer.current);
    };
  }, [
    livekit.connected,
    livekit.remotes,
    live.participants,
    live.session?.id,
    live.session?.status,
    live.refresh,
  ]);

  const analytics = data?.analytics;

  const liveMetrics = useMemo(() => {
    const joined = live.participants.filter((p) => p.status === "joined");
    const destStatuses = destinations.sessionStatuses ?? [];
    return {
      currentViewers: live.viewerCount || analytics?.liveViewers || analytics?.viewers || 0,
      peakViewers: live.session?.peak_viewers ?? analytics?.peakViewers ?? 0,
      sessionDurationSeconds: elapsed,
      participants: joined.length,
      messages: liveChat.messages.length,
      reactions:
        typeof live.session?.engagement_events === "number"
          ? live.session.engagement_events
          : analytics?.likes ?? 0,
      raisedHands: live.participants.filter(
        (p) => p.hand_raised || p.status === "requested"
      ).length,
      cameraOnCount: joined.filter((p) => p.cam_on).length,
      microphoneOnCount: joined.filter((p) => p.mic_on).length,
      screenSharing: media.sharing || joined.some((p) => p.sharing),
      destinationsLive: destStatuses.filter((s) => s.status === "live").length,
      destinationsConnected: destStatuses.filter(
        (s) => s.status === "live" || s.status === "ready"
      ).length,
      recordingStatus: egressRecording
        ? ("recording" as const)
        : recordingBusy
          ? ("ending" as const)
          : ("none" as const),
      joinEvents: live.presenceEvents.filter((e) => e.kind === "join").length,
      leaveEvents: live.presenceEvents.filter((e) => e.kind === "leave").length,
      watchTimeMinutes:
        typeof live.session?.total_watch_seconds === "number"
          ? Math.round(live.session.total_watch_seconds / 60)
          : analytics?.watchTimeMinutes ?? null,
    };
  }, [
    live.participants,
    live.viewerCount,
    live.session?.peak_viewers,
    live.session?.total_watch_seconds,
    live.session?.engagement_events,
    live.presenceEvents,
    liveChat.messages.length,
    destinations.sessionStatuses,
    elapsed,
    analytics,
    egressRecording,
    recordingBusy,
    media.sharing,
  ]);
  const session = data?.session ?? {
    title: "Start your Live",
    host: "Jimvio",
    href: "/communities/live",
    tag: "Live Room",
    roomId: null,
  };
  const hasSession = Boolean(live.session?.status === "live");
  const speakers = useMemo(() => {
    let list: Speaker[];
    if (speakersFromLive) list = speakersFromLive;
    else if (hasSession) {
      // While a live session is active, never fall back to stale dashboard speakers.
      list = EMPTY_SPEAKERS;
    } else if (data?.session?.liveSessionId) {
      list = data?.speakers ?? EMPTY_SPEAKERS;
    } else {
      return EMPTY_SPEAKERS;
    }
    if (!hostUserId) return list;
    return [...list].sort((a, b) => {
      if (a.id === hostUserId) return -1;
      if (b.id === hostUserId) return 1;
      const aHost = a.role === "host" || a.role === "Host" ? 1 : 0;
      const bHost = b.role === "host" || b.role === "Host" ? 1 : 0;
      return bHost - aHost;
    });
  }, [speakersFromLive, data?.speakers, data?.session?.liveSessionId, hasSession, hostUserId]);

  const peopleList = useMemo(() => {
    let list: Speaker[];
    // Active Live: never fall back to stale dashboard speakers (hides viewers).
    if (hasSession) {
      list = peopleFromLive?.length ? peopleFromLive : EMPTY_SPEAKERS;
    } else if (peopleFromLive?.length) {
      list = peopleFromLive;
    } else if (speakers.length) {
      list = speakers;
    } else {
      list = EMPTY_SPEAKERS;
    }
    if (!hostUserId) return list;
    return [...list].sort((a, b) => {
      if (a.id === hostUserId) return -1;
      if (b.id === hostUserId) return 1;
      const rank = (role: string) => {
        const r = role.toLowerCase();
        if (r === "host") return 4;
        if (r === "cohost" || r === "co-host") return 3;
        if (r === "speaker") return 2;
        if (r === "moderator") return 1;
        return 0;
      };
      return rank(b.role) - rank(a.role);
    });
  }, [peopleFromLive, speakers, hostUserId, hasSession]);

  useEffect(() => {
    if (hasSession && hostUserId) {
      setActiveSpeakerId((prev) => (prev === null ? hostUserId : prev));
    }
  }, [hasSession, hostUserId]);

  const pendingHandRaises = useMemo(() => {
    return live.participants
      .filter((p) => p.status === "requested" && p.hand_raised)
      .map((p) => {
        const dash = data?.speakers.find((s) => s.id === p.user_id);
        const remote = livekit.remotes.find((r) => r.identity === p.user_id);
        return {
          id: p.user_id,
          name:
            p.display_name ||
            dash?.name ||
            remote?.name ||
            (p.user_id === live.userId ? "You" : "Member"),
          avatar_url: p.avatar_url ?? dash?.avatar_url ?? null,
          role: "requested",
        };
      });
  }, [live.participants, live.userId, data?.speakers, livekit.remotes]);

  const waitingRoomList = useMemo(() => {
    return live.participants
      .filter((p) => p.status === "requested" && !p.hand_raised)
      .map((p) => {
        const dash = data?.speakers.find((s) => s.id === p.user_id);
        const remote = livekit.remotes.find((r) => r.identity === p.user_id);
        return {
          id: p.user_id,
          name:
            p.display_name ||
            dash?.name ||
            remote?.name ||
            (p.user_id === live.userId ? "You" : "Member"),
          avatar_url: p.avatar_url ?? dash?.avatar_url ?? null,
          role: "waiting",
        };
      });
  }, [live.participants, live.userId, data?.speakers, livekit.remotes]);

  const peoplePanelProps = useMemo(() => {
    const canManageRequests =
      canAcceptSpeaker(live.myRole) || canRejectSpeaker(live.myRole);
    const canManagePeople = canInviteSpeaker(live.myRole);
    return {
      speakers: peopleList,
      viewers: live.viewerCount || analytics?.liveViewers || 0,
      currentUserId: live.userId,
      activeSpeakerId,
      onSelect: (id: string) => {
        setActiveSpeakerId(id);
      },
      onOpenProfile: (id: string) => {
        setActiveSpeakerId(id);
        const person =
          peopleList.find((s) => s.id === id) ||
          live.participants.find((p) => p.user_id === id);
        const username =
          (person && "username" in person ? person.username : null) ||
          live.participants.find((p) => p.user_id === id)?.username ||
          null;
        if (username) {
          router.push(`/u/${encodeURIComponent(username)}`);
          return;
        }
        showToast("Profile unavailable");
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
      waitingRoom: canManageRequests ? waitingRoomList : undefined,
      onAdmitWaiting: canAcceptSpeaker(live.myRole)
        ? (id: string) => {
            void live
              .admit(id)
              .then(() => showToast("Admitted"))
              .catch((e) =>
                showToast(e instanceof Error ? e.message : "Admit failed")
              );
          }
        : undefined,
      onRejectWaiting: canRejectSpeaker(live.myRole)
        ? (id: string) => {
            void live
              .reject(id)
              .then(() => showToast("Rejected"))
              .catch((e) =>
                showToast(e instanceof Error ? e.message : "Reject failed")
              );
          }
        : undefined,
      canManage: canManagePeople,
      participantCount: peopleList.length,
      onInvite: () => {
        if (!live.session?.id) {
          showToast("No live session to share");
          return;
        }
        setShareOpen(true);
        updateDrawer({ leftPanel: "none", rightOpen: false });
        setFocusMode(false);
      },
      onAdmitAllWaiting: canAcceptSpeaker(live.myRole)
        ? () => {
            void live
              .admitAll()
              .then(() => showToast("Admitted all waiting"))
              .catch((e) =>
                showToast(e instanceof Error ? e.message : "Admit all failed")
              );
          }
        : undefined,
      onMute: canManagePeople
        ? (id: string) => {
            void live
              .mute(id, false)
              .then(() => showToast("Muted"))
              .catch((e) =>
                showToast(e instanceof Error ? e.message : "Mute failed")
              );
          }
        : undefined,
      onPromote: canManagePeople
        ? (id: string) => {
            void live
              .promote(id, "speaker")
              .then(() => showToast("Promoted to speaker"))
              .catch((e) =>
                showToast(e instanceof Error ? e.message : "Promote failed")
              );
          }
        : undefined,
      onRemove: canManagePeople
        ? (id: string) => {
            void live
              .remove(id)
              .then(() => showToast("Removed"))
              .catch((e) =>
                showToast(e instanceof Error ? e.message : "Remove failed")
              );
          }
        : undefined,
    };
  }, [
    peopleList,
    live.viewerCount,
    live.myRole,
    live.participants,
    live.userId,
    live.accept,
    live.admit,
    live.admitAll,
    live.reject,
    live.invite,
    live.mute,
    live.promote,
    live.remove,
    analytics?.liveViewers,
    activeSpeakerId,
    peopleQuery,
    pendingHandRaises,
    waitingRoomList,
    live.session?.id,
    showToast,
    updateDrawer,
    router,
  ]);
  const discussionHref =
    data?.session.discussionHref ??
    (data?.session.communitySlug
      ? `/communities/${data.session.communitySlug}`
      : "/communities");

  const speakerUi = useMemo(() => {
    const map: Record<string, SpeakerUi> = {};
    peopleList.forEach((s) => {
      const liveP = live.participants.find((p) => p.user_id === s.id);
      const remote = livekit.remotes.find((r) => r.identity === s.id);
      const isSelf = s.id === live.userId;
      const roleFromLabel =
        s.role === "Host" || s.role === "host"
          ? ("host" as const)
          : s.role === "Co-host" || s.role === "cohost"
            ? ("cohost" as const)
            : s.role === "moderator" || s.role === "Moderator"
              ? ("moderator" as const)
              : s.role === "viewer" || s.role === "Viewer"
                ? ("viewer" as const)
                : ("speaker" as const);
      map[s.id] = {
        micOn: isSelf ? micOn : remote ? remote.micOn : liveP ? liveP.mic_on : false,
        camOn: isSelf ? camOn : remote ? remote.camOn : liveP ? liveP.cam_on : false,
        sharing: isSelf
          ? media.sharing
          : remote
            ? remote.sharing
            : liveP
              ? liveP.sharing
              : false,
        handRaised: liveP?.hand_raised ?? false,
        connection: String(livekit.connectionState) === "reconnecting" ? "warn" : "good",
        role:
          (liveP?.role as SpeakerUi["role"]) ??
          (remote?.role === "host" ||
          remote?.role === "cohost" ||
          remote?.role === "speaker" ||
          remote?.role === "moderator" ||
          remote?.role === "viewer"
            ? remote.role
            : roleFromLabel),
        speaking:
          (livekit.activeSpeakerId ?? activeSpeakerId) === s.id ||
          Boolean(remote?.speaking),
      };
    });
    return map;
  }, [
    peopleList,
    micOn,
    camOn,
    media.sharing,
    activeSpeakerId,
    live.participants,
    live.userId,
    livekit.remotes,
    livekit.connectionState,
    livekit.activeSpeakerId,
  ]);

  const chatMessages = useMemo(() => {
    const base = liveChat.messages.length
      ? liveChat.messages
      : data?.chatMessages?.length
        ? data.chatMessages
        : EMPTY_CHAT_MESSAGES;
    const system = presenceToChatMessages(live.presenceEvents ?? []);
    if (!system.length) return base;
    const merged = sortMessagesChronologically([
      ...base.map((m) => ({ ...m, kind: m.kind ?? ("text" as const) })),
      ...system,
    ]) as ChatMessage[];
    return merged;
  }, [liveChat.messages, data?.chatMessages, live.presenceEvents]);

  const visibleRightTabs = useMemo(() => {
    // Live Studio right rail is Chat-only.
    return RIGHT_TABS.filter((t) => t.id === "chat");
  }, []);

  const openShareSheet = useCallback(() => {
    if (!live.session?.id) {
      showToast("No live session to share");
      return;
    }
    setShareOpen(true);
    updateDrawer({ leftPanel: "none", rightOpen: false });
    setFocusMode(false);
  }, [live.session?.id, showToast, updateDrawer]);

  const toggleFollowHost = useCallback(async () => {
    if (!hostUserId || hostUserId === live.userId) {
      showToast("You are the host");
      return;
    }
    const willFollow = !follow.following;
    try {
      await follow.toggle();
      showToast(willFollow ? "Following host" : "Unfollowed host");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Follow failed");
    }
  }, [hostUserId, live.userId, follow, showToast]);

  const reportLive = useCallback(() => {
    if (!live.session?.id) {
      showToast("No live session to report");
      return;
    }
    void fetch(`/api/c/live/sessions/${live.session.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report" }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "Report failed");
        }
        showToast("Report submitted — our team will review");
      })
      .catch((e) => showToast(e instanceof Error ? e.message : "Report failed"));
  }, [live.session?.id, showToast]);

  const handleMoreAction = useCallback(
    (id: LiveMoreActionId) => {
      setLiveNavOpen(false);
      switch (id) {
        case "chat":
          toggleChat();
          break;
        case "people":
          toggleLeft("people");
          break;
        case "invite":
          openShareSheet();
          break;
        case "record":
          void toggleRecord();
          break;
        case "share":
          void startShare();
          break;
        case "streamTo":
          openStreamTo();
          break;
        case "settings":
          setSettingsCategory(null);
          toggleLeft("settings");
          break;
        case "reactions":
          setReactionPickerOpen(true);
          setLiveNavOpen(false);
          break;
        case "analytics":
          openRight("analytics");
          break;
        case "report":
          reportLive();
          break;
        case "leave":
          setConfirmDialog("leave");
          break;
        case "end":
          setConfirmDialog("end");
          break;
        default:
          break;
      }
    },
    [
      toggleChat,
      toggleLeft,
      openShareSheet,
      toggleRecord,
      startShare,
      openStreamTo,
      openRight,
      live,
      showToast,
      updateDrawer,
      reportLive,
    ]
  );

  const liveBackHref = communitySlugProp
    ? `/communities/${communitySlugProp}`
    : "/communities/live";

  const connectionLabel = useMemo(() => {
    if (!online) return "Disconnected";
    const lk = String(livekit.connectionState);
    if (lk === "reconnecting") return "Reconnecting";
    if (lk === "connecting") return "Connecting";
    if (lk === "disconnected" && hasSession) return "Connecting";
    if (connection === "excellent") return "Excellent";
    if (connection === "good") return "Good";
    return "Poor";
  }, [online, livekit.connectionState, connection, hasSession]);

  // Reference layout: stage + right contextual panel — hide left icon rail during Live.
  /* Left context rail removed — dock + More own Participants/Chat/Settings. */
  const showLeftRail = false;
  const showSpeakers = mode !== "minimal" && !focusMode && hasSession;
  const showRight = !focusMode && hasSession;
  const displayTitle =
    live.session?.title ??
    (hasSession ? session.title : draftTitle);
  const hostSpeaker = speakers.find(
    (s) => s.role === "host" || s.role === "Host" || s.id === hostUserId
  );
  const hostAvatar =
    hostSpeaker?.avatar_url ??
    speakers[0]?.avatar_url ??
    selfProfile?.avatar_url ??
    null;
  const hostRemote = hostUserId
    ? livekit.remotes.find((r) => r.identity === hostUserId)
    : null;
  const stageHostName =
    hostSpeaker?.name ??
    selfProfile?.name ??
    session.host;
  const isLiveHost = canEndLive(live.myRole) || live.myRole === "host";

  /** Camera/share streams for PIP tiles — remotes + local guest. */
  const participantStreams = useMemo(() => {
    const map: Record<string, MediaStream | null> = {};
    for (const r of livekit.remotes) {
      map[r.identity] = r.sharing && r.screenStream ? r.screenStream : r.cameraStream;
    }
    if (live.userId) {
      const isHostSelf = live.userId === hostUserId;
      if (media.sharing && media.shareStream) {
        map[live.userId] = media.shareStream;
      } else if (media.camOn && media.cameraStream) {
        map[live.userId] = media.cameraStream;
      } else if (isHostSelf && media.previewStream) {
        // Host may appear in PIP when a guest is promoted to stage.
        map[live.userId] = media.previewStream;
      }
    }
    return map;
  }, [
    livekit.remotes,
    live.userId,
    hostUserId,
    media.camOn,
    media.cameraStream,
    media.sharing,
    media.shareStream,
    media.previewStream,
  ]);

  const galleryParticipants = useMemo(() => {
    const source = peopleList.length ? peopleList : speakers;
    const stageFocus = (
      (live.session?.settings ?? {}) as {
        stage_focus?: { identity?: string | null };
      }
    ).stage_focus;
    const pinnedId =
      typeof stageFocus?.identity === "string" ? stageFocus.identity : null;
    // When a guest is on stage, host appears in the PIP stack.
    if (pinnedId && pinnedId !== hostUserId && hostUserId) {
      const hostPerson = source.find((p) => p.id === hostUserId);
      const guests = source.filter(
        (p) => p.id !== hostUserId && p.id !== pinnedId
      );
      return hostPerson ? [hostPerson, ...guests] : guests;
    }
    return source.filter((p) => p.id !== hostUserId);
  }, [peopleList, speakers, hostUserId, live.session?.settings]);

  const participantCountLabel = useMemo(() => {
    const joined = live.participants.filter((p) => p.status === "joined").length;
    if (joined > 0) return joined;
    // Never conflate with viewer/watching counts — those stay on People/nav/chat.
    return galleryParticipants.length + (hostUserId ? 1 : 0);
  }, [live.participants, galleryParticipants.length, hostUserId]);

  const watchingCountLabel = useMemo(() => {
    const n = live.viewerCount || analytics?.liveViewers || analytics?.viewers || 0;
    return typeof n === "number" && n >= 0 ? n : 0;
  }, [live.viewerCount, analytics?.liveViewers, analytics?.viewers]);

  const handleBack = useCallback(() => {
    if (hasSession && isLiveHost) {
      setConfirmDialog("back");
      return;
    }
    if (hasSession && !isLiveHost) {
      setConfirmDialog("leave");
      return;
    }
    router.push(liveBackHref);
  }, [hasSession, isLiveHost, router, liveBackHref]);

  // Creator Live hub: any authenticated user can start. Community routes: attempt; server enforces.
  const canStartLive = Boolean(live.userId) && !hasSession;
  const canEditLiveTitle =
    (hasSession && (isLiveHost || live.myRole === "cohost") && Boolean(live.session?.id)) ||
    canStartLive;
  const immersive = focusMode;
  const startedLabel = live.session?.started_at
    ? `Started ${formatTime(live.session.started_at)}`
    : null;

  const liveSettingsPanel = (
    <SettingsPanel
      key={settingsCategory ?? "root"}
      title={displayTitle}
      canEditTitle={canEditLiveTitle}
      analytics={analytics}
      initialCategory={settingsCategory}
      onSaveTitle={
        canEditLiveTitle
          ? async (next) => {
              if (!hasSession) {
                setDraftTitle(next.trim().slice(0, 120) || "Start your Live");
                showToast("Title ready — Go Live to start");
                return;
              }
              await live.updateTitle(next);
              showToast("Title updated");
            }
          : undefined
      }
      audioDevices={media.audioDevices}
      videoDevices={media.videoDevices}
      activeAudioId={media.activeAudioId}
      activeVideoId={media.activeVideoId}
      onSwitchMic={(id) => void media.switchMicrophone(id)}
      onSwitchCam={(id) => void media.switchCamera(id)}
      micOn={micOn}
      camOn={camOn}
      onToggleMic={() => void toggleMic()}
      onToggleCam={() => void toggleCam()}
      sharing={media.sharing}
      onStartShare={() => void startShare()}
      onStopShare={stopShare}
      screenShareSupported={
        screenShareCapability.canAttempt && (canUseScreen || !live.session)
      }
      screenShareReason={
        !canUseScreen && live.session
          ? permissionDeniedReason("screen", participantPerms) ||
            screenShareCapability.reason
          : screenShareCapability.reason
      }
      audioAccess={media.audioAccess}
      videoAccess={media.videoAccess}
      canManageChat={canModerateChat(live.myRole) || isLiveHost}
      chatEnabled={
        (
          live.session?.settings as { chat?: { enabled?: boolean } } | null | undefined
        )?.chat?.enabled !== false
      }
      onChatEnabled={(enabled) => {
        if (!live.session?.id) return;
        void fetch(`/api/c/live/sessions/${live.session.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chat-settings",
            chatSettings: { enabled },
          }),
        }).then(async (res) => {
          if (!res.ok) showToast("Could not update chat settings");
          else {
            await live.refresh(live.session!.id);
            showToast(enabled ? "Chat enabled" : "Chat disabled");
          }
        });
      }}
      advancedSlot={
        isLiveHost || canStartLive ? (
          <LiveDestinationsPanel
            dest={destinations}
            variant="settings"
            compact
            isLive={live.session?.status === "live"}
          />
        ) : (
          <LiveDestinationsPanel
            dest={destinations}
            variant="settings"
            compact
            isLive={live.session?.status === "live"}
            audienceMode
            hostSocial={hostSocial}
            hostDisplayName={
              peopleList.find((p) => p.id === hostUserId)?.name ?? null
            }
          />
        )
      }
      recording={recordingActive}
      canRecord={canUseRecord || isLiveHost}
      onToggleRecord={() => void toggleRecord()}
      canManageParticipantPermissions={isHostControlRole && Boolean(live.session)}
      participantPermissions={participantPerms}
      onParticipantPermissions={(patch) => {
        void live
          .updateParticipantPermissions(patch)
          .then(() => showToast("Participant permissions updated"))
          .catch(() => showToast("Could not update permissions"));
      }}
      recordingDeniedReason={
        !canUseRecord
          ? permissionDeniedReason("recording", participantPerms) ||
            "Recording is not available for your role."
          : null
      }
      profileName={
        selfProfile?.name ||
        live.participants.find((p) => p.user_id === live.userId)?.display_name ||
        "You"
      }
      profileAvatarUrl={
        selfProfile?.avatar_url ??
        live.participants.find((p) => p.user_id === live.userId)?.avatar_url ??
        null
      }
      onSaveProfile={
        live.userId
          ? async ({ displayName, avatarUrl }) => {
              const res = await fetch("/api/identity/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fullName: displayName,
                  ...(avatarUrl ? { avatarUrl } : {}),
                }),
              });
              const json = (await res.json().catch(() => ({}))) as {
                error?: string;
                saved?: boolean;
              };
              if (!res.ok || json.saved === false) {
                throw new Error(json.error ?? "Could not save profile");
              }
              setSelfProfile({
                name: displayName,
                avatar_url: avatarUrl ?? selfProfile?.avatar_url ?? null,
              });
              if (live.session?.id) {
                await live.refresh(live.session.id);
              }
              showToast("Profile updated");
            }
          : undefined
      }
    />
  );

  const showGuestJoin =
    Boolean(sessionIdProp) && live.authReady && !live.userId;

  if (showGuestJoin && sessionIdProp) {
    return (
      <LiveGuestJoinCard
        sessionId={sessionIdProp}
        preview={guestPreview}
        initialError={guestError}
        loadingPreview={guestPreviewLoading}
      />
    );
  }

  if ((!live.authReady && sessionIdProp) || loading) {
    return (
      <div
        className={cn(
          "relative flex h-[calc(100vh-56px)] min-h-[520px] flex-col bg-[#F8FAFC]",
          LIVE_PAGE_BG
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200/80 bg-white px-4 py-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
          <div className="ml-auto h-9 w-24 animate-pulse rounded-full bg-neutral-200" />
        </div>
        <div className="flex min-h-0 flex-1 gap-0">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="relative m-3 flex-1 animate-pulse rounded-2xl bg-neutral-200/70" />
            <div className="flex items-center justify-center gap-3 px-4 pb-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 w-12 animate-pulse rounded-full bg-neutral-200"
                />
              ))}
            </div>
          </div>
          {drawer.rightOpen || drawer.leftPanel !== "none" ? (
            <div className="hidden w-[320px] shrink-0 border-l border-neutral-200 bg-white p-4 md:block">
              <div className="mb-4 h-4 w-28 animate-pulse rounded bg-neutral-200" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-neutral-100" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <span className="sr-only">Loading live studio</span>
      </div>
    );
  }

  // Status banners — only for true offline / unavailable-session cases.
  // Sticky "Not found" must not cover a live session that is already mounted.
  const showSessionBanner =
    !focusMode &&
    ((!online && !hasSession) ||
      (Boolean(loadError) && !hasSession) ||
      (Boolean(live.error) && !hasSession));
  const showReconnectChip =
    hasSession &&
    !focusMode &&
    (!online ||
      String(livekit.connectionState) === "reconnecting" ||
      connectionLabel === "Reconnecting");

  return (
    <div
      className={cn(
        "relative flex h-[calc(100vh-56px)] min-h-[520px] flex-col motion-safe:transition-colors motion-safe:duration-[180ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
        hasSession ? "bg-[#F8FAFC] text-[#111827]" : "bg-[#F8FAFC] text-[#111827]"
      )}
    >
      {showSessionBanner && (
        <div
          role="alert"
          className="flex shrink-0 items-center justify-between gap-3 bg-neutral-900 px-4 py-2 text-[12px] text-white"
        >
          <p className="min-w-0 truncate tracking-[-0.01em]">
            {!online
              ? "You’re offline — reconnect to restore chat and controls."
              : live.error
                ? live.error === "Not found"
                  ? "Live session unavailable."
                  : live.error
                : loadError === "network"
                  ? "Couldn’t reach the live service."
                  : "Live data temporarily unavailable."}
          </p>
          <button
            type="button"
            onClick={() => {
              void loadDashboard({ soft: true });
              void liveChat.reload().catch(() => undefined);
              void liveChat.flushOutbox();
              if (sessionIdProp) {
                void live.join(sessionIdProp).catch(() => undefined);
              }
            }}
            className={cn(
              "shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium hover:bg-white/15",
              FOCUS_RING_DARK
            )}
          >
            Retry
          </button>
        </div>
      )}
      {showReconnectChip && (
        <div
          role="status"
          className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-200/80 bg-amber-50 px-4 py-1.5 text-[12px] font-medium text-amber-900"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Reconnecting…
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
      {/* Header — title + follow/share only */}
      {!focusMode && (
        <LiveExperienceHeader
          title={displayTitle}
          immersive={hasSession || immersive}
          brandMobile={hasSession}
          follow={follow}
          onFollow={() => void toggleFollowHost()}
          onShare={openShareSheet}
          onMore={openMore}
          onSettings={() => {
            setSettingsCategory(null);
            toggleLeft("settings");
          }}
          onOpenChat={toggleChat}
          copied={copied}
          showFollow={Boolean(hostUserId && hostUserId !== live.userId && hasSession)}
          showGoLive={canStartLive}
          onGoLive={() => void createOrJoinLive()}
          liveActive={hasSession}
          watchingCount={hasSession ? watchingCountLabel : undefined}
          elapsedLabel={hasSession ? formatElapsed(elapsed) : undefined}
          canEditTitle={canEditLiveTitle}
          canEnd={canEndLive(live.myRole)}
          onEndLive={() => setConfirmDialog("end")}
          onLeaveLive={() => setConfirmDialog("leave")}
          onSaveTitle={
            canEditLiveTitle
              ? async (next) => {
                  if (!hasSession) {
                    setDraftTitle(next.trim().slice(0, 120) || "Start your Live");
                    showToast("Title ready — Go Live to start");
                    return;
                  }
                  try {
                    await live.updateTitle(next);
                    showToast("Title updated");
                  } catch (e) {
                    showToast(e instanceof Error ? e.message : "Could not save title");
                    throw e;
                  }
                }
              : undefined
          }
          backHref={liveBackHref}
          onBack={handleBack}
        />
      )}

      {/* Body — three columns: LIVE NOW | Stage | Chat */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {showLeftRail && (
          <LiveContextNav
            leftPanel={drawer.leftPanel}
            rightTab={drawer.rightTab}
            rightOpen={drawer.rightOpen}
            viewerCount={live.viewerCount || analytics?.viewers || 0}
            onOverview={() => {
              updateDrawer({ leftPanel: "none", rightOpen: false });
              setLiveNavOpen(false);
            }}
            onOpenLeft={(panel) => {
              toggleLeft(panel);
              setLiveNavOpen(false);
            }}
            onToggleChat={() => {
              toggleChat();
              setLiveNavOpen(false);
            }}
            onShare={openShareSheet}
          />
        )}

        {/* More panel — desktop right rail / mobile bottom sheet */}
        {liveNavOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/45"
              aria-label="Close more menu"
              onClick={() => setLiveNavOpen(false)}
            />
            <aside
              className={cn(
                "fixed z-50 flex flex-col bg-white shadow-[0_20px_60px_rgba(0,0,0,0.28)]",
                "inset-x-0 bottom-0 max-h-[min(78vh,640px)] rounded-t-[28px] pb-[env(safe-area-inset-bottom)]",
                "animate-in fade-in slide-in-from-bottom-2 duration-200",
                "lg:inset-y-16 lg:bottom-auto lg:right-4 lg:left-auto lg:top-20 lg:h-[min(720px,calc(100vh-7rem))] lg:w-[min(380px,34vw)] lg:rounded-[28px] lg:slide-in-from-right-2"
              )}
            >
              <div
                className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-neutral-200"
                aria-hidden
              />
              <DrawerHeader title="More" onClose={() => setLiveNavOpen(false)} />
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-1">
                <div className="hidden lg:block">
                  <LiveMorePanel
                    variant="desktop"
                    canEnd={canEndLive(live.myRole)}
                    onAction={handleMoreAction}
                  />
                </div>
                <div className="lg:hidden">
                  <LiveMorePanel
                    variant="mobile"
                    canEnd={canEndLive(live.myRole)}
                    onAction={handleMoreAction}
                  />
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Stage — light chrome; video occupies the canvas */}
        <main
          className={cn(
            "relative flex min-w-0 flex-1 flex-col overflow-hidden",
            "bg-[#F8FAFC]"
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              immersive
                ? "overflow-hidden p-0"
                : hasSession
                  ? "gap-3 overflow-y-auto px-3 pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-5 lg:pb-4"
                  : "overflow-y-auto px-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-0 sm:px-4 sm:pb-4"
            )}
          >
            <div
              role="presentation"
              onDoubleClick={() => setFocusMode((v) => !v)}
              className={cn(
                "relative w-full cursor-default overflow-hidden",
                immersive
                  ? "min-h-0 flex-1 rounded-none border-0 bg-transparent"
                  : hasSession
                    ? "aspect-[4/5] min-h-0 shrink-0 rounded-2xl sm:aspect-video sm:flex-1"
                    : "min-h-[min(78vh,700px)] shrink-0 rounded-none bg-transparent",
                activity === "share" && "ring-2 ring-[#FF5A1F]/35",
                "motion-safe:transition-transform motion-safe:duration-[180ms]"
              )}
            >
              <div
                className={cn(
                  "absolute inset-0",
                  hasSession
                    ? "bg-[radial-gradient(ellipse_at_50%_36%,rgba(255,90,31,0.12)_0%,#EEF2F7_42%,#E2E8F0_100%)]"
                    : "bg-transparent"
                )}
              />
              <StageMediaPreview
                stream={stageStream}
                cover={
                  !(media.sharing || livekit.remotes.some((r) => r.sharing)) &&
                  Boolean(stageStream)
                }
              />
              {media.sharing && !screenShareBannerHidden ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] z-[3] flex justify-center px-3 sm:bottom-24">
                  <div
                    className="pointer-events-auto inline-flex max-w-[min(100%,360px)] items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[12px] font-medium text-white shadow-lg backdrop-blur-md"
                    role="status"
                  >
                    <button
                      type="button"
                      onClick={() => setActivity("share")}
                      className={cn(
                        "min-w-0 flex-1 truncate text-left hover:text-white/90",
                        FOCUS_RING_DARK
                      )}
                    >
                      Sharing your screen
                    </button>
                    <button
                      type="button"
                      onClick={stopShare}
                      className={cn(
                        "shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-500",
                        FOCUS_RING_DARK
                      )}
                    >
                      Stop
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreenShareBannerHidden(true)}
                      aria-label="Hide screen share indicator"
                      title="Hide indicator (keeps sharing)"
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white",
                        FOCUS_RING_DARK
                      )}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : null}
              {livekit.remotes.map((r) => (
                <RemoteAudioSink key={`audio-${r.identity}`} stream={r.audioStream} />
              ))}
              <LiveReactionFloater sessionId={live.session?.id ?? null} />

              {hasSession ? (
                <div className="relative z-[2] h-full w-full">
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
                    <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                      {recordingActive && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-semibold text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          REC
                        </span>
                      )}
                    </div>
                    <div className="pointer-events-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFocusMode(true)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/35 text-white/75 shadow-sm backdrop-blur-md hover:bg-black/50 hover:text-white",
                          FOCUS_RING_DARK
                        )}
                        aria-label="Enter fullscreen"
                      >
                        <Fullscreen className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                      </button>
                    </div>
                  </div>

                  {!stageStream && (
                    <>
                      {livekit.connecting ? (
                        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center px-6 text-center">
                          <p className="inline-flex items-center gap-2 text-[13px] text-white/55">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            Connecting…
                          </p>
                        </div>
                      ) : livekit.error ? (
                        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center px-6 text-center">
                          <div className="max-w-sm rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-200">
                            <p className="font-medium">Connection issue</p>
                            <p className="mt-1 text-red-200/90">{livekit.error}</p>
                            <button
                              type="button"
                              onClick={() => void livekit.reconnect()}
                              className={cn(
                                "mt-2 rounded-full bg-white px-3 py-1 font-medium text-[#0B1220] hover:bg-white/90",
                                FOCUS_RING_DARK
                              )}
                            >
                              Reconnect
                            </button>
                          </div>
                        </div>
                      ) : (
          <LiveStageFallback
                          hostName={stageHostName}
                          avatarUrl={hostAvatar}
                          cameraOff={!hostRemote?.camOn && !media.camOn}
                          micOff={hostRemote ? !hostRemote.micOn : !micOn}
                          screenSharing={Boolean(hostRemote?.sharing || media.sharing)}
                          reconnecting={connectionLabel === "Reconnecting"}
                          showHostBadge={false}
                        />
                      )}
                    </>
                  )}

                  {focusMode && (
                    <button
                      type="button"
                      onClick={() => setFocusMode(false)}
                      className={cn(
                        "absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-md hover:bg-black/70",
                        MOTION_COLORS,
                        FOCUS_RING_DARK
                      )}
                    >
                      Exit Focus
                    </button>
                  )}

                  {showSpeakers && galleryParticipants.length > 0 ? (
                    <LiveStagePipStack>
                      {galleryParticipants.map((p) => {
                        const ui = speakerUi[p.id];
                        const remote = livekit.remotes.find(
                          (r) => r.identity === p.id
                        );
                        const isYou = p.id === live.userId;
                        const sharing = Boolean(
                          isYou ? media.sharing : ui?.sharing ?? remote?.sharing
                        );
                        const stream = participantStreams[p.id] ?? null;
                        const canManageStage =
                          live.myRole === "host" || live.myRole === "cohost";
                        return (
                          <LiveStagePipTile
                            key={p.id}
                            name={p.name}
                            avatarUrl={p.avatar_url}
                            stream={stream}
                            camOn={Boolean(
                              isYou ? camOn : ui?.camOn ?? remote?.camOn
                            )}
                            micOn={Boolean(
                              isYou ? micOn : ui?.micOn ?? remote?.micOn
                            )}
                            sharing={sharing}
                            isYou={isYou}
                            speaking={Boolean(ui?.speaking)}
                            selected={activeSpeakerId === p.id}
                            canManage={canManageStage}
                            onSelect={() => setActiveSpeakerId(p.id)}
                            onViewFull={
                              stream
                                ? () =>
                                    setViewFull({
                                      name: p.name,
                                      stream,
                                    })
                                : undefined
                            }
                            onMoveToStage={
                              canManageStage
                                ? () => {
                                    void live
                                      .setStageFocus({
                                        identity: p.id,
                                        kind: sharing ? "screen" : "participant",
                                      })
                                      .then(() =>
                                        showToast(
                                          sharing
                                            ? "Screen moved to stage"
                                            : "Moved to stage"
                                        )
                                      )
                                      .catch((e) =>
                                        showToast(
                                          e instanceof Error
                                            ? e.message
                                            : "Could not move to stage"
                                        )
                                      );
                                  }
                                : undefined
                            }
                            onStopShare={
                              canManageStage && sharing && !isYou
                                ? () => {
                                    void live
                                      .forceMedia(p.id, { sharing: false })
                                      .then(() =>
                                        showToast("Asked to stop sharing")
                                      )
                                      .catch((e) =>
                                        showToast(
                                          e instanceof Error
                                            ? e.message
                                            : "Could not stop share"
                                        )
                                      );
                                  }
                                : canManageStage && sharing && isYou
                                  ? () => stopShare()
                                  : undefined
                            }
                          />
                        );
                      })}
                    </LiveStagePipStack>
                  ) : null}

                  {viewFull ? (
                    <LiveViewFullOverlay
                      name={viewFull.name}
                      stream={viewFull.stream}
                      onClose={() => setViewFull(null)}
                    />
                  ) : null}

                  {((live.session?.settings ?? {}) as {
                    stage_focus?: { identity?: string | null };
                  }).stage_focus?.identity &&
                  (live.myRole === "host" || live.myRole === "cohost") ? (
                    <div className="pointer-events-none absolute bottom-3 left-3 z-[6] sm:bottom-4 sm:left-4">
                      <button
                        type="button"
                        onClick={() => {
                          void live
                            .setStageFocus({ identity: null, kind: "default" })
                            .then(() => showToast("Host stage restored"))
                            .catch(() => undefined);
                        }}
                        className={cn(
                          "pointer-events-auto rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md hover:bg-black/70",
                          FOCUS_RING_DARK
                        )}
                      >
                        Restore host stage
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="relative z-[1] h-full w-full">
                  <LivePrepareStage
                    previewStream={media.previewStream}
                    title={displayTitle}
                    hostName={
                      live.userId
                        ? selfProfile?.name || "You"
                        : stageHostName
                    }
                    hostAvatarUrl={
                      live.userId
                        ? selfProfile?.avatar_url ?? hostAvatar
                        : hostAvatar
                    }
                    busy={live.busy}
                    micOn={micOn}
                    camOn={camOn}
                    permissionDenied={media.permissionDenied}
                    permissionRequested={media.permissionRequested}
                    audioAccess={media.audioAccess}
                    videoAccess={media.videoAccess}
                    lastError={media.lastError}
                    mediaBusy={mediaBusy}
                    canGoLive={canStartLive}
                    onGoLive={canStartLive ? () => void createOrJoinLive() : undefined}
                    onEnableMedia={
                      live.userId ? () => void enableStudioMedia() : undefined
                    }
                    onStreamDestinations={
                      live.userId ? openStreamTo : undefined
                    }
                    onToggleMic={() => void toggleMic()}
                    onToggleCam={() => void toggleCam()}
                  />
                </div>
              )}
            </div>

            {hasSession ? (
              <div className="hidden lg:block">
                <ControlDock
                  activity={activity}
                  micOn={micOn}
                  camOn={camOn}
                  recording={recordingActive}
                  sharing={media.sharing}
                  focusMode={focusMode}
                  canPublish={canUseMic || canUseCam || canUseScreen}
                  dark={false}
                  onMic={() => void toggleMic()}
                  onCam={() => void toggleCam()}
                  onShare={() => void startShare()}
                  onStopShare={stopShare}
                  onPresent={() => setActivity((a) => (a === "present" ? "live" : "present"))}
                  onRecord={() => void toggleRecord()}
                  onInvite={openShareSheet}
                  inviteOpen={shareOpen}
                  onChat={toggleChat}
                  chatOpen={drawer.rightOpen && drawer.rightTab === "chat"}
                  onPeople={() => toggleLeft("people")}
                  peopleOpen={drawer.leftPanel === "people"}
                  participantCount={participantCountLabel}
                  onStreamTo={openStreamTo}
                  streamToOpen={drawer.leftPanel === "destinations"}
                  onMore={openMore}
                  moreOpen={liveNavOpen}
                  onReact={() => {
                    setReactionPickerOpen(true);
                  }}
                  onCopyLink={openShareSheet}
                  onFullscreen={() => setFocusMode(true)}
                  onEnd={() => setConfirmDialog("end")}
                  onLeave={() => setConfirmDialog("leave")}
                  canEnd={canEndLive(live.myRole)}
                />
              </div>
            ) : null}
          </div>
        </main>

        {/* Right contextual panel — Settings / Participants / Rooms / Layout */}
        {!focusMode && drawer.leftPanel !== "none" && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-30 bg-black/45 lg:hidden"
              aria-label="Close panel"
              onClick={() => updateDrawer({ leftPanel: "none" })}
            />
            <aside
              className={cn(
                "flex w-full shrink-0 flex-col bg-white",
                "fixed inset-x-0 bottom-0 z-40 max-h-[min(85vh,720px)] rounded-t-[28px] border-t border-neutral-200 shadow-[0_-20px_60px_rgba(0,0,0,0.25)]",
                "pb-[env(safe-area-inset-bottom)]",
                "animate-in fade-in slide-in-from-bottom-2 duration-200",
                "lg:static lg:inset-auto lg:z-auto lg:my-3 lg:mr-3 lg:h-auto lg:max-h-none lg:w-[min(380px,34vw)] lg:animate-in lg:slide-in-from-right-2 lg:rounded-[28px] lg:border lg:border-neutral-200 lg:pb-0 lg:shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
              )}
            >
              <div
                className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-neutral-200 lg:hidden"
                aria-hidden
              />
              <DrawerHeader
                title={
                  drawer.leftPanel === "people"
                    ? "Participants"
                    : drawer.leftPanel === "settings"
                      ? "Settings"
                      : drawer.leftPanel === "destinations"
                        ? "Destinations & RTMP"
                        : LEFT_TOOLS.find((t) => t.id === drawer.leftPanel)?.label ?? ""
                }
                count={
                  drawer.leftPanel === "people" ? participantCountLabel : undefined
                }
                onClose={() => updateDrawer({ leftPanel: "none" })}
              />
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
                {drawer.leftPanel === "people" && (
                  <PeoplePanel {...peoplePanelProps} ui={speakerUi} />
                )}
                {drawer.leftPanel === "rooms" && (
                  <RoomsPanel rooms={data?.rooms ?? []} related={data?.relatedRooms ?? []} />
                )}
                {drawer.leftPanel === "layout" && (
                  <LayoutPanel layout={layout} onChange={setLayout} />
                )}
                {drawer.leftPanel === "settings" && liveSettingsPanel}
                {drawer.leftPanel === "destinations" && (
                  <LiveDestinationsPanel
                    dest={destinations}
                    variant="settings"
                    isLive={live.session?.status === "live"}
                    audienceMode={!isLiveHost && !canStartLive}
                    hostSocial={hostSocial}
                    hostDisplayName={
                      peopleList.find((p) => p.id === hostUserId)?.name ?? null
                    }
                  />
                )}
              </div>
            </aside>
          </>
        )}

        {/* Right workspace — Live Chat column / sheet */}
        {showRight && (
          <>
            {drawer.rightOpen && (
              <button
                type="button"
                className="fixed inset-0 z-30 bg-black/45 lg:hidden"
                aria-label="Close live chat"
                onClick={() => updateDrawer({ rightOpen: false })}
              />
            )}
          <aside
            className={cn(
              "flex w-full shrink-0 flex-col bg-white",
              "fixed inset-x-0 bottom-0 z-40 max-h-[min(80vh,680px)] rounded-t-[28px] border-t border-neutral-200 shadow-[0_-20px_60px_rgba(0,0,0,0.18)]",
              "pb-[env(safe-area-inset-bottom)]",
              "lg:static lg:inset-auto lg:z-auto lg:my-3 lg:mr-3 lg:h-auto lg:max-h-none lg:rounded-[28px] lg:border lg:border-neutral-200 lg:pb-0 lg:shadow-[0_20px_60px_rgba(0,0,0,0.22)]",
              "transition-[transform,width,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              drawer.rightOpen
                ? "translate-y-0 lg:w-[min(380px,34vw)] lg:opacity-100"
                : "pointer-events-none translate-y-full lg:w-0 lg:overflow-hidden lg:border-0 lg:opacity-0 lg:shadow-none"
            )}
            aria-hidden={!drawer.rightOpen}
          >
            <div
              className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-neutral-200 lg:hidden"
              aria-hidden
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                  <DrawerHeader
                    title="Chat"
                    onClose={() => updateDrawer({ rightOpen: false })}
                  />
                  <ChatWorkspace
                    messages={chatMessages}
                    scrollTop={drawer.chatScroll}
                    onScrollSave={(y) => updateDrawer({ chatScroll: y })}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    hostName={session.host}
                    hideTitle
                    showEngagementIcons
                    onlineCount={live.viewerCount || analytics?.viewers || 0}
                    participantAvatars={speakers.slice(0, 6).map((s) => ({
                      name: s.name,
                      src: s.avatar_url,
                    }))}
                    mentionCandidates={[
                      ...new Set(
                        [session.host, ...speakers.map((s) => s.name), ...chatMessages.map((m) => m.sender_name)].filter(
                          Boolean
                        )
                      ),
                    ]}
                    typingUsers={liveChat.typingUsers}
                    onTyping={() => liveChat.signalTyping()}
                    connected={liveChat.connected}
                    connectionStatus={liveChat.connectionStatus}
                    queuedCount={liveChat.queuedCount}
                    roomActions={liveChat.roomActions}
                    canModerate={canModerateChat(live.myRole)}
                    slowModeSeconds={
                      Number(
                        (
                          live.session?.settings as
                            | { chat?: { slow_mode_seconds?: number } }
                            | null
                          | undefined
                        )?.chat?.slow_mode_seconds ?? 0
                      ) || 0
                    }
                    onSend={async (body, reply) => {
                      try {
                        await liveChat.send(body, reply);
                      } catch (e) {
                        showToast(e instanceof Error ? e.message : "Message failed");
                      }
                    }}
                    onReact={
                      liveChat.roomActions
                        ? async (id) => {
                            try {
                              await liveChat.toggleReaction(id);
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : "React failed");
                            }
                          }
                        : undefined
                    }
                    onPin={
                      liveChat.roomActions && canModerateChat(live.myRole)
                        ? async (id, pin) => {
                            try {
                              await liveChat.togglePin(id, pin);
                              showToast(pin ? "Message pinned" : "Message unpinned");
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : "Pin failed");
                            }
                          }
                        : undefined
                    }
                    onDelete={
                      liveChat.roomActions
                        ? async (id) => {
                            try {
                              await liveChat.deleteMessage(id);
                              showToast("Message deleted");
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : "Delete failed");
                            }
                          }
                        : undefined
                    }
                    onEdit={
                      liveChat.roomActions
                        ? async (id, body) => {
                            try {
                              await liveChat.editMessage(id, body);
                              showToast("Message updated");
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : "Edit failed");
                            }
                          }
                        : undefined
                    }
                    onSendGif={
                      liveChat.roomActions
                        ? async (url, title) => {
                            try {
                              await liveChat.sendGif(url, title);
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : "GIF failed");
                            }
                          }
                        : undefined
                    }
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
                          const me = live.participants.find(
                            (p) => p.user_id === live.userId
                          );
                          const raised =
                            me?.hand_raised === true || me?.status === "requested";
                          if (raised) {
                            await live.lowerHand();
                            showToast("Hand lowered");
                          } else {
                            await live.requestSpeak();
                            showToast("Hand raised — waiting for host");
                          }
                        } catch (e) {
                          showToast(
                            e instanceof Error ? e.message : "Could not update hand"
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
                  canManage={canRecord(live.myRole, {
                    allowParticipantRecording: participantPerms.allowRecording,
                  })}
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
                      onSwitchSource={() => void switchShareSource()}
                    />
                  </div>
                  <LiveCreatorTools
                    sessionId={live.session.id}
                    canManage={canInviteSpeaker(live.myRole)}
                    waitingRoomEnabled={Boolean(
                      (live.session.settings as { waiting_room?: boolean } | null)
                        ?.waiting_room
                    )}
                    waitingCount={waitingRoomList.length}
                    onToggleWaitingRoom={(enabled) => live.setWaitingRoom(enabled)}
                    onInviteCohost={async (userId) => {
                      await live.invite(userId, "cohost");
                    }}
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
              {drawer.rightTab === "events" && (
                <EventsPanel
                  upcoming={data?.upcomingSessions ?? []}
                  related={data?.relatedRooms ?? []}
                />
              )}
              {drawer.rightTab === "analytics" && (
                <AnalyticsPanel analytics={analytics} liveMetrics={liveMetrics} />
              )}
            </div>
            </div>
          </aside>
          </>
        )}
      </div>

      <LiveMobileDock
        isHost={isLiveHost && hasSession}
        canPublish={hasSession && (canUseMic || canUseCam || canUseScreen)}
        hasSession={hasSession}
        micOn={micOn}
        camOn={camOn}
        sharing={media.sharing}
        recording={recordingActive}
        audioAccess={media.audioAccess}
        videoAccess={media.videoAccess}
        permissionDenied={media.permissionDenied}
        participantCount={participantCountLabel}
        chatOpen={drawer.rightOpen && drawer.rightTab === "chat"}
        inviteOpen={shareOpen}
        peopleOpen={drawer.leftPanel === "people"}
        streamToOpen={drawer.leftPanel === "destinations"}
        moreOpen={liveNavOpen}
        screenShareSupported={screenShareCapability.canAttempt}
        screenShareReason={screenShareCapability.reason}
        onMic={() => void toggleMic()}
        onCam={() => void toggleCam()}
        onShare={() => void startShare()}
        onStopShare={stopShare}
        onChat={toggleChat}
        onInvite={openShareSheet}
        onPeople={() => toggleLeft("people")}
        onRecord={() => void toggleRecord()}
        onStreamTo={openStreamTo}
        onShareLink={openShareSheet}
        onMore={openMore}
        onEndLive={() => setConfirmDialog("end")}
        onLeave={() => setConfirmDialog("leave")}
      />

      {reactionPickerOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Reactions"
          onClick={() => setReactionPickerOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-[13px] font-semibold text-[#111827]">Reactions</p>
            <div className="flex flex-wrap gap-2">
              {["👍", "❤️", "🔥", "👏", "😂", "🙌", "🎉", "😍", "😮", "😢", "💯"].map(
                (emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="rounded-xl bg-[#F3F4F6] px-3 py-2 text-xl hover:bg-[#EBEDEF]"
                    aria-label={`React ${emoji}`}
                    onClick={() => {
                      if (!live.session?.id) {
                        showToast("Start Live to react");
                        return;
                      }
                      void live
                        .react(emoji)
                        .then(() => {
                          showToast(`${emoji} sent`);
                          setReactionPickerOpen(false);
                        })
                        .catch((e) =>
                          showToast(
                            e instanceof Error ? e.message : "Reaction failed"
                          )
                        );
                    }}
                  >
                    {emoji}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-xl px-3 py-2 text-[12px] font-semibold text-neutral-600 hover:bg-neutral-50"
              onClick={() => setReactionPickerOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <LiveConfirmDialog
        open={confirmDialog === "end"}
        title="End Live?"
        description="Ending the live session will disconnect everyone. Recordings will be finalized if active."
        confirmLabel="End Live"
        danger
        busy={endLiveBusy}
        onConfirm={() => void endLive()}
        onCancel={() => setConfirmDialog(null)}
      />

      <LiveConfirmDialog
        open={confirmDialog === "back"}
        title="Leave Live?"
        description="Your Live is still active. You can continue broadcasting or end it for everyone."
        confirmLabel="End Live"
        cancelLabel="Continue Live"
        danger
        busy={endLiveBusy}
        onConfirm={() => void endLive()}
        onCancel={() => setConfirmDialog(null)}
      />

      <LiveConfirmDialog
        open={confirmDialog === "leave"}
        title="Leave Live?"
        description="You will leave this live session. The broadcast will continue for others."
        confirmLabel="Leave Live"
        busy={leaveLiveBusy}
        onConfirm={() => void leaveLive()}
        onCancel={() => setConfirmDialog(null)}
      />

      <LiveShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        sessionId={live.session?.id ?? null}
        title={live.session?.title ?? session.title}
        communityBound={Boolean(live.session?.community_id)}
        onCopied={() => {
          setCopied(true);
          showToast("Link copied");
          setTimeout(() => setCopied(false), 1600);
        }}
        onMessaged={(name) => showToast(`Sent to ${name}`)}
        onError={(message) => showToast(message)}
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
