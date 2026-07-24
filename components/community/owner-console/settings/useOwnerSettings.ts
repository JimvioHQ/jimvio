"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  OwnerCommunitySettings,
  SettingsSectionId,
  UpdateOwnerSettingsInput,
} from "@/lib/community/owner-console/settings";

export function useOwnerSettings(communityId: string | null) {
  const [settings, setSettings] = useState<OwnerCommunitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SettingsSectionId>("general");

  const load = useCallback(async () => {
    if (!communityId) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/c/owner/settings?communityId=${encodeURIComponent(communityId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load settings");
        setSettings(null);
        return;
      }
      setSettings(data.settings ?? null);
    } catch {
      setError("Failed to load settings");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (patch: Omit<UpdateOwnerSettingsInput, "communityId">) => {
      if (!communityId) return null;
      setSaving(true);
      try {
        const res = await fetch("/api/c/owner/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...patch, communityId, section }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Save failed");
          return null;
        }
        setSettings(data.settings);
        toast.success("Settings saved");
        return data.settings as OwnerCommunitySettings;
      } catch {
        toast.error("Save failed");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [communityId, section]
  );

  const danger = useCallback(
    async (action: string, confirmSlug?: string) => {
      if (!communityId) return null;
      setSaving(true);
      try {
        const res = await fetch("/api/c/owner/settings/danger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ communityId, action, confirmSlug }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Action failed");
          return null;
        }
        if (data.message) {
          toast.message(data.message);
          return null;
        }
        if (data.settings) setSettings(data.settings);
        toast.success(
          action === "delete"
            ? "Community deleted"
            : action === "restore"
              ? "Community restored"
              : "Community archived"
        );
        return data;
      } catch {
        toast.error("Action failed");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [communityId]
  );

  const exportData = useCallback(async () => {
    if (!communityId) return;
    const res = await fetch(
      `/api/c/owner/settings/export?communityId=${encodeURIComponent(communityId)}`
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
    a.download = `community-settings-${communityId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Community data exported");
  }, [communityId]);

  return {
    settings,
    loading,
    saving,
    error,
    section,
    setSection,
    load,
    save,
    danger,
    exportData,
  };
}
