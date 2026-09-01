"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { Mic, MicOff, Phone, Video, VideoOff, X } from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";
import { cn } from "@/lib/utils";

interface CallProviderProps {
  children: React.ReactNode;
}

export type CallPeer = {
  name?: string;
  avatar?: string | null;
  username?: string | null;
};

interface IncomingCall {
  type: "audio" | "video";
  sender: (CallPeer & { full_name?: string; avatar_url?: string }) | null;
  roomId?: string;
  convId?: string;
}

type CallPhase = "idle" | "calling" | "connected";

const CallContext = createContext<{
  callType: "audio" | "video" | null;
  setCallType: (t: "audio" | "video" | null) => void;
  incomingCall: IncomingCall | null;
  setIncomingCall: (c: IncomingCall | null) => void;
  startCall: (
    type: "audio" | "video",
    roomId?: string,
    convId?: string,
    peer?: CallPeer
  ) => Promise<void>;
  endCall: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  pcRef: React.MutableRefObject<RTCPeerConnection | null>;
  iceQueueRef: React.MutableRefObject<RTCIceCandidateInit[]>;
} | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

function VoiceVisualizer({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audioTrack = stream?.getAudioTracks().find((t) => t.readyState === "live");
    if (!canvas || !audioTrack) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(analyser);
    } catch {
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const bars = 24;
      const gap = 3;
      const barW = (w - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[i] ?? 0;
        const barH = Math.max(4, (v / 255) * h);
        ctx.fillStyle = "#FF5A1F";
        ctx.globalAlpha = 0.35 + (v / 255) * 0.65;
        ctx.fillRect(i * (barW + gap), h - barH, barW, barH);
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    void audioCtx.resume();
    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source?.disconnect();
      analyser?.disconnect();
      void audioCtx?.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={48}
      className="mx-auto rounded-lg bg-neutral-900/40"
      aria-hidden
    />
  );
}

export function CallProvider({ children }: CallProviderProps) {
  const { communityId, userId, slug } = useWorkspace();
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callPeer, setCallPeer] = useState<CallPeer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const routeRef = useRef<{ roomId?: string; convId?: string }>({});
  const supabase = createClient();

  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callingToneRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const callPhase: CallPhase = useMemo(() => {
    if (remoteStream) return "connected";
    if (callType || incomingCall) return "calling";
    return "idle";
  }, [callType, incomingCall, remoteStream]);

  const displayPeer = useMemo((): CallPeer | null => {
    if (callPeer) return callPeer;
    if (incomingCall?.sender) {
      return {
        name:
          incomingCall.sender.full_name ||
          incomingCall.sender.name ||
          incomingCall.sender.username ||
          "Someone",
        avatar: incomingCall.sender.avatar_url ?? incomingCall.sender.avatar,
        username: incomingCall.sender.username,
      };
    }
    return null;
  }, [callPeer, incomingCall]);

  useEffect(() => {
    ringtoneRef.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3"
    );
    ringtoneRef.current.loop = true;
    callingToneRef.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3"
    );
    callingToneRef.current.loop = true;
    return () => {
      ringtoneRef.current?.pause();
      callingToneRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (incomingCall) ringtoneRef.current?.play().catch(() => {});
    else ringtoneRef.current?.pause();
  }, [incomingCall]);

  useEffect(() => {
    if (callType && !remoteStream) callingToneRef.current?.play().catch(() => {});
    else callingToneRef.current?.pause();
  }, [callType, remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const sendSignal = useCallback(
    async (type: string, bodyContent: unknown, targetRoom?: string, targetConv?: string) => {
      const endpoint = targetConv
        ? `/api/communities/${slug}/inbox/${targetConv}/messages`
        : `/api/messages/${targetRoom}`;

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: typeof bodyContent === "object" ? JSON.stringify(bodyContent) : bodyContent,
          message_type: type,
        }),
      });
    },
    [slug]
  );

  const handleCallSignal = useCallback(
    async (signal: { sdp?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          for (const cand of iceQueueRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          iceQueueRef.current = [];

          if (signal.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal(
              "call_signal",
              { sdp: answer },
              routeRef.current.roomId,
              routeRef.current.convId
            );
          }
        } else if (signal.ice) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(() => {});
          } else {
            iceQueueRef.current.push(signal.ice);
          }
        }
      } catch (e) {
        console.error("Signal Error:", e);
      }
    },
    [sendSignal]
  );

  const initWebRTC = useCallback(
    async (type: "audio" | "video", isInitiator: boolean, rId?: string, cId?: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        setLocalStream(stream);
        setCamOff(type !== "video");

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;
        routeRef.current = { roomId: rId, convId: cId };

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        pc.ontrack = (ev) => {
          if (ev.streams[0]) setRemoteStream(ev.streams[0]);
        };
        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            void sendSignal("call_signal", { ice: ev.candidate }, rId, cId);
          }
        };

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal("call_signal", { sdp: offer }, rId, cId);
        }
      } catch (err) {
        console.error("WebRTC Init Error:", err);
        endCallInternal();
      }
    },
    [sendSignal]
  );

  function endCallInternal() {
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallType(null);
    setCallPeer(null);
    setIncomingCall(null);
    setMicMuted(false);
    setCamOff(false);
    pcRef.current?.close();
    pcRef.current = null;
    iceQueueRef.current = [];
    routeRef.current = {};
    callingToneRef.current?.pause();
    ringtoneRef.current?.pause();
  }

  const endCall = useCallback(() => {
    endCallInternal();
  }, [localStream]);

  const startCall = useCallback(
    async (type: "audio" | "video", rId?: string, cId?: string, peer?: CallPeer) => {
      setCallType(type);
      setCallPeer(peer ?? null);
      iceQueueRef.current = [];
      routeRef.current = { roomId: rId, convId: cId };
      await sendSignal("call_start", type, rId, cId);
      await initWebRTC(type, true, rId, cId);
    },
    [initWebRTC, sendSignal]
  );

  useEffect(() => {
    if (!userId || !communityId) return;

    const ch = supabase
      .channel(`community_calls:${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
          filter: `community_id=eq.${communityId}`,
        },
        async (payload: { new: Record<string, unknown> }) => {
          if (payload.new.message_type === "call_start" && payload.new.sender_id !== userId) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, username")
              .eq("id", payload.new.sender_id as string)
              .single();
            setIncomingCall({
              type: payload.new.body === "video" ? "video" : "audio",
              sender: prof ?? { name: "Someone" },
              roomId: payload.new.room_id as string | undefined,
            });
          } else if (
            payload.new.message_type === "call_signal" &&
            payload.new.sender_id !== userId
          ) {
            void handleCallSignal(JSON.parse(String(payload.new.body)));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_inbox_messages" },
        async (payload: { new: Record<string, unknown> }) => {
          const { data: conv } = await supabase
            .from("community_inbox_conversations")
            .select("user_low, user_high")
            .eq("id", payload.new.conversation_id as string)
            .single();

          if (
            conv &&
            (conv.user_low === userId || conv.user_high === userId) &&
            payload.new.message_type === "call_start" &&
            payload.new.sender_id !== userId
          ) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, username")
              .eq("id", payload.new.sender_id as string)
              .single();
            setIncomingCall({
              type: payload.new.body === "video" ? "video" : "audio",
              sender: prof ?? { name: "Someone" },
              convId: payload.new.conversation_id as string,
            });
          } else if (
            conv &&
            (conv.user_low === userId || conv.user_high === userId) &&
            payload.new.message_type === "call_signal" &&
            payload.new.sender_id !== userId
          ) {
            void handleCallSignal(JSON.parse(String(payload.new.body)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, communityId, handleCallSignal, supabase]);

  const toggleMic = () => {
    const next = !micMuted;
    setMicMuted(next);
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  };

  const toggleCam = () => {
    const next = !camOff;
    setCamOff(next);
    localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !next;
    });
  };

  const statusLabel =
    callPhase === "connected"
      ? "Connected"
      : incomingCall
        ? "Incoming call…"
        : "Calling…";

  return (
    <CallContext.Provider
      value={{
        callType,
        setCallType,
        incomingCall,
        setIncomingCall,
        startCall,
        endCall,
        localStream,
        remoteStream,
        pcRef,
        iceQueueRef,
      }}
    >
      {children}

      {incomingCall && !callType && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#111827]/95 p-6">
          <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-neutral-200/10 bg-white p-8 shadow-xl">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-3xl font-bold text-neutral-700">
              {displayPeer?.avatar ? (
                <img src={displayPeer.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{displayPeer?.name?.[0] ?? "?"}</span>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-[#111827]">{displayPeer?.name}</h3>
              <p className="mt-1 text-sm font-medium uppercase tracking-wide text-[#FF5A1F]">
                Incoming {incomingCall.type} call
              </p>
            </div>
            <div className="flex items-center gap-10">
              <button
                type="button"
                onClick={() => {
                  endCall();
                  setIncomingCall(null);
                }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                aria-label="Decline call"
              >
                <X className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const type = incomingCall.type;
                  const rId = incomingCall.roomId;
                  const cId = incomingCall.convId;
                  setCallPeer({
                    name:
                      incomingCall.sender?.full_name ||
                      incomingCall.sender?.username ||
                      "Someone",
                    avatar: incomingCall.sender?.avatar_url,
                  });
                  setIncomingCall(null);
                  setCallType(type);
                  routeRef.current = { roomId: rId, convId: cId };
                  void initWebRTC(type, false, rId, cId);
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF5A1F] text-white hover:bg-[#e04f1a]"
                aria-label="Accept call"
              >
                {incomingCall.type === "audio" ? (
                  <Phone className="h-7 w-7" />
                ) : (
                  <Video className="h-7 w-7" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {callType && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-[#111827] text-white">
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-12">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-800 ring-2 ring-white/10">
                {displayPeer?.avatar ? (
                  <img src={displayPeer.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold">{displayPeer?.name?.[0] ?? "?"}</span>
                )}
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {displayPeer?.name ?? "Community call"}
              </h2>
              <p className="text-sm text-neutral-400">
                {callType === "video" ? "Video call" : "Voice call"} · {statusLabel}
              </p>
              {callType === "audio" && (
                <VoiceVisualizer stream={localStream} />
              )}
            </div>

            <div
              className={cn(
                "relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-900",
                callType === "video" ? "aspect-video" : "h-48"
              )}
            >
              {callType === "video" && remoteStream && (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              )}
              {callType === "video" && localStream && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "absolute rounded-xl border border-white/20 bg-black object-cover",
                    remoteStream
                      ? "bottom-4 right-4 h-28 w-20"
                      : "inset-0 h-full w-full"
                  )}
                />
              )}
              {callPhase !== "connected" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900/80">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-[#FF5A1F]/20 ring-4 ring-[#FF5A1F]/30" />
                  <p className="text-sm text-neutral-300">Connecting…</p>
                </div>
              )}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 border-t border-white/10 bg-[#111827]/95 px-6 py-6">
            <button
              type="button"
              onClick={toggleMic}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                micMuted ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white"
              )}
              aria-label={micMuted ? "Unmute" : "Mute"}
            >
              {micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {callType === "video" && (
              <button
                type="button"
                onClick={toggleCam}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  camOff ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white"
                )}
                aria-label={camOff ? "Turn camera on" : "Turn camera off"}
              >
                {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
            )}
            <button
              type="button"
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
              aria-label="End call"
            >
              <Phone className="h-6 w-6 rotate-[135deg]" />
            </button>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}
