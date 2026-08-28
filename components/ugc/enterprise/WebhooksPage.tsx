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

type Webhook = {
  id: string;
  url: string;
  events?: string[];
  is_active?: boolean;
  secret?: string;
  created_at?: string;
};

type Delivery = {
  id: string;
  event_type: string;
  status: string;
  response_code?: number | null;
  created_at?: string;
};

const DEFAULT_EVENTS = [
  "campaign.created",
  "submission.approved",
  "submission.rejected",
  "payout.released",
];

export function WebhooksPage() {
  const { ugcFetch } = useUgcBrandWorkspace();

  const [rows, setRows] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState(DEFAULT_EVENTS.join(", "));
  const [busy, setBusy] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/webhooks", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError("Brand account required for webhooks.");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load webhooks");
      setRows(json.data ?? json.webhooks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!url.trim()) {
      toast.error("URL required");
      return;
    }
    setBusy(true);
    try {
      const res = await ugcFetch("/api/ugc/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          events: events
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      const secret = json.subscription?.secret ?? json.webhook?.secret ?? json.secret;
      if (secret) {
        toast.success(`Webhook created. Secret: ${secret}`);
      } else {
        toast.success("Webhook created");
      }
      setUrl("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete webhook?")) return;
    setBusy(true);
    try {
      const res = await ugcFetch(`/api/ugc/webhooks/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast.success("Deleted");
      if (activeId === id) {
        setActiveId(null);
        setDeliveries([]);
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const loadDeliveries = async (id: string) => {
    setActiveId(id);
    try {
      const res = await ugcFetch(`/api/ugc/webhooks/${id}/deliveries`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load deliveries");
      setDeliveries(json.data ?? json.deliveries ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load deliveries");
    }
  };

  return (
    <UGCPageShell titleKey="webhooks" subtitleKey="webhooksSubtitle">
      <div className={`${cardClass} space-y-3`}>
        <label className="block text-[12px] font-semibold text-[#374151]">
          Endpoint URL
          <input
            className={fieldClass}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhooks/jimvio"
          />
        </label>
        <label className="block text-[12px] font-semibold text-[#374151]">
          Events (comma-separated)
          <input className={fieldClass} value={events} onChange={(e) => setEvents(e.target.value)} />
        </label>
        <EnterprisePrimaryButton onClick={() => void create()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add webhook
        </EnterprisePrimaryButton>
      </div>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <UGCPageEmpty title="No webhooks" description="Add an HTTPS endpoint to receive platform events." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {rows.map((w) => (
              <div key={w.id} className={cardClass}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#111827]">{w.url}</p>
                    <p className="mt-1 text-[11px] text-[#6B7280]">
                      {(w.events ?? []).join(", ") || "No events"}
                    </p>
                    <div className="mt-2">
                      <UGCStatusPill status={w.is_active === false ? "paused" : "active"} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <EnterpriseOutlineButton onClick={() => void loadDeliveries(w.id)}>
                    Deliveries
                  </EnterpriseOutlineButton>
                  <EnterpriseOutlineButton onClick={() => void remove(w.id)} disabled={busy}>
                    <Trash2 className="h-4 w-4" />
                  </EnterpriseOutlineButton>
                </div>
              </div>
            ))}
          </div>
          <div className={cardClass}>
            <h2 className="text-sm font-bold text-[#111827]">
              {activeId ? "Recent deliveries" : "Select a webhook"}
            </h2>
            {activeId ? (
              deliveries.length === 0 ? (
                <p className="mt-2 text-[13px] text-[#6B7280]">No deliveries yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {deliveries.map((d) => (
                    <div key={d.id} className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-[#111827]">{d.event_type}</p>
                        <UGCStatusPill status={d.status} />
                      </div>
                      <p className="mt-1 text-[11px] text-[#6B7280]">
                        HTTP {d.response_code ?? "—"}
                        {d.created_at ? ` · ${new Date(d.created_at).toLocaleString()}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="mt-2 text-[13px] text-[#6B7280]">Open deliveries to inspect webhook attempts.</p>
            )}
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
