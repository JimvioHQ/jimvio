"use client";

import type { ReactNode } from "react";
import { usePresence } from "@/components/presence/PresenceProvider";

/**
 * Online dot and Live badge sit on the existing avatar without changing its size.
 * Live and online stay separate: a Live badge is only shown for an active session.
 */
export function PresenceAvatarFrame({
  userId,
  children,
  className,
}: {
  userId?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const { onlineIds, liveSessionId, openLive } = usePresence();
  const sessionId = liveSessionId(userId);
  const online = Boolean(userId && onlineIds.has(userId));

  return (
    <span className={className ? `relative inline-flex ${className}` : "relative inline-flex"}>
      {children}
      {sessionId ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void openLive(sessionId);
          }}
          className="absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2 rounded-full bg-[#E11D48] px-1.5 py-0.5 text-[8px] font-bold leading-none tracking-wide text-white shadow-sm"
          aria-label="Watch live"
        >
          LIVE
        </button>
      ) : online ? (
        <span
          className="absolute bottom-0 right-0 z-[1] h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
          aria-label="Online"
          role="img"
        />
      ) : null}
    </span>
  );
}
