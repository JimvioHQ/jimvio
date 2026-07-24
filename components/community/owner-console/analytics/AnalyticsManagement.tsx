"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasCapability } from "@/lib/community/workspace/permissions";
import {
  ANALYTICS_RANGES,
  ANALYTICS_SECTIONS,
  RANGE_LABELS,
  SECTION_LABELS,
  type AnalyticsSectionId,
} from "@/lib/community/owner-console/analytics";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import { useOwnerAnalytics } from "./useOwnerAnalytics";

const AnalyticsSectionBody = dynamic(
  () =>
    import("./AnalyticsSectionBody").then((m) => m.AnalyticsSectionBody),
  {
    loading: () => (
      <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        Loading module…
      </p>
    ),
    ssr: false,
  }
);

export function AnalyticsManagement() {
  const { community, role } = useOwnerConsole();
  const canView = hasCapability(role, "analytics.view");
  const canExport =
    hasCapability(role, "analytics.export") ||
    hasCapability(role, "analytics.manage");

  const {
    analytics,
    loading,
    error,
    section,
    setSection,
    range,
    setRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    groupId,
    setGroupId,
    channelId,
    setChannelId,
    role: roleFilter,
    setRole,
    groups,
    channels,
    exportReport,
  } = useOwnerAnalytics(community?.id ?? null);

  if (!community) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Select a community to view analytics.
      </p>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Analytics requires staff access
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Your current role ({role}) does not include analytics.view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {ANALYTICS_RANGES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className={`h-8 rounded-lg px-3 text-[12px] font-semibold ${
                range === id
                  ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
              }`}
            >
              {RANGE_LABELS[id]}
            </button>
          ))}
        </div>
        {canExport && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void exportReport("csv")}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void exportReport("xlsx")}
            >
              Excel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void exportReport("pdf")}
            >
              PDF
            </Button>
          </div>
        )}
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap gap-2">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-9 w-auto"
            aria-label="Custom start"
          />
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-9 w-auto"
            aria-label="Custom end"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px]"
          aria-label="Filter group"
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px]"
          aria-label="Filter channel"
        >
          <option value="">All channels</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRole(e.target.value)}
          className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px]"
          aria-label="Filter role"
        >
          <option value="">All roles</option>
          {[
            "owner",
            "admin",
            "moderator",
            "creator",
            "mentor",
            "vip",
            "member",
          ].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5 overflow-x-auto rounded-xl bg-[var(--color-surface-secondary)] p-1 ring-1 ring-[var(--color-border)]">
        {ANALYTICS_SECTIONS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`h-8 shrink-0 rounded-lg px-3 text-[12px] font-semibold transition-all ${
              section === id
                ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {SECTION_LABELS[id]}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading || !analytics ? (
        <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          Loading analytics…
        </p>
      ) : (
        <AnalyticsSectionBody
          section={section as AnalyticsSectionId}
          analytics={analytics}
        />
      )}
    </div>
  );
}
