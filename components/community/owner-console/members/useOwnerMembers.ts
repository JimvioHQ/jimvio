"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  MemberFilterStatus,
  MemberSortOption,
  MemberViewMode,
  OwnerJoinRequest,
  OwnerMemberAnalytics,
  OwnerMemberDetail,
  OwnerMemberInvite,
  OwnerMemberListItem,
  OwnerMemberOverview,
} from "@/lib/community/owner-console/members";

const EMPTY_OVERVIEW: OwnerMemberOverview = {
  total: 0,
  online: 0,
  pending: 0,
  invited: 0,
  banned: 0,
  moderators: 0,
  admins: 0,
  creators: 0,
  growth7d: 0,
};

export function useOwnerMembers(communityId: string | null) {
  const [members, setMembers] = useState<OwnerMemberListItem[]>([]);
  const [overview, setOverview] = useState<OwnerMemberOverview>(EMPTY_OVERVIEW);
  const [invites, setInvites] = useState<OwnerMemberInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<OwnerJoinRequest[]>([]);
  const [analytics, setAnalytics] = useState<OwnerMemberAnalytics | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<OwnerMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberFilterStatus>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sort, setSort] = useState<MemberSortOption>("joined_desc");
  const [view, setView] = useState<MemberViewMode>("table");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelTab, setPanelTab] = useState<
    "members" | "requests" | "invites" | "analytics"
  >("members");

  const load = useCallback(async () => {
    if (!communityId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        communityId,
        status: filter === "staff" ? "all" : filter,
        role: filter === "staff" ? "staff" : roleFilter,
        limit: "100",
      });
      const res = await fetch(`/api/c/owner/members?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load members");
        setMembers([]);
        return;
      }
      setMembers(data.members ?? []);
      setOverview(data.overview ?? EMPTY_OVERVIEW);
    } catch {
      setError("Failed to load members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [communityId, filter, roleFilter]);

  // ... keep rest


  const loadInvites = useCallback(async () => {
    if (!communityId) return;
    const res = await fetch(
      `/api/c/owner/members/invites?communityId=${encodeURIComponent(communityId)}`
    );
    const data = await res.json();
    if (res.ok) setInvites(data.invites ?? []);
  }, [communityId]);

  const loadJoinRequests = useCallback(async () => {
    if (!communityId) return;
    const res = await fetch(
      `/api/c/owner/members/join-requests?communityId=${encodeURIComponent(communityId)}`
    );
    const data = await res.json();
    if (res.ok) setJoinRequests(data.requests ?? []);
  }, [communityId]);

  const loadAnalytics = useCallback(async () => {
    if (!communityId) return;
    const res = await fetch(
      `/api/c/owner/members/analytics?communityId=${encodeURIComponent(communityId)}`
    );
    const data = await res.json();
    if (res.ok) setAnalytics(data.analytics ?? null);
  }, [communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (panelTab === "invites") void loadInvites();
    if (panelTab === "requests") void loadJoinRequests();
    if (panelTab === "analytics") void loadAnalytics();
  }, [panelTab, loadInvites, loadJoinRequests, loadAnalytics]);

  const visible = useMemo(() => {
    let list = [...members];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          (m.username ?? "").toLowerCase().includes(q) ||
          (m.email ?? "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.displayName.localeCompare(b.displayName);
        case "joined_asc":
          return (a.joinedAt ?? "").localeCompare(b.joinedAt ?? "");
        case "last_active":
          return (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? "");
        case "contribution":
          return b.contributionScore - a.contributionScore;
        case "creator_score":
          return b.creatorScore - a.creatorScore;
        case "role":
          return String(a.role).localeCompare(String(b.role));
        default:
          return (b.joinedAt ?? "").localeCompare(a.joinedAt ?? "");
      }
    });
    return list;
  }, [members, sort, search]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const runAction = useCallback(
    async (
      membershipId: string,
      action: string,
      extra?: Record<string, unknown>
    ) => {
      if (!communityId) return;
      const res = await fetch(`/api/c/owner/members/${membershipId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success("Updated");
      if (data.deleted) {
        setSelectedMember(null);
      }
      await load();
    },
    [communityId, load]
  );

  const bulkAction = useCallback(
    async (action: string, extra?: Record<string, unknown>) => {
      if (!communityId || selectedIds.length === 0) return;
      const res = await fetch("/api/c/owner/members/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          membershipIds: selectedIds,
          action,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bulk action failed");
        return;
      }
      if (action === "export" && data.export) {
        const blob = new Blob([JSON.stringify(data.export, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `members-${communityId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported");
        return;
      }
      toast.success(`Updated ${data.processed ?? selectedIds.length} members`);
      clearSelection();
      await load();
    },
    [communityId, selectedIds, clearSelection, load]
  );

  const openMember = useCallback(
    async (membershipId: string) => {
      if (!communityId) return;
      const res = await fetch(
        `/api/c/owner/members/${membershipId}?communityId=${encodeURIComponent(communityId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load member");
        return;
      }
      setSelectedMember(data.member);
    },
    [communityId]
  );

  const createInvite = useCallback(
    async (input: {
      email?: string;
      role?: string;
      maxUses?: number | null;
      expiresInDays?: number;
      note?: string;
    }) => {
      if (!communityId) return null;
      const res = await fetch("/api/c/owner/members/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, ...input }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Invite failed");
        return null;
      }
      toast.success("Invite created");
      await loadInvites();
      await load();
      return data.invite as OwnerMemberInvite;
    },
    [communityId, loadInvites, load]
  );

  const reviewJoinRequests = useCallback(
    async (requestIds: string[], action: "approve" | "reject") => {
      if (!communityId) return;
      const res = await fetch("/api/c/owner/members/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, requestIds, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Request review failed");
        return;
      }
      toast.success(`${action === "approve" ? "Approved" : "Rejected"} ${data.processed}`);
      await loadJoinRequests();
      await load();
    },
    [communityId, loadJoinRequests, load]
  );

  return {
    members: visible,
    overview,
    invites,
    joinRequests,
    analytics,
    selectedMember,
    setSelectedMember,
    loading,
    error,
    search,
    setSearch,
    filter,
    setFilter,
    roleFilter,
    setRoleFilter,
    sort,
    setSort,
    view,
    setView,
    selectedIds,
    toggleSelect,
    clearSelection,
    panelTab,
    setPanelTab,
    load,
    runAction,
    bulkAction,
    openMember,
    createInvite,
    reviewJoinRequests,
    loadInvites,
  };
}
