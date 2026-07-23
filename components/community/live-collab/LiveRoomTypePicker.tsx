"use client";

import {
  LIVE_ROOM_TYPES,
  LIVE_ROOM_TYPE_LABELS,
  useLiveCollabStore,
  type LiveRoomType,
} from "@/lib/community/live-collab";
import { cn } from "@/lib/utils";

export function LiveRoomTypePicker({
  sessionId,
  canManage,
}: {
  sessionId: string;
  canManage?: boolean;
}) {
  const roomType =
    useLiveCollabStore((s) => s.roomTypeBySession[sessionId]) ?? "stage";
  const setRoomType = useLiveCollabStore((s) => s.setRoomType);

  return (
    <div className="px-3 py-2">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        Live room type
      </p>
      <div className="flex flex-wrap gap-1">
        {LIVE_ROOM_TYPES.map((t: LiveRoomType) => (
          <button
            key={t}
            type="button"
            disabled={!canManage}
            onClick={() => setRoomType(sessionId, t)}
            className={cn(
              "rounded-full px-2 py-1 text-[10px] font-semibold",
              roomType === t
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              !canManage && "opacity-70"
            )}
          >
            {LIVE_ROOM_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
