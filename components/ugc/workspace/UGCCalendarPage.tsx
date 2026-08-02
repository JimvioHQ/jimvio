"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, List } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type CalendarEvent = {
  id: string;
  title: string;
  type?: string;
  date: string;
  campaign_id?: string | null;
  description?: string | null;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function sameDay(a: string, day: Date) {
  const d = new Date(a);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

export function UGCCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "list">("month");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/calendar", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setEvents(json.data ?? json.events ?? []);
    } catch {
      setError("Could not load calendar events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const totalDays = daysInMonth(cursor);
  const offset = startOfMonth(cursor).getDay();

  const monthEvents = useMemo(() => {
    return events.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    });
  }, [events, cursor]);

  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events],
  );

  return (
    <UGCPageShell
      title="Calendar"
      subtitle="Deadlines, submissions, payouts, and invitations in one view."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("month")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold",
              view === "month"
                ? "border-[#FF5A1F] bg-[#FFF4EF] text-[#FF5A1F]"
                : "border-[#E5E7EB] text-[#374151]",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Month
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold",
              view === "list"
                ? "border-[#FF5A1F] bg-[#FFF4EF] text-[#FF5A1F]"
                : "border-[#E5E7EB] text-[#374151]",
            )}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      }
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}

      {!loading && !error && events.length === 0 ? (
        <UGCPageEmpty
          title="No upcoming events"
          description="Join campaigns to see deadlines and payout dates here."
          illustration="campaigns"
        />
      ) : null}

      {!loading && !error && events.length > 0 && view === "month" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-[16px] border border-[#EEF0F2] bg-white p-3">
            <button
              type="button"
              className="rounded-xl border border-[#E5E7EB] px-3 py-1.5 text-sm font-semibold"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
              }
            >
              Prev
            </button>
            <p className="text-[14px] font-bold text-[#111827]">{monthLabel}</p>
            <button
              type="button"
              className="rounded-xl border border-[#E5E7EB] px-3 py-1.5 text-sm font-semibold"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
              }
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 rounded-[16px] border border-[#EEF0F2] bg-white p-2 sm:p-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-bold uppercase text-[#9CA3AF]">
                {d}
              </div>
            ))}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[64px] rounded-lg bg-[#FAFAFA]" />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = new Date(cursor.getFullYear(), cursor.getMonth(), i + 1);
              const dayEvents = monthEvents.filter((e) => sameDay(e.date, day));
              return (
                <div
                  key={day.toISOString()}
                  className="min-h-[64px] rounded-lg border border-[#F3F4F6] p-1.5"
                >
                  <p className="text-[11px] font-bold text-[#374151]">{i + 1}</p>
                  {dayEvents.slice(0, 2).map((e) => (
                    <p
                      key={e.id}
                      className="mt-0.5 truncate rounded bg-[#FFF4EF] px-1 text-[9px] font-semibold text-[#FF5A1F]"
                      title={e.title}
                    >
                      {e.title}
                    </p>
                  ))}
                  {dayEvents.length > 2 ? (
                    <p className="mt-0.5 text-[9px] text-[#9CA3AF]">+{dayEvents.length - 2}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {!loading && !error && events.length > 0 && view === "list" ? (
        <div className="space-y-3">
          {sorted.map((e) => (
            <div
              key={e.id}
              className="rounded-[16px] border border-[#EEF0F2] bg-white p-4"
            >
              <p className="text-[11px] font-semibold uppercase text-[#FF5A1F]">
                {e.type ?? "event"} · {new Date(e.date).toLocaleString()}
              </p>
              {e.campaign_id ? (
                <Link
                  href={`/ugc/${e.campaign_id}`}
                  className="mt-1 block text-[14px] font-bold text-[#111827] hover:text-[#FF5A1F]"
                >
                  {e.title}
                </Link>
              ) : (
                <p className="mt-1 text-[14px] font-bold text-[#111827]">{e.title}</p>
              )}
              {e.description ? (
                <p className="mt-1 text-[13px] text-[#6B7280]">{e.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
