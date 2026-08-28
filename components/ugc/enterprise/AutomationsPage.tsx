"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "@/components/ugc/workspace/UGCPageShell";
import {
  EnterpriseOutlineButton,
  EnterprisePrimaryButton,
  cardClass,
  fieldClass,
} from "./enterprise-ui";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";

type Automation = {
  id: string;
  name: string;
  trigger_event: string;
  actions?: unknown;
  is_enabled?: boolean;
  campaign_id?: string | null;
};

const TRIGGERS = [
  "submission.created",
  "submission.approved",
  "submission.rejected",
  "participant.accepted",
  "campaign.funded",
];

export function AutomationsPage() {
  const { ugcFetch } = useUgcBrandWorkspace();

  const [rows, setRows] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState(TRIGGERS[0]);
  const [actionLabel, setActionLabel] = useState("notify_brand");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/automations", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError("Brand account required for automations.");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load automations");
      setRows(json.data ?? json.automations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load automations");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    setBusy(true);
    try {
      const res = await ugcFetch("/api/ugc/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          trigger_event: trigger,
          actions: [{ type: actionLabel }],
          is_enabled: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success("Automation created");
      setName("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: Automation) => {
    setBusy(true);
    try {
      const res = await ugcFetch(`/api/ugc/automations/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !row.is_enabled }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this automation?")) return;
    setBusy(true);
    try {
      const res = await ugcFetch(`/api/ugc/automations/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UGCPageShell titleKey="automations" subtitleKey="automationsSubtitle">
      <div className={`${cardClass} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
        <label className="text-[12px] font-semibold text-[#374151]">
          Name
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-[#374151]">
          Trigger
          <select className={fieldClass} value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            {TRIGGERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-[12px] font-semibold text-[#374151]">
          Action
          <input className={fieldClass} value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} />
        </label>
        <div className="flex items-end">
          <EnterprisePrimaryButton onClick={() => void create()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </EnterprisePrimaryButton>
        </div>
      </div>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <UGCPageEmpty title="No automations" description="Create rules for submissions, funding, and approvals." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className={`${cardClass} flex flex-wrap items-center justify-between gap-3`}>
              <div>
                <p className="text-sm font-bold text-[#111827]">{row.name}</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">{row.trigger_event}</p>
                <div className="mt-2">
                  <UGCStatusPill status={row.is_enabled ? "active" : "paused"} />
                </div>
              </div>
              <div className="flex gap-2">
                <EnterpriseOutlineButton onClick={() => void toggle(row)} disabled={busy}>
                  {row.is_enabled ? "Disable" : "Enable"}
                </EnterpriseOutlineButton>
                <EnterpriseOutlineButton onClick={() => void remove(row.id)} disabled={busy}>
                  <Trash2 className="h-4 w-4" />
                </EnterpriseOutlineButton>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
