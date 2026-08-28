"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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

type Contract = {
  id: string;
  title: string;
  body: string;
  status: string;
  version?: number;
  campaign_id?: string | null;
  created_at?: string;
};

export function ContractsPage() {
  const { ugcFetch } = useUgcBrandWorkspace();

  const [rows, setRows] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/contracts", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError("Brand account required for contracts.");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load contracts");
      setRows(json.data ?? json.contracts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body required");
      return;
    }
    setBusy(true);
    try {
      const res = await ugcFetch("/api/ugc/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success("Contract created");
      setTitle("");
      setBody("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, action: "send" | "accept" | "decline" | "void") => {
    setBusy(true);
    try {
      const res = await ugcFetch(`/api/ugc/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      toast.success(`Contract ${action}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UGCPageShell titleKey="contracts" subtitleKey="contractsSubtitle">
      <div className={`${cardClass} space-y-3`}>
        <label className="block text-[12px] font-semibold text-[#374151]">
          Title
          <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-[12px] font-semibold text-[#374151]">
          Body
          <textarea className={`${fieldClass} min-h-[120px]`} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <EnterprisePrimaryButton onClick={() => void create()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create contract
        </EnterprisePrimaryButton>
      </div>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <UGCPageEmpty title="No contracts" description="Create a draft agreement to send to creators." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className={`${cardClass} space-y-3`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#111827]">{c.title}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[#6B7280]">{c.body}</p>
                </div>
                <UGCStatusPill status={c.status} />
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status === "draft" || c.status === "declined" ? (
                  <EnterpriseOutlineButton onClick={() => void patch(c.id, "send")} disabled={busy}>
                    Send
                  </EnterpriseOutlineButton>
                ) : null}
                {c.status === "sent" ? (
                  <>
                    <EnterpriseOutlineButton onClick={() => void patch(c.id, "accept")} disabled={busy}>
                      Accept
                    </EnterpriseOutlineButton>
                    <EnterpriseOutlineButton onClick={() => void patch(c.id, "decline")} disabled={busy}>
                      Decline
                    </EnterpriseOutlineButton>
                  </>
                ) : null}
                {c.status !== "void" ? (
                  <EnterpriseOutlineButton onClick={() => void patch(c.id, "void")} disabled={busy}>
                    Void
                  </EnterpriseOutlineButton>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
