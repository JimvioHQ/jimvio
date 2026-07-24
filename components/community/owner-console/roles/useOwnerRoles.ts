"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  OwnerRoleAnalytics,
  OwnerRoleAuditEntry,
  OwnerRoleListItem,
  OwnerRoleMember,
  OwnerRoleTemplate,
  RoleEditorTab,
  UpdateOwnerRoleInput,
} from "@/lib/community/owner-console/roles";

export function useOwnerRoles(communityId: string | null) {
  const [roles, setRoles] = useState<OwnerRoleListItem[]>([]);
  const [templates, setTemplates] = useState<OwnerRoleTemplate[]>([]);
  const [selectedRole, setSelectedRole] = useState<OwnerRoleListItem | null>(
    null
  );
  const [roleMembers, setRoleMembers] = useState<OwnerRoleMember[]>([]);
  const [analytics, setAnalytics] = useState<OwnerRoleAnalytics | null>(null);
  const [audit, setAudit] = useState<OwnerRoleAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [panelTab, setPanelTab] = useState<
    "roles" | "templates" | "analytics" | "audit"
  >("roles");
  const [editorTab, setEditorTab] = useState<RoleEditorTab>("overview");
  const [includeArchived, setIncludeArchived] = useState(false);

  const load = useCallback(async () => {
    if (!communityId) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ communityId });
      if (includeArchived) params.set("includeArchived", "1");
      const res = await fetch(`/api/c/owner/roles?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load roles");
        setRoles([]);
        return;
      }
      setRoles(data.roles ?? []);
      setTemplates(data.templates ?? []);
    } catch {
      setError("Failed to load roles");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [communityId, includeArchived]);

  const loadRoleDetail = useCallback(
    async (roleId: string) => {
      if (!communityId) return;
      const params = new URLSearchParams({ communityId });
      const res = await fetch(
        `/api/c/owner/roles/${encodeURIComponent(roleId)}?${params.toString()}`
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load role");
        return;
      }
      setSelectedRole(data.role ?? null);
      setRoleMembers(data.members ?? []);
    },
    [communityId]
  );

  const loadAnalytics = useCallback(async () => {
    if (!communityId) return;
    const res = await fetch(
      `/api/c/owner/roles/analytics?communityId=${encodeURIComponent(communityId)}`
    );
    const data = await res.json();
    if (res.ok) setAnalytics(data.analytics ?? null);
  }, [communityId]);

  const loadAudit = useCallback(
    async (q = "", roleId?: string) => {
      if (!communityId) return;
      const params = new URLSearchParams({ communityId, limit: "80" });
      if (q) params.set("q", q);
      if (roleId) params.set("roleId", roleId);
      const res = await fetch(`/api/c/owner/roles/audit?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setAudit(data.entries ?? []);
    },
    [communityId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (panelTab === "analytics") void loadAnalytics();
    if (panelTab === "audit") void loadAudit();
  }, [panelTab, loadAnalytics, loadAudit]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        r.capabilities.some((c) => c.includes(q))
    );
  }, [roles, search]);

  const openRole = useCallback(
    async (role: OwnerRoleListItem) => {
      setEditorTab("overview");
      await loadRoleDetail(role.id);
    },
    [loadRoleDetail]
  );

  const createRole = useCallback(
    async (input: Record<string, unknown>) => {
      if (!communityId) return null;
      const res = await fetch("/api/c/owner/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, communityId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create role");
        return null;
      }
      toast.success("Role created");
      await load();
      return data.role as OwnerRoleListItem;
    },
    [communityId, load]
  );

  const updateRole = useCallback(
    async (roleId: string, patch: UpdateOwnerRoleInput) => {
      if (!communityId) return null;
      const res = await fetch(`/api/c/owner/roles/${encodeURIComponent(roleId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, communityId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update role");
        return null;
      }
      toast.success("Role updated");
      setSelectedRole(data.role);
      await load();
      return data.role as OwnerRoleListItem;
    },
    [communityId, load]
  );

  const runAction = useCallback(
    async (roleId: string, action: string) => {
      if (!communityId) return;
      const res = await fetch(
        `/api/c/owner/roles/${encodeURIComponent(roleId)}/actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ communityId, action }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(
        action === "duplicate" ? "Role duplicated" : `Role ${action}d`
      );
      await load();
      if (action === "duplicate" && data.role) {
        setSelectedRole(data.role);
      }
      if (action === "archive" || action === "delete") {
        setSelectedRole(null);
      }
    },
    [communityId, load]
  );

  const deleteRole = useCallback(
    async (roleId: string) => {
      if (!communityId) return;
      const params = new URLSearchParams({ communityId });
      const res = await fetch(
        `/api/c/owner/roles/${encodeURIComponent(roleId)}?${params.toString()}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Delete failed");
        return;
      }
      toast.success("Role deleted");
      setSelectedRole(null);
      await load();
    },
    [communityId, load]
  );

  const assignMembers = useCallback(
    async (
      roleId: string,
      membershipIds: string[],
      action: "assign" | "remove" = "assign",
      scheduledAt?: string | null
    ) => {
      if (!communityId) return;
      const res = await fetch("/api/c/owner/roles/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          roleId,
          membershipIds,
          action,
          scheduledAt: scheduledAt ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Assignment failed");
        return;
      }
      if (data.scheduled && !data.accepted) {
        toast.message("Scheduled assignment is future-ready");
        return;
      }
      toast.success(
        `${action === "assign" ? "Assigned" : "Removed"} ${data.processed} member(s)`
      );
      await loadRoleDetail(roleId);
      await load();
    },
    [communityId, load, loadRoleDetail]
  );

  const exportRoles = useCallback(async () => {
    if (!communityId) return;
    const res = await fetch(
      `/api/c/owner/roles/export?communityId=${encodeURIComponent(communityId)}`
    );
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Export failed");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jimvio-roles-${communityId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Roles exported");
  }, [communityId]);

  const importRoles = useCallback(
    async (payload: { roles: unknown[] }) => {
      if (!communityId) return;
      const res = await fetch("/api/c/owner/roles/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, roles: payload.roles }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Import failed");
        return;
      }
      toast.success(`Imported ${data.created} role(s)`);
      if (data.errors?.length) {
        toast.message(`${data.errors.length} skipped`);
      }
      await load();
    },
    [communityId, load]
  );

  return {
    roles,
    filteredRoles,
    templates,
    selectedRole,
    setSelectedRole,
    roleMembers,
    analytics,
    audit,
    loading,
    error,
    search,
    setSearch,
    panelTab,
    setPanelTab,
    editorTab,
    setEditorTab,
    includeArchived,
    setIncludeArchived,
    load,
    openRole,
    createRole,
    updateRole,
    runAction,
    deleteRole,
    assignMembers,
    exportRoles,
    importRoles,
    loadAudit,
  };
}
