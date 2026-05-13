import { Profile } from "@/types";
import { Phone, Video, X } from "lucide-react";

interface IncomingCallModalProps {
  incomingCall: {
    type: "audio" | "video";
    sender: Profile | null;
    roomId?: string;
    convId?: string;
  };
  onDecline: () => void;
  onAccept: () => void;
}

export function IncomingCallModal({
  incomingCall,
  onDecline,
  onAccept,
}: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-[30000] flex flex-col items-center justify-center bg-black/90 text-white">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full p-8 rounded-2xl bg-[#233138] border border-white/10">
        <div className="h-[100px] w-[100px] rounded-full flex items-center justify-center text-[30px] bg-[#00a884] text-white overflow-hidden">
          {incomingCall.sender?.avatar_url?.trim() ? (
            <img
              src={incomingCall.sender.avatar_url}
              className="w-full h-full object-cover"
              alt=""
            />
          ) : (
            <span>{incomingCall.sender?.full_name?.[0] || "I"}</span>
          )}
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold">
            {incomingCall.sender?.full_name ||
              incomingCall.sender?.username ||
              "Someone"}
          </h3>
          <p className="font-bold mt-1 uppercase tracking-widest text-[11px] text-[#00a884]">
            Incoming {incomingCall.type} Call…
          </p>
        </div>
        <div className="flex items-center gap-8 mt-4">
          <button
            aria-label="Decline call"
            onClick={onDecline}
            className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            aria-label="Accept call"
            onClick={onAccept}
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 animate-bounce bg-[#00a884]"
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
  );
}