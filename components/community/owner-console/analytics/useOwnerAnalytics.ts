"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  AnalyticsExportFormat,
  AnalyticsRangeId,
  AnalyticsSectionId,
  OwnerAnalyticsBundle,
} from "@/lib/community/owner-console/analytics";

export function useOwnerAnalytics(communityId: string | null) {
  const [analytics, setAnalytics] = useState<OwnerAnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<AnalyticsSectionId>("overview");
  const [range, setRange] = useState<AnalyticsRangeId>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [groupId, setGroupId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [role, setRole] = useState("");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    if (!communityId) {
      setAnalytics(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ communityId, range });
      if (range === "custom") {
        if (customStart) params.set("start", customStart);
        if (customEnd) params.set("end", customEnd);
      }
      if (groupId) params.set("groupId", groupId);
      if (channelId) params.set("channelId", channelId);
      if (role) params.set("role", role);
      const res = await fetch(`/api/c/owner/analytics?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load analytics");
        setAnalytics(null);
        return;
      }
      setAnalytics(data.analytics ?? null);
    } catch {
      setError("Failed to load analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [communityId, range, customStart, customEnd, groupId, channelId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!communityId) return;
    void (async () => {
      try {
        const [gRes, cRes] = await Promise.all([
          fetch(
            `/api/c/owner/groups?communityId=${encodeURIComponent(communityId)}&limit=100`
          ),
          fetch(
            `/api/c/owner/channels?communityId=${encodeURIComponent(communityId)}&limit=100`
          ),
        ]);
        if (gRes.ok) {
          const g = await gRes.json();
          setGroups(
            (g.groups ?? []).map((x: { id: string; name: string }) => ({
              id: x.id,
              name: x.name,
            }))
          );
        }
        if (cRes.ok) {
          const c = await cRes.json();
          setChannels(
            (c.channels ?? []).map((x: { id: string; name: string }) => ({
              id: x.id,
              name: x.name,
            }))
          );
        }
      } catch {
        // optional filters
      }
    })();
  }, [communityId]);

  const exportReport = useCallback(
    async (format: AnalyticsExportFormat) => {
      if (!communityId) return;
      const params = new URLSearchParams({
        communityId,
        range,
        format,
      });
      if (range === "custom") {
        if (customStart) params.set("start", customStart);
        if (customEnd) params.set("end", customEnd);
      }
      if (groupId) params.set("groupId", groupId);
      if (channelId) params.set("channelId", channelId);
      if (role) params.set("role", role);

      const res = await fetch(`/api/c/owner/analytics/export?${params}`);
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Export failed");
          return;
        }
        toast.message(data.message || "Export not available");
        return;
      }
      if (!res.ok) {
        toast.error("Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "xlsx"
          ? "community-analytics.xlsx"
          : "community-analytics.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready");
    },
    [communityId, range, customStart, customEnd, groupId, channelId, role]
  );

  return {
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
    role,
    setRole,
    groups,
    channels,
    load,
    exportReport,
  };
}
