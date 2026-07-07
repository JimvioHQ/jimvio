"use client";

import Link from "next/link";
import { CalendarDays, Megaphone, Radio, Users, BookOpen } from "lucide-react";
import type { CommandCenterCalendarEvent } from "@/lib/creator-command-center/types";

const KIND_META = {
  campaign: { icon: Megaphone, label: "Campaign" },
  live: { icon: Radio, label: "Live" },
  community: { icon: Users, label: "Community" },
  course: { icon: BookOpen, label: "Course" },
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function CommandCenterCalendar({ events }: { events: CommandCenterCalendarEvent[] }) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const totalDays = daysInMonth(now);
  const startWeekday = monthStart.getDay();
  const cells = Array.from({ length: startWeekday + totalDays }, (_, i) =>
    i < startWeekday ? null : i - startWeekday + 1,
  );

  const eventDays = new Set(
    events.map((e) => new Date(e.date).getDate()).filter((d) => d > 0),
  );

  const upcoming = [...events]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="size-4 text-[var(--color-accent)]" />
          <p className="text-sm font-bold text-[var(--color-text-primary)]">
            {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[var(--color-text-muted)]">
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, index) => (
            <div
              key={`day-${index}`}
              className="flex aspect-square items-center justify-center rounded-md text-[11px]"
            >
              {day ? (
                <span
                  className={
                    day === now.getDate()
                      ? "grid size-7 place-items-center rounded-full bg-[var(--color-accent)] font-bold text-white"
                      : eventDays.has(day)
                        ? "grid size-7 place-items-center rounded-full bg-[var(--color-accent)]/15 font-semibold text-[var(--color-accent)]"
                        : "text-[var(--color-text-secondary)]"
                  }
                >
                  {day}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Upcoming
        </p>
        {upcoming.map((event) => {
          const meta = KIND_META[event.kind];
          const Icon = meta.icon;
          const row = (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-accent)]">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                  {event.title}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {new Date(event.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {meta.label}
                </span>
              </span>
            </div>
          );
          return event.href ? (
            <Link key={event.id} href={event.href}>
              {row}
            </Link>
          ) : (
            <div key={event.id}>{row}</div>
          );
        })}
      </div>
    </div>
  );
}
