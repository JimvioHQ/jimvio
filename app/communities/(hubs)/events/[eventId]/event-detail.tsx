"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const search = useSearchParams();
  const token = search.get("token");
  const [event, setEvent] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/c/events/${params.eventId}${qs}`);
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) setError(json.error || "This event is not available.");
      else setEvent(json.event);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [params.eventId, token]);

  async function register(status: "going" | "interested") {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/c/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rsvp", eventId: params.eventId, status, token }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error || "Registration failed");
      return;
    }
    setMessage(json.rsvp?.duplicate ? "You are already registered." : "Registration updated.");
    setEvent((current) => current ? { ...current, is_going: status === "going", registration_status: status } : current);
  }

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error || !event) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-bold">Event unavailable</p>
        <p className="mt-2 text-sm text-zinc-500">{error || "You need an invitation or a published public event."}</p>
        <HubLinkButton href="/communities/events" className="mt-4">Back to events</HubLinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      {event.image_url ? <img src={event.image_url} alt="" className="h-48 w-full rounded-2xl object-cover sm:h-64" /> : null}
      <HubCard>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#fd5000]">{event.kind} · {event.format} · {event.visibility}</p>
        <h1 className="mt-1 text-2xl font-black">{event.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600"><Calendar className="h-4 w-4" /> {new Date(event.start_date).toLocaleString()} {event.timezone ? `(${event.timezone})` : ""}</p>
        <p className="mt-1 text-sm text-zinc-600">{event.location || "Location shared with registered guests"}</p>
        {event.community_name ? <p className="mt-1 text-sm">Hosted with {event.community_name}{event.host_name ? ` · ${event.host_name}` : ""}</p> : null}
        {event.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{event.description}</p> : null}
        <p className="mt-4 text-sm font-semibold">{event.attendee_count} registered{event.capacity ? ` · capacity ${event.capacity}` : ""}</p>
        <p className="text-sm">Your status: {event.registration_status || "not registered"}</p>
        {event.meeting_url ? <a className="mt-2 block text-sm text-[#fd5000]" href={event.meeting_url}>Join online</a> : null}
        {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
        {event.status === "published" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void register("going")} className="rounded-full bg-[#fd5000] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Register</button>
            <button type="button" disabled={busy} onClick={() => void register("interested")} className="rounded-full border px-4 py-2 text-sm font-semibold">Interested</button>
          </div>
        ) : (
          <p className="mt-4 text-sm">This event is {event.status}.</p>
        )}
      </HubCard>
    </div>
  );
}
