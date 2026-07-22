"use client";

import { ImageIcon } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";

/** Phase 1 placeholder — Media gallery architecture. */
export function MediaPanel() {
  return (
    <ChannelEmptyState
      icon={ImageIcon}
      title="Media"
      description="Photos, clips, and embeds shared in this channel will appear in a gallery here."
    />
  );
}
