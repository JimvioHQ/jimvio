"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/context/LocaleContext";
import {
  calendarEventMatchesFilter,
  calendarEventTypeKey,
  calendarFilterKey,
  calendarListGroupKey,
  formatCalendarDayHeading,
  formatEventDate,
  localDateKey,
  localeToBcp47,
  monthOffset,
  parseCalendarDate,
  startOfLocalMonth,
  upcomingListGroup,
  weekdayLabels,
  weekStartForLocale,
  UGC_CALENDAR_FILTERS,
  type UgcCalendarEvent,
  type UgcCalendarFilter,
  type UgcCalendarListGroupId,
} from "@/lib/ugc/calendar";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "./UGCPageShell";

const LIST_GROUP_ORDER: UgcCalendarListGroupId[] = [
  "today",
  "tomorrow",
  "thisWeek",
  "later",
];

function ToggleButton({
  pressed,
  onClick,
  children,
  ariaLabel,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
        pressed
          ? "border-[#FF5A1F] bg-[#FFF4EF] text-[#FF5A1F]"
          : "border-[#E5E7EB] text-[#374151]",
      )}
    >
      {children}
    </button>
  );
}

function EventLink({
  event,
  compact,
  typeLabel,
}: {
  event: UgcCalendarEvent;
  compact?: boolean;
  typeLabel: string;
}) {
  return (
    <Link
      href={event.href}
      className={cn(
        "block truncate rounded font-semibold text-[#FF5A1F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
        compact
          ? "mt-0.5 bg-[#FFF4EF] px-1 text-[9px] leading-4 sm:text-[10px]"
          : "text-[14px]",
      )}
      title={`${typeLabel}${event.title ? ` · ${event.title}` : ""}`}
    >
      {compact ? typeLabel : event.title || typeLabel}
    </Link>
  );
}

export function UGCCalendarPage() {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const [events, setEvents] = useState<UgcCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [view, setView] = useState<"month" | "list">("month");
  const [filter, setFilter] = useState<UgcCalendarFilter>("all");
  const [cursor, setCursor] = useState(() => startOfLocalMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/calendar", { cache: "no-store" });
      if (res.status === 401) {
        setError("sign_in");
        setEvents([]);
        setNeedsProfile(false);
        return;
      }
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      if (json.needsProfile === true) {
        setNeedsProfile(true);
        setMissingFields(
          Array.isArray(json.missing)
            ? (json.missing as Array<{ label?: string }>)
                .map((m) => m.label)
                .filter((label): label is string => Boolean(label))
            : [],
        );
        setEvents([]);
        return;
      }
      setNeedsProfile(false);
      setMissingFields([]);
      setEvents(Array.isArray(json.data) ? json.data : []);
    } catch {
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setSelectedKey((current) => (current ? null : current));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const weekStart = weekStartForLocale(locale);
  const weekdays = useMemo(
    () => weekdayLabels(locale, weekStart),
    [locale, weekStart],
  );
  const filtered = useMemo(
    () => events.filter((e) => calendarEventMatchesFilter(e.type, filter)),
    [events, filter],
  );

  const upcomingAll = useMemo(() => {
    const today = localDateKey(new Date());
    return events.filter((e) => {
      const d = parseCalendarDate(e.date);
      return d ? localDateKey(d) >= today : false;
    });
  }, [events]);

  const upcomingFiltered = useMemo(() => {
    const today = localDateKey(new Date());
    return filtered.filter((e) => {
      const d = parseCalendarDate(e.date);
      return d ? localDateKey(d) >= today : false;
    });
  }, [filtered]);

  const monthEvents = useMemo(() => {
    return filtered.filter((e) => {
      const d = parseCalendarDate(e.date);
      return (
        d != null &&
        d.getFullYear() === cursor.getFullYear() &&
        d.getMonth() === cursor.getMonth()
      );
    });
  }, [filtered, cursor]);

  const listGroups = useMemo(() => {
    const buckets: Record<UgcCalendarListGroupId, UgcCalendarEvent[]> = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
    };
    const now = new Date();
    const sorted = [...upcomingFiltered].sort(
      (a, b) => Date.parse(a.date) - Date.parse(b.date),
    );
    for (const event of sorted) {
      const d = parseCalendarDate(event.date);
      if (!d) continue;
      const group = upcomingListGroup(d, now, weekStart);
      if (!group) continue;
      buckets[group].push(event);
    }
    return buckets;
  }, [upcomingFiltered, weekStart]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const offset = monthOffset(year, month, weekStart);
  const monthLabel = new Intl.DateTimeFormat(localeToBcp47(locale), {
    month: "long",
    year: "numeric",
  }).format(cursor);

  const todayKey = localDateKey(new Date());
  const selectedDate = selectedKey
    ? parseCalendarDate(selectedKey)
    : null;
  const selectedEvents = useMemo(() => {
    if (!selectedKey) return [];
    return monthEvents.filter((e) => {
      const d = parseCalendarDate(e.date);
      return d ? localDateKey(d) === selectedKey : false;
    });
  }, [monthEvents, selectedKey]);

  const gridCells = useMemo(() => {
    const cells: Array<{ type: "pad"; key: string } | { type: "day"; day: number }> =
      [];
    for (let i = 0; i < offset; i += 1) {
      cells.push({ type: "pad", key: `lead-${i}` });
    }
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push({ type: "day", day });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ type: "pad", key: `trail-${cells.length}` });
    }
    const rows: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [offset, totalDays]);

  const goMonth = useCallback((delta: number) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }, []);

  const goToday = useCallback(() => {
    const today = new Date();
    setCursor(startOfLocalMonth(today));
    setSelectedKey(localDateKey(today));
  }, []);

  function onDayKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, day: number) {
    let nextDay = day;
    if (event.key === "ArrowRight") nextDay = day + 1;
    else if (event.key === "ArrowLeft") nextDay = day - 1;
    else if (event.key === "ArrowDown") nextDay = day + 7;
    else if (event.key === "ArrowUp") nextDay = day - 7;
    else if (event.key === "Home") nextDay = 1;
    else if (event.key === "End") nextDay = totalDays;
    else if (event.key === "PageUp") {
      event.preventDefault();
      goMonth(-1);
      return;
    } else if (event.key === "PageDown") {
      event.preventDefault();
      goMonth(1);
      return;
    } else {
      return;
    }
    event.preventDefault();
    if (nextDay < 1) {
      goMonth(-1);
      return;
    }
    if (nextDay > totalDays) {
      goMonth(1);
      return;
    }
    const node = document.querySelector<HTMLButtonElement>(
      `[data-calendar-day="${year}-${month}-${nextDay}"]`,
    );
    node?.focus();
  }

  const incompleteProfileDesc =
    missingFields.length > 0
      ? `${t("noApplicationsUnlockDesc")} ${t("completeRemainingIdentity", { fields: missingFields.join(", ") })}`
      : t("noApplicationsUnlockDesc");

  const showChrome = !loading && !error && !needsProfile;
  const showFullEmpty = showChrome && upcomingAll.length === 0;
  const showCalendar = showChrome && upcomingAll.length > 0;

  return (
    <UGCPageShell
      titleKey="calendar"
      subtitleKey="calendarSubtitle"
      actions={
        loading || error === "sign_in" ? undefined : needsProfile ? (
          <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
            <Link href="/identity/edit" aria-label={t("createCreatorProfile")}>
              {t("createCreatorProfile")}
            </Link>
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <ToggleButton
              pressed={view === "month"}
              onClick={() => setView("month")}
              ariaLabel={t("calendarMonth")}
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              {t("calendarMonth")}
            </ToggleButton>
            <ToggleButton
              pressed={view === "list"}
              onClick={() => setView("list")}
              ariaLabel={t("calendarList")}
            >
              <List className="h-4 w-4" aria-hidden />
              {t("calendarList")}
            </ToggleButton>
          </div>
        )
      }
    >
      {loading ? <UGCPageLoading /> : null}

      {!loading && error === "sign_in" ? (
        <UGCPageEmpty
          title={t("signInRequired")}
          description={t("signInToViewCalendar")}
          illustration="lock"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/login?redirect=/ugc/calendar" aria-label={t("signIn")}>
                {t("signIn")}
              </Link>
            </Button>
          }
        />
      ) : null}

      {!loading && error === "load_failed" ? (
        <UGCPageError message={t("calendarLoadFailed")} onRetry={load} />
      ) : null}

      {!loading && !error && needsProfile ? (
        <UGCPageEmpty
          title={t("noUpcomingEvents")}
          description={incompleteProfileDesc}
          illustration="profile"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/identity/edit" aria-label={t("createCreatorProfile")}>
                {t("createCreatorProfile")}
              </Link>
            </Button>
          }
        />
      ) : null}

      {showFullEmpty ? (
        <UGCPageEmpty
          title={t("noUpcomingEvents")}
          description={t("noUpcomingEventsDesc")}
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc" aria-label={t("discoverCampaignsCta")}>
                {t("discoverCampaignsCta")}
              </Link>
            </Button>
          }
        />
      ) : null}

      {showCalendar ? (
        <div className="min-w-0 space-y-3">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t("calendarFiltersLabel")}
          >
            {UGC_CALENDAR_FILTERS.map((id) => (
              <ToggleButton
                key={id}
                pressed={filter === id}
                onClick={() => setFilter(id)}
                ariaLabel={t(calendarFilterKey(id))}
              >
                {t(calendarFilterKey(id))}
              </ToggleButton>
            ))}
          </div>

          {upcomingFiltered.length === 0 ? (
            <UGCPageEmpty
              title={t("noUpcomingEvents")}
              description={t("calendarFilterEmpty")}
              illustration="campaigns"
            />
          ) : null}

          {upcomingFiltered.length > 0 && view === "month" ? (
            <div className="min-w-0 space-y-3">
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-[#EEF0F2] bg-white p-3"
                role="toolbar"
                aria-label={t("calendarNavLabel")}
              >
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E5E7EB] px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
                    aria-label={t("calendarPrev")}
                    onClick={() => goMonth(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E5E7EB] px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
                    aria-label={t("calendarToday")}
                    onClick={goToday}
                  >
                    {t("calendarToday")}
                  </button>
                </div>
                <h2 className="min-w-0 flex-1 text-center text-[14px] font-bold text-[#111827]">
                  {monthLabel}
                </h2>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E5E7EB] px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
                  aria-label={t("calendarNext")}
                  onClick={() => goMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div
                className="min-w-0 overflow-hidden rounded-[16px] border border-[#EEF0F2] bg-white p-2 sm:p-3"
                role="grid"
                aria-label={t("calendarGridLabel")}
              >
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1" role="row">
                  {weekdays.map((label, index) => (
                    <div
                      key={`${index}-${label}`}
                      role="columnheader"
                      className="py-1 text-center text-[10px] font-bold uppercase text-[#9CA3AF]"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                {gridCells.map((row, rowIndex) => (
                  <div
                    key={`week-${rowIndex}`}
                    className="mt-0.5 grid grid-cols-7 gap-0.5 sm:mt-1 sm:gap-1"
                    role="row"
                  >
                    {row.map((cell) => {
                      if (cell.type === "pad") {
                        return (
                          <div
                            key={cell.key}
                            role="gridcell"
                            aria-hidden
                            className="min-h-11 rounded-lg bg-[#FAFAFA] sm:min-h-[72px]"
                          />
                        );
                      }
                      const dayDate = new Date(year, month, cell.day);
                      const key = localDateKey(dayDate);
                      const dayEvents = monthEvents.filter((e) => {
                        const d = parseCalendarDate(e.date);
                        return d ? localDateKey(d) === key : false;
                      });
                      const isToday = key === todayKey;
                      const isSelected = key === selectedKey;
                      const heading = formatCalendarDayHeading(dayDate, locale);
                      const maxVisible = 2;
                      return (
                        <div
                          key={key}
                          role="gridcell"
                          className={cn(
                            "min-h-11 min-w-0 rounded-lg border p-1 sm:min-h-[72px] sm:p-1.5",
                            isToday
                              ? "border-[#FF5A1F] bg-[#FFF4EF]"
                              : "border-[#F3F4F6]",
                            isSelected ? "ring-2 ring-[#FF5A1F] ring-offset-1" : "",
                          )}
                        >
                          <button
                            type="button"
                            data-calendar-day={`${year}-${month}-${cell.day}`}
                            aria-label={t("calendarDayAria", {
                              date: heading,
                              count: dayEvents.length,
                            })}
                            aria-pressed={isSelected}
                            aria-current={isToday ? "date" : undefined}
                            className="flex min-h-7 w-full items-center justify-center rounded text-[11px] font-bold text-[#374151] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] sm:justify-start"
                            onClick={() =>
                              setSelectedKey((current) => (current === key ? null : key))
                            }
                            onKeyDown={(e) => onDayKeyDown(e, cell.day)}
                          >
                            {cell.day}
                          </button>
                          <div className="hidden sm:block">
                            {dayEvents.slice(0, maxVisible).map((e) => (
                              <EventLink
                                key={e.id}
                                event={e}
                                compact
                                typeLabel={t(calendarEventTypeKey(e.type))}
                              />
                            ))}
                            {dayEvents.length > maxVisible ? (
                              <button
                                type="button"
                                className="mt-0.5 w-full truncate text-left text-[9px] font-semibold text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                                onClick={() => setSelectedKey(key)}
                              >
                                {t("calendarMoreEvents", {
                                  count: dayEvents.length - maxVisible,
                                })}
                              </button>
                            ) : null}
                          </div>
                          {dayEvents.length > 0 ? (
                            <p className="mt-0.5 text-center text-[9px] font-semibold text-[#FF5A1F] sm:hidden">
                              {dayEvents.length}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {selectedDate ? (
                <section
                  className="rounded-[16px] border border-[#EEF0F2] bg-white p-4"
                  aria-label={t("calendarDayHeading", {
                    date: formatCalendarDayHeading(selectedDate, locale),
                  })}
                >
                  <h3 className="text-[13px] font-bold text-[#111827]">
                    {t("calendarDayHeading", {
                      date: formatCalendarDayHeading(selectedDate, locale),
                    })}
                  </h3>
                  {selectedEvents.length === 0 ? (
                    <p className="mt-2 text-[13px] text-[#6B7280]">
                      {t("calendarNoEventsOnDay")}
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {selectedEvents.map((event) => (
                        <li key={event.id}>
                          <EventRow event={event} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
            </div>
          ) : null}

          {upcomingFiltered.length > 0 && view === "list" ? (
            <div className="space-y-5">
              {LIST_GROUP_ORDER.map((groupId) => {
                const items = listGroups[groupId];
                if (items.length === 0) return null;
                return (
                  <section key={groupId} className="space-y-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                      {t(calendarListGroupKey(groupId))}
                    </h2>
                    <ul className="space-y-3">
                      {items.map((event) => (
                        <li key={event.id}>
                          <EventRow event={event} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </UGCPageShell>
  );
}

function EventRow({ event }: { event: UgcCalendarEvent }) {
  const { t, locale } = useLocale();
  const typeLabel = t(calendarEventTypeKey(event.type));
  const when = formatEventDate(event.date, locale);
  return (
    <article className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase text-[#FF5A1F]">{typeLabel}</p>
      <Link
        href={event.href}
        className="mt-1 block text-[14px] font-bold text-[#111827] hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
      >
        {event.title || typeLabel}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {when ? (
          <p className="text-[12px] text-[#6B7280]">
            {when.date}
            {when.time ? ` · ${when.time}` : ""}
          </p>
        ) : null}
        {event.status ? <UGCStatusPill status={event.status} /> : null}
      </div>
    </article>
  );
}
