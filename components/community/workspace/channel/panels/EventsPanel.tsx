"use client";

import { Calendar } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";
import { EventCard } from "@/components/community/os/TaskEventCards";
import {
  createEventFromDraft,
  useCreatorOSStore,
} from "@/lib/community/os";
import { toast } from "sonner";

/** Channel Events — RSVP cards, speakers, recording placeholder. */
export function EventsPanel({
  channelName,
  roomId,
  communityId,
  userId,
  canManage,
}: {
  channelName?: string;
  roomId?: string;
  communityId?: string | null;
  userId?: string | null;
  canManage?: boolean;
}) {
  const events = useCreatorOSStore((s) =>
    roomId ? s.events.filter((e) => e.roomId === roomId) : []
  );
  const addEvent = useCreatorOSStore((s) => s.addEvent);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {canManage && roomId && (
        <div className="shrink-0 border-b border-[var(--color-border)] px-3 py-2">
          <button
            type="button"
            onClick={() => {
              const title = window.prompt("Event title");
              if (!title?.trim()) return;
              addEvent(
                createEventFromDraft({
                  title: title.trim(),
                  description: channelName
                    ? `Event in #${channelName}`
                    : undefined,
                  startsAt: new Date(Date.now() + 86400000).toISOString(),
                  communityId,
                  roomId,
                  createdBy: userId ?? null,
                  speakers: [],
                })
              );
              toast.success("Event scheduled");
            }}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            + Schedule event
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {events.length === 0 ? (
          <ChannelEmptyState
            icon={Calendar}
            title="Events"
            description={
              channelName
                ? `Upcoming events for #${channelName} — workshops, AMAs, RSVP, speakers, and recordings.`
                : "Upcoming channel events with calendar, RSVP, and speakers."
            }
            className="py-10"
          />
        ) : (
          events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              userId={userId}
              canManage={canManage}
            />
          ))
        )}
      </div>
    </div>
  );
}
