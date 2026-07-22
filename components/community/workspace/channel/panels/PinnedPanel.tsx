"use client";

import { Pin } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";

/** Phase 1 placeholder — reusable pinned message system. */
export function PinnedPanel({ pinnedCount = 0 }: { pinnedCount?: number }) {
  return (
    <ChannelEmptyState
      icon={Pin}
      title={pinnedCount > 0 ? `${pinnedCount} pinned` : "Pinned"}
      description="Important messages pinned by moderators will show up here for quick access."
    />
  );
}
