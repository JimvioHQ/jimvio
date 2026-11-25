"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  ModerationQueueId,
  OwnerAppealItem,
  OwnerAutoModRule,
  OwnerModeratedMember,
  OwnerModerationAnalytics,
  OwnerModerationLogItem,
  OwnerModerationOverview,
  OwnerReportListItem,
} from "@/lib/community/owner-console/moderation";

const EMPTY_OVERVIEW: OwnerModerationOverview = {
  openReports: 0,
  spam: 0,
  scam: 0,
  appeals: 0,
  muted: 0,
  suspended: 0,
  banned: 0,
  avgResponseHours: null,
};

async function requestModerationJson(
  url: string,
  fallbackMessage: string,
  init?: RequestInit,
): Promise<any | null> {
  try {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || fallbackMessage);
      return null;
    }
    return data;
  } catch {
    toast.error(fallbackMessage);
    return null;
  }
}

export function useOwnerModeration(communityId: string | null) {
  const [overview, setOverview] =
    useState<OwnerModerationOverview>(EMPTY_OVERVIEW);
  const [reports, setReports] = useState<OwnerReportListItem[]>([]);
  const [selectedReport, setSelectedReport] =
    useState<OwnerReportListItem | null>(null);
  const [reportHistory, setReportHistory] = useState<
    OwnerModerationLogItem[]
  >([]);
  const [appeals, setAppeals] = useState<OwnerAppealItem[]>([]);
  const [rules, setRules] = useState<OwnerAutoModRule[]>([]);
  const [members, setMembers] = useState<OwnerModeratedMember[]>([]);
  const [audit, setAudit] = useState<OwnerModerationLogItem[]>([]);
  const [analytics, setAnalytics] =
    useState<OwnerModerationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [riskFilter, setRiskFilter] = useState("");
  const [queue, setQueue] = useState<ModerationQueueId>("reports");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [auditSearch, setAuditSearch] = useState("");

  const loadQueue = useCallback(async () => {
    if (!communityId) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (["reports", "messages", "posts", "files", "spam", "scam"].includes(queue)) {
        const params = new URLSearchParams({
          communityId,
          queue,
          status: statusFilter,
          limit: "150",
        });
        if (search.trim()) params.set("q", search.trim());
        if (riskFilter) params.set("risk", riskFilter);
        const res = await fetch(`/api/c/owner/moderation?${params}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load queue");
          setReports([]);
          return;
        }
        setOverview(data.overview ?? EMPTY_OVERVIEW);
        setReports(data.reports ?? []);
      } else {
        // still refresh overview counts
        const res = await fetch(
          `/api/c/owner/moderation?communityId=${encodeURIComponent(communityId)}&queue=reports&status=open&limit=1`
        );
        const data = await res.json();
        if (res.ok) setOverview(data.overview ?? EMPTY_OVERVIEW);
      }
    } catch {
      setError("Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  }, [communityId, queue, statusFilter, riskFilter, search]);

  const loadAppeals = useCallback(async () => {
    if (!communityId) return;
    const data = await requestModerationJson(
      `/api/c/owner/moderation/appeals?communityId=${encodeURIComponent(communityId)}`,
      "Failed to load appeals",
    );
    if (data) setAppeals(data.appeals ?? []);
  }, [communityId]);

  const loadRules = useCallback(async () => {
    if (!communityId) return;
    const data = await requestModerationJson(
      `/api/c/owner/moderation/rules?communityId=${encodeURIComponent(communityId)}`,
      "Failed to load auto-moderation rules",
    );
    if (data) setRules(data.rules ?? []);
  }, [communityId]);

  const loadMembers = useCallback(
    async (kind: "muted" | "suspended" | "banned") => {
      if (!communityId) return;
      const data = await requestModerationJson(
        `/api/c/owner/moderation/members?communityId=${encodeURIComponent(communityId)}&kind=${kind}`,
        `Failed to load ${kind} members`,
      );
      if (data) setMembers(data.members ?? []);
    },
    [communityId]
  );

  const loadAudit = useCallback(
    async (q = "") => {
      if (!communityId) return;
      const params = new URLSearchParams({ communityId, limit: "100" });
      if (q) params.set("q", q);
      const data = await requestModerationJson(
        `/api/c/owner/moderation/audit?${params}`,
        "Failed to load moderation audit log",
      );
      if (data) setAudit(data.entries ?? []);
    },
    [communityId]
  );

  const loadAnalytics = useCallback(async () => {
    if (!communityId) return;
    const data = await requestModerationJson(
      `/api/c/owner/moderation/analytics?communityId=${encodeURIComponent(communityId)}`,
      "Failed to load moderation analytics",
    );
    if (data) setAnalytics(data.analytics ?? null);
  }, [communityId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (queue === "appeals") void loadAppeals();
    if (queue === "automod") void loadRules();
    if (queue === "muted") void loadMembers("muted");
    if (queue === "suspended") void loadMembers("suspended");
    if (queue === "banned") void loadMembers("banned");
    if (queue === "audit") void loadAudit(auditSearch);
  }, [
    queue,
    loadAppeals,
    loadRules,
    loadMembers,
    loadAudit,
    auditSearch,
  ]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.reason.toLowerCase().includes(q) ||
        (r.details ?? "").toLowerCase().includes(q) ||
        (r.contentPreview ?? "").toLowerCase().includes(q) ||
        (r.reporterName ?? "").toLowerCase().includes(q) ||
        (r.reportedUserName ?? "").toLowerCase().includes(q)
    );
  }, [reports, search]);

  const openReport = useCallback(
    async (report: OwnerReportListItem) => {
      if (!communityId) return;
      const res = await fetch(
        `/api/c/owner/moderation/reports/${encodeURIComponent(report.id)}?communityId=${encodeURIComponent(communityId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load report");
        return;
      }
      setSelectedReport(data.report ?? report);
      setReportHistory(
        (data.history ?? []).map(
          (h: {
            id: string;
            action: string;
            reason: string | null;
            moderator_id: string;
            target_user_id: string;
            metadata: unknown;
            created_at: string;
          }) => ({
            id: h.id,
            action: h.action,
            reason: h.reason,
            moderatorId: h.moderator_id,
            moderatorName: null,
            targetUserId: h.target_user_id,
            targetName: null,
            metadata:
              h.metadata && typeof h.metadata === "object"
                ? (h.metadata as Record<string, unknown>)
                : {},
            createdAt: h.created_at,
          })
        )
      );
    },
    [communityId]
  );

  const runAction = useCallback(
    async (
      reportId: string,
      action: string,
      extra: Record<string, unknown> = {}
    ) => {
      if (!communityId) return;
      const res = await fetch(
        `/api/c/owner/moderation/reports/${encodeURIComponent(reportId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ communityId, action, ...extra }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(`Action: ${action.replace(/_/g, " ")}`);
      await loadQueue();
      if (selectedReport?.id === reportId) {
        const found = reports.find((r) => r.id === reportId);
        if (found) await openReport(found);
        else setSelectedReport(null);
      }
    },
    [communityId, loadQueue, openReport, reports, selectedReport]
  );

  const bulkAction = useCallback(
    async (action: string, ids?: string[]) => {
      if (!communityId) return;
      const reportIds = ids ?? selectedIds;
      if (reportIds.length === 0) return;
      const res = await fetch("/api/c/owner/moderation/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          reportIds,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bulk action failed");
        return;
      }
      if (action === "export") {
        const blob = new Blob([JSON.stringify(data.export ?? [], null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `moderation-export.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported");
        return;
      }
      toast.success(`Processed ${data.processed}`);
      setSelectedIds([]);
      await loadQueue();
    },
    [communityId, selectedIds, loadQueue]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const seedRules = useCallback(async () => {
    if (!communityId) return;
    const res = await fetch("/api/c/owner/moderation/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId, seedDefaults: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to seed rules");
      return;
    }
    setRules(data.rules ?? []);
    toast.success("Auto-moderation rules ready");
  }, [communityId]);

  const toggleRule = useCallback(
    async (ruleId: string, enabled: boolean) => {
      if (!communityId) return;
      const res = await fetch("/api/c/owner/moderation/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, ruleId, enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Update failed");
        return;
      }
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? (data.rule as OwnerAutoModRule) : r))
      );
    },
    [communityId]
  );

  const updateAppeal = useCallback(
    async (appealId: string, status: string, reviewerNote?: string) => {
      if (!communityId) return;
      const res = await fetch("/api/c/owner/moderation/appeals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          appealId,
          status,
          reviewerNote: reviewerNote ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Appeal update failed");
        return;
      }
      toast.success(`Appeal ${status.replace(/_/g, " ")}`);
      await loadAppeals();
    },
    [communityId, loadAppeals]
  );

  return {
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
    clearSelection: () => setSelectedIds([]),
    auditSearch,
    setAuditSearch,
    loadQueue,
    loadAnalytics,
    openReport,
    runAction,
    bulkAction,
    seedRules,
    toggleRule,
    updateAppeal,
  };
}
