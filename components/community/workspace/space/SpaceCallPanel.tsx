"use client";

import { Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact floating communication panel for Space discussion.
 * Sits below About / tabs and above the chat timeline.
 */
export function SpaceCallPanel({
  onAudioCall,
  onVideoCall,
  className,
}: {
  onAudioCall: () => void;
  onVideoCall: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-gray-100 bg-white px-4 py-3 sm:px-6",
        className
      )}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-[#fafafa] p-1.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <button
          type="button"
          onClick={onAudioCall}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 text-[13px] font-semibold text-gray-800 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
        >
          <Phone className="h-4 w-4 text-[#fd5000]" aria-hidden />
          Audio Call
        </button>
        <button
          type="button"
          onClick={onVideoCall}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 text-[13px] font-semibold text-gray-800 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
        >
          <Video className="h-4 w-4 text-[#fd5000]" aria-hidden />
          Video Call
        </button>
      </div>
    </div>
  );
}
