"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasCapability } from "@/lib/community/workspace/permissions";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import type { CommunityEventKind } from "@/lib/community/events";

type ManageEvent = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  kind: string;
  is_published?: boolean;
  attendee_count?: number;
};

const KINDS: CommunityEventKind[] = [
  "workshop",
  "webinar",
  "ama",
  "meetup",
  "launch",
  "other",
];

export function EventsManagement() {
  const { community, role } = useOwnerConsole();
  const searchParams = useSearchParams();
  const canManage = hasCapability(role, "channel.manage");
  const [events, setEvents] = useState<ManageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    kind: "meetup" as CommunityEventKind,
    location: "",
    startsAt: "",
    endsAt: "",
    isOnline: true,
    meetingUrl: "",
  });

  const load = useCallback(async () => {
    if (!community?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/c/events?communityId=${encodeURIComponent(community.id)}&manage=1`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to load events");
      const json = (await res.json()) as { events?: ManageEvent[] };
      setEvents(json.events ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [community?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("action") === "create" && canManage) {
      setShowForm(true);
    }
  }, [searchParams, canManage]);

  const upcoming = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      ),
    [events],
  );

  async function createEvent() {
    if (!community?.id || !form.title.trim() || !form.startsAt) {
      toast.error("Title and start time are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/c/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: community.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          kind: form.kind,
          location: form.location.trim() || null,
          isOnline: form.isOnline,
          meetingUrl: form.meetingUrl.trim() || null,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success("Event scheduled");
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        kind: "meetup",
        location: "",
        startsAt: "",
        endsAt: "",
        isOnline: true,
        meetingUrl: "",
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent(eventId: string) {
    if (!window.confirm("Delete this event?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/c/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", eventId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast.success("Event deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete event");
    } finally {
      setSaving(false);
    }
  }

  if (!community) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Community not found.</p>
    );
  }

  if (!canManage) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        You do not have permission to manage events for this community.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B7280]">
          Schedule workshops, AMAs, and meetups. Events appear on the community calendar.
        </p>
        <Button
          type="button"
          size="sm"
          className="rounded-xl bg-[#FF5A1F] hover:bg-[#F04E14]"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Schedule event
        </Button>
      </div>

      {showForm ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[12px] font-semibold text-[#374151]">Title</span>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Community AMA"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[12px] font-semibold text-[#374151]">Description</span>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What members should expect"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-[#374151]">Kind</span>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    kind: e.target.value as CommunityEventKind,
                  }))
                }
                className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-[#374151]">Location</span>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder={form.isOnline ? "Online" : "Venue or city"}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-[#374151]">Starts</span>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-[#374151]">Ends (optional)</span>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[12px] font-semibold text-[#374151]">Meeting URL</span>
              <Input
                value={form.meetingUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, meetingUrl: e.target.value }))
                }
                placeholder="https://…"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              disabled={saving}
              className="rounded-xl bg-[#FF5A1F] hover:bg-[#F04E14]"
              onClick={() => void createEvent()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save event"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      ) : upcoming.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-6 py-12 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-[#D1D5DB]" />
          <p className="text-[14px] font-semibold text-[#111827]">No events yet</p>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            Schedule your first workshop, AMA, or meetup for members.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((event) => {
            const when = new Date(event.start_date);
            return (
              <li
                key={event.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                    {event.kind}
                  </p>
                  <h3 className="text-[15px] font-bold text-[#111827]">{event.title}</h3>
                  {event.description ? (
                    <p className="mt-1 text-[13px] text-[#6B7280]">{event.description}</p>
                  ) : null}
                  <p className="mt-2 text-[12px] text-[#6B7280]">
                    {when.toLocaleString()}
                    {event.location ? ` · ${event.location}` : ""}
                    {typeof event.attendee_count === "number"
                      ? ` · ${event.attendee_count} RSVPs`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void removeEvent(event.id)}
                  aria-label={`Delete ${event.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
