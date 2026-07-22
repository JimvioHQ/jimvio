"use client";

import { Calendar } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";

/**
 * Events tab — placeholder wired for channel-scoped events.
 * Reuses workspace Events architecture without duplicating calendars.
 */
export function EventsPanel({ channelName }: { channelName?: string }) {
  return (
    <ChannelEmptyState
      icon={Calendar}
      title="Events"
      description={
        channelName
          ? `Upcoming events for #${channelName} will appear here — workshops, AMAs, and launches linked to this channel.`
          : "Upcoming channel events, workshops, and AMAs will appear here."
      }
    />
  );
}
