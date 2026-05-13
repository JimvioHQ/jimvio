import { cn } from "@/lib/utils";
import { ActiveConvPeer } from "@/types";
import { Phone, Video } from "lucide-react";
import { useEffect, useRef } from "react";

interface CallOverlayProps {
  callType: "audio" | "video";
  roomName: string;
  activeConvPeer: ActiveConvPeer | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
}

export function CallOverlay({
  callType,
  roomName,
  activeConvPeer,
  localStream,
  remoteStream,
  onEndCall,
}: CallOverlayProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream)
      localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream)
      remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0b141a] text-white">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">
        <div className="h-[110px] w-[110px] rounded-full flex items-center justify-center bg-[#233138] text-[38px] overflow-hidden">
          {activeConvPeer?.avatar ? (
            <img src={activeConvPeer.avatar} className="w-full h-full object-cover" alt="" />
          ) : (
            <span>{(activeConvPeer?.name || roomName)[0]}</span>
          )}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold">{activeConvPeer?.name || roomName}</h2>
          <p className="text-[#8696a0] mt-1">
            {callType === "video" ? "Video calling…" : "Audio calling…"}
          </p>
        </div>
        <div className="w-full h-72 bg-[#233138] rounded-xl overflow-hidden relative border border-white/10">
          {remoteStream && (
            <video
              autoPlay
              playsInline
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
            />
          )}
          {localStream && (
            <video
              autoPlay
              playsInline
              muted
              ref={localVideoRef}
              className={cn(
                "absolute bottom-3 right-3 w-24 h-36 bg-black rounded-lg border border-white/20 object-cover",
                !remoteStream && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-56"
              )}
            />
          )}
          {!remoteStream && !localStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center animate-pulse bg-[#00a884]">
                {callType === "video" ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
              </div>
              <p className="text-sm text-white/70">Connecting…</p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <button
            onClick={onEndCall}
            aria-label="End call"
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all"
          >
            <Phone className="h-8 w-8 rotate-[135deg]" />
          </button>
        </div>
      </div>
    </div>
  );
}