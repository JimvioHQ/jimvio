"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "@/components/ugc/workspace/UGCPageShell";
import {
  EnterpriseOutlineButton,
  EnterprisePrimaryButton,
  MetricCard,
  cardClass,
  fieldClass,
} from "./enterprise-ui";

type CrmList = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  members?: { count: number }[] | null;
};

type Overview = {
  favorites?: unknown[];
  lists?: CrmList[];
  inviteHistory?: { total?: number };
  counts?: { favorites?: number; lists?: number; invites?: number };
};

export function CreatorCrmPage() {
  const [lists, setLists] = useState<CrmList[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, ovRes] = await Promise.all([
        fetch("/api/ugc/crm/lists", { cache: "no-store" }),
        fetch("/api/ugc/crm/overview", { cache: "no-store" }),
      ]);
      const listJson = await listRes.json().catch(() => ({}));
      const ovJson = await ovRes.json().catch(() => ({}));
      if (listRes.status === 403 || ovRes.status === 403) {
        setError("Brand account required for Creator CRM.");
        return;
      }
      if (!listRes.ok) throw new Error(listJson.error ?? "Failed to load lists");
      setLists(listJson.data ?? []);
      if (ovRes.ok) setOverview(ovJson as Overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load CRM");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createList = async () => {
    if (!name.trim()) {
      toast.error("List name required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ugc/crm/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success("List created");
      setName("");
      setDescription("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const removeList = async (id: string) => {
    if (!confirm("Delete this list?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ugc/crm/lists/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast.success("List deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const favoritesCount = overview?.counts?.favorites ?? overview?.favorites?.length ?? 0;
  const inviteCount = overview?.counts?.invites ?? overview?.inviteHistory?.total ?? 0;

  return (
    <UGCPageShell
      title="Creator CRM"
      subtitle="Organize favorite creators into lists and track outreach."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Favorites" value={favoritesCount} />
        <MetricCard label="Lists" value={overview?.counts?.lists ?? lists.length} />
        <MetricCard label="Invites" value={inviteCount} />
      </div>

      <div className={`${cardClass} grid gap-3 sm:grid-cols-[1fr_1fr_auto]`}>
        <label className="text-[12px] font-semibold text-[#374151]">
          List name
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-[#374151]">
          Description
          <input className={fieldClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="flex items-end">
          <EnterprisePrimaryButton onClick={() => void createList()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create list
          </EnterprisePrimaryButton>
        </div>
      </div>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && lists.length === 0 ? (
        <UGCPageEmpty title="No CRM lists" description="Create a list to segment creators for recruitment." />
      ) : null}

      {!loading && !error && lists.length > 0 ? (
        <div className="space-y-2">
          {lists.map((list) => (
            <div key={list.id} className={`${cardClass} flex items-center justify-between gap-3`}>
              <div>
                <p className="text-sm font-bold text-[#111827]">{list.name}</p>
                {list.description ? (
                  <p className="mt-1 text-[12px] text-[#6B7280]">{list.description}</p>
                ) : null}
                <p className="mt-1 text-[11px] font-semibold text-[#9CA3AF]">
                  {list.members?.[0]?.count ?? 0} members
                </p>
              </div>
              <EnterpriseOutlineButton onClick={() => void removeList(list.id)} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                Delete
              </EnterpriseOutlineButton>
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
