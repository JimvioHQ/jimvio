"use client";

import { Calendar } from "lucide-react";
import { EventCard } from "@/components/community/os/TaskEventCards";
import {
  createEventFromDraft,
  useCreatorOSStore,
} from "@/lib/community/os";
import { useWorkspace } from "@/components/community/workspace-context";
import { toast } from "sonner";
import { ChannelEmptyState } from "@/components/community/workspace/channel/ChannelEmptyState";

export function EventsSection() {
  const { communityId, userId, isAdmin, isOwner } = useWorkspace();
  const events = useCreatorOSStore((s) =>
    s.events.filter((e) => e.communityId === communityId)
  );
  const addEvent = useCreatorOSStore((s) => s.addEvent);
  const canManage = isAdmin || isOwner;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">
            Events
          </h2>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Calendar · Reminder · RSVP · Speakers · Recording
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              const title = window.prompt("Event title");
              if (!title?.trim()) return;
              addEvent(
                createEventFromDraft({
                  title: title.trim(),
                  startsAt: new Date(Date.now() + 86400000).toISOString(),
                  communityId,
                  createdBy: userId,
                })
              );
              toast.success("Event created");
            }}
            className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-[12px] font-semibold text-white"
          >
            + New event
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <ChannelEmptyState
          icon={Calendar}
          title="No events yet"
          description="Community events, challenges, and live workshops with RSVP will appear here."
        />
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              userId={userId}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
