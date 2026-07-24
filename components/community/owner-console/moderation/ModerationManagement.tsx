"use client";

import { useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasCapability } from "@/lib/community/workspace/permissions";
import {
  QUEUE_LABELS,
  type ModerationQueueId,
} from "@/lib/community/owner-console/moderation";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import { ModerationQueue } from "./ModerationQueue";
import { ReportDetailPanel } from "./ReportDetailPanel";
import {
  AppealsPanel,
  AuditTimeline,
  AutoModPanel,
  ModeratedMembersPanel,
  ModerationAnalyticsPanel,
} from "./ModerationPanels";
import { useOwnerModeration } from "./useOwnerModeration";

const QUEUE_TABS: ModerationQueueId[] = [
  "reports",
  "messages",
  "posts",
  "files",
  "spam",
  "scam",
  "appeals",
  "muted",
  "suspended",
  "banned",
  "automod",
  "audit",
];

export function ModerationManagement() {
  const { community, role } = useOwnerConsole();
  const canView = hasCapability(role, "moderation.view");
  const canManage = hasCapability(role, "moderation.manage");
  const [showAnalytics, setShowAnalytics] = useState(false);

  const {
    overview,
    filteredReports,
    selectedReport,
    setSelectedReport,
    reportHistory,
    appeals,
    rules,
    members,
    audit,
    analytics,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    riskFilter,
    setRiskFilter,
    queue,
    setQueue,
    selectedIds,
    toggleSelect,
    clearSelection,
    auditSearch,
    setAuditSearch,
    loadAnalytics,
    openReport,
    runAction,
    bulkAction,
    seedRules,
    toggleRule,
    updateAppeal,
  } = useOwnerModeration(community?.id ?? null);

  useEffect(() => {
    if (showAnalytics) void loadAnalytics();
  }, [showAnalytics, loadAnalytics]);

  if (!community) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Select a community to open Moderation.
      </p>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Moderation requires staff access
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Your current role ({role}) does not include moderation.view.
        </p>
      </div>
    );
  }

  const contentQueue = [
    "reports",
    "messages",
    "posts",
    "files",
    "spam",
    "scam",
  ].includes(queue);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Stat label="Open reports" value={overview.openReports} />
        <Stat label="Spam" value={overview.spam} />
        <Stat label="Scam" value={overview.scam} />
        <Stat label="Appeals" value={overview.appeals} />
        <Stat label="Muted" value={overview.muted} />
        <Stat label="Suspended" value={overview.suspended} />
        <Stat label="Banned" value={overview.banned} />
      </div>

      <div className="flex flex-wrap gap-1.5 overflow-x-auto rounded-xl bg-[var(--color-surface-secondary)] p-1 ring-1 ring-[var(--color-border)]">
        {QUEUE_TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setQueue(id);
              setSelectedReport(null);
              setShowAnalytics(false);
            }}
            className={`h-8 shrink-0 rounded-lg px-3 text-[12px] font-semibold transition-all ${
              queue === id && !showAnalytics
                ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {QUEUE_LABELS[id]}
            {id === "reports" && overview.openReports > 0
              ? ` (${overview.openReports})`
              : ""}
            {id === "appeals" && overview.appeals > 0
              ? ` (${overview.appeals})`
              : ""}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowAnalytics(true)}
          className={`h-8 shrink-0 rounded-lg px-3 text-[12px] font-semibold transition-all ${
            showAnalytics
              ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          Analytics
        </button>
      </div>

      {showAnalytics ? (
        <ModerationAnalyticsPanel analytics={analytics} />
      ) : contentQueue ? (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reports, users, content…"
                className="h-10 pl-9"
                aria-label="Search moderation queue"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px]"
                aria-label="Filter status"
              >
                <option value="open">Open</option>
                <option value="reviewed">Reviewed</option>
                <option value="actioned">Actioned</option>
                <option value="dismissed">Dismissed</option>
                <option value="all">All</option>
              </select>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px]"
                aria-label="Filter risk"
              >
                <option value="">All risk</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              {selectedIds.length > 0 && canManage && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void bulkAction("dismiss")}
                  >
                    Bulk dismiss ({selectedIds.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void bulkAction("escalate")}
                  >
                    Bulk escalate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                </>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const ids =
                    selectedIds.length > 0
                      ? selectedIds
                      : filteredReports.map((r) => r.id);
                  void bulkAction("export", ids);
                }}
                disabled={filteredReports.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
              Loading moderation queue…
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <ModerationQueue
                reports={filteredReports}
                selectedId={selectedReport?.id ?? null}
                selectedIds={selectedIds}
                onSelect={(r) => void openReport(r)}
                onToggle={toggleSelect}
              />
              {selectedReport ? (
                <ReportDetailPanel
                  key={selectedReport.id}
                  report={selectedReport}
                  history={reportHistory}
                  canManage={canManage}
                  onAction={(action, extra) =>
                    void runAction(selectedReport.id, action, extra)
                  }
                />
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-16 text-center">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Select a report
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                      Review evidence, risk, and take moderator actions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : queue === "appeals" ? (
        <AppealsPanel
          appeals={appeals}
          canManage={canManage}
          onUpdate={(id, status) => void updateAppeal(id, status)}
        />
      ) : queue === "automod" ? (
        <AutoModPanel
          rules={rules}
          canManage={canManage}
          onSeed={() => void seedRules()}
          onToggle={(id, enabled) => void toggleRule(id, enabled)}
        />
      ) : queue === "audit" ? (
        <AuditTimeline
          entries={audit}
          search={auditSearch}
          onSearch={setAuditSearch}
        />
      ) : (
        <ModeratedMembersPanel
          members={members}
          emptyLabel={`No ${QUEUE_LABELS[queue].toLowerCase()}`}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}
